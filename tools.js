const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');
const { spawn } = require('child_process');

const MAVEN_VERSION = '3.9.9';
const UA = { 'User-Agent': 'plugin-maker-build-tools' };

let baseDir = null;
function setBaseDir(dir) { baseDir = dir; }
const toolsDir = () => { const d = path.join(baseDir, 'tools'); fs.mkdirSync(d, { recursive: true }); return d; };

const isWin = process.platform === 'win32';
const osName = () => (isWin ? 'windows' : process.platform === 'darwin' ? 'mac' : 'linux');
const archName = () => (process.arch === 'arm64' ? 'aarch64' : 'x64');

const jdkMajorFor = (need) => (need <= 21 ? 21 : 25);

function run(cmd, args, opts, onLine) {
  return new Promise((resolve) => {
    let p;
    try { p = spawn(cmd, args, Object.assign({ windowsHide: true }, opts)); } catch (e) { resolve({ code: -1, out: '' }); return; }
    let out = '';
    const feed = (b) => {
      const s = String(b);
      out += s;
      if (onLine) s.split(/\r?\n/).forEach((l) => l && onLine(l));
    };
    p.stdout.on('data', feed);
    p.stderr.on('data', feed);
    p.on('error', () => resolve({ code: -1, out }));
    p.on('close', (code) => resolve({ code, out }));
  });
}

function getText(url, redirects = 5) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: UA }, (res) => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location && redirects > 0) {
        res.resume();
        resolve(getText(new URL(res.headers.location, url).toString(), redirects - 1));
        return;
      }
      if (res.statusCode !== 200) { res.resume(); reject(new Error('서버 응답 ' + res.statusCode + ' (' + url + ')')); return; }
      let data = '';
      res.setEncoding('utf8');
      res.on('data', (c) => { data += c; });
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function download(url, dest, algo, label, log, redirects = 5) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: UA }, (res) => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location && redirects > 0) {
        res.resume();
        resolve(download(new URL(res.headers.location, url).toString(), dest, algo, label, log, redirects - 1));
        return;
      }
      if (res.statusCode !== 200) { res.resume(); reject(new Error(label + ' 받기 실패 (서버 응답 ' + res.statusCode + ')')); return; }
      const total = Number(res.headers['content-length']) || 0;
      const hash = crypto.createHash(algo);
      const file = fs.createWriteStream(dest);
      let got = 0;
      let lastPct = -5;
      res.on('data', (c) => {
        got += c.length;
        hash.update(c);
        if (total) {
          const pct = Math.floor((got / total) * 100);
          if (pct >= lastPct + 5) {
            lastPct = pct;
            log(' ' + label + ' 받는 중... ' + pct + '% (' + Math.round(got / 1048576) + ' / ' + Math.round(total / 1048576) + 'MB)');
          }
        }
      });
      res.pipe(file);
      file.on('finish', () => file.close(() => resolve(hash.digest('hex'))));
      res.on('error', reject);
      file.on('error', reject);
    }).on('error', reject);
  });
}

async function extract(archive, destDir) {
  fs.mkdirSync(destDir, { recursive: true });
  const tar = isWin ? path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'tar.exe') : 'tar';
  const r = await run(tar, ['-xf', archive, '-C', destDir]);
  if (r.code !== 0) throw new Error('압축을 풀지 못했습니다: ' + r.out.slice(0, 300));
}

function findHome(dir, exe, depth = 4) {
  if (fs.existsSync(path.join(dir, 'bin', exe))) return dir;
  if (depth <= 0) return null;
  for (const name of fs.readdirSync(dir)) {
    const sub = path.join(dir, name);
    if (fs.statSync(sub).isDirectory()) {
      const found = findHome(sub, exe, depth - 1);
      if (found) return found;
    }
  }
  return null;
}

const exe = (n) => (isWin ? n + '.exe' : n);
function readMarker(dir) {
  try { return JSON.parse(fs.readFileSync(path.join(dir, 'ready.json'), 'utf8')); } catch (e) { return null; }
}

async function systemTools() {
  if (process.env.PM_FORCE_PORTABLE === '1') return { javacMajor: 0, mvn: false };
  const [javac, mvn] = await Promise.all([
    run('javac', ['-version'], { shell: isWin }),
    run('mvn', ['-v'], { shell: isWin })
  ]);
  const m = /javac\s+(?:1\.)?(\d+)/.exec(javac.out);
  return { javacMajor: javac.code === 0 && m ? Number(m[1]) : 0, mvn: mvn.code === 0 };
}

function portable(major) {
  const jdkDir = path.join(toolsDir(), 'jdk-' + major);
  const mvnDir = path.join(toolsDir(), 'maven-' + MAVEN_VERSION);
  const jdk = readMarker(jdkDir);
  const mvn = readMarker(mvnDir);
  return {
    jdkHome: jdk && fs.existsSync(path.join(jdk.home, 'bin', exe('javac'))) ? jdk.home : null,
    mavenHome: mvn && fs.existsSync(path.join(mvn.home, 'bin', 'm2.conf')) ? mvn.home : null
  };
}

async function status(needJava) {
  const sys = await systemTools();
  if (sys.mvn && sys.javacMajor >= Math.max(9, needJava)) return { ready: true, system: true };
  const major = jdkMajorFor(needJava);
  const p = portable(major);
  return { ready: !!(p.jdkHome && p.mavenHome), system: false, needJdk: !p.jdkHome, needMaven: !p.mavenHome, jdkMajor: major };
}

async function installJdk(major, log) {
  const api = 'https://api.adoptium.net/v3/assets/latest/' + major + '/hotspot?architecture=' + archName() +
    '&image_type=jdk&os=' + osName() + '&vendor=eclipse';
  log(' 자바(JDK ' + major + ') 정보를 확인하는 중...');
  const list = JSON.parse(await getText(api));
  const pkg = list && list[0] && list[0].binary && list[0].binary.package;
  if (!pkg || !pkg.link || !pkg.checksum) throw new Error('받을 자바를 찾지 못했습니다 (이 컴퓨터 종류: ' + osName() + ' ' + archName() + ')');
  const dl = path.join(toolsDir(), 'downloads');
  fs.mkdirSync(dl, { recursive: true });
  const archive = path.join(dl, pkg.name);
  const sum = await download(pkg.link, archive + '.part', 'sha256', '자바', log);
  if (sum.toLowerCase() !== String(pkg.checksum).toLowerCase()) { fs.rmSync(archive + '.part', { force: true }); throw new Error('받은 자바 파일이 깨졌습니다. 다시 시도해 주세요.'); }
  fs.renameSync(archive + '.part', archive);
  log(' 자바 압축 푸는 중...');
  const dir = path.join(toolsDir(), 'jdk-' + major);
  fs.rmSync(dir, { recursive: true, force: true });
  await extract(archive, dir);
  const home = findHome(dir, exe('javac'));
  if (!home) throw new Error('받은 자바에서 javac 를 찾지 못했습니다');
  fs.writeFileSync(path.join(dir, 'ready.json'), JSON.stringify({ home, release: list[0].release_name }));
  fs.rmSync(archive, { force: true });
  log(' 자바 준비 완료 (' + list[0].release_name + ')');
  return home;
}

async function installMaven(log) {
  const ext = isWin ? 'zip' : 'tar.gz';
  const name = 'apache-maven-' + MAVEN_VERSION + '-bin.' + ext;
  const url = 'https://archive.apache.org/dist/maven/maven-3/' + MAVEN_VERSION + '/binaries/' + name;
  const expected = (await getText(url + '.sha512')).trim().split(/\s+/)[0].toLowerCase();
  const dl = path.join(toolsDir(), 'downloads');
  fs.mkdirSync(dl, { recursive: true });
  const archive = path.join(dl, name);
  const sum = await download(url, archive + '.part', 'sha512', 'Maven', log);
  if (sum.toLowerCase() !== expected) { fs.rmSync(archive + '.part', { force: true }); throw new Error('받은 Maven 파일이 깨졌습니다. 다시 시도해 주세요.'); }
  fs.renameSync(archive + '.part', archive);
  const dir = path.join(toolsDir(), 'maven-' + MAVEN_VERSION);
  fs.rmSync(dir, { recursive: true, force: true });
  await extract(archive, dir);
  const home = findHome(dir, 'm2.conf') ? findHome(dir, 'm2.conf') : null;
  if (!home) throw new Error('받은 Maven 에서 실행 파일을 찾지 못했습니다');
  fs.writeFileSync(path.join(dir, 'ready.json'), JSON.stringify({ home, version: MAVEN_VERSION }));
  fs.rmSync(archive, { force: true });
  log(' Maven 준비 완료 (' + MAVEN_VERSION + ')');
  return home;
}

async function ensure(needJava, log) {
  const sys = await systemTools();
  if (sys.mvn && sys.javacMajor >= Math.max(9, needJava)) return { system: true };
  const major = jdkMajorFor(needJava);
  const p = portable(major);
  if (!p.jdkHome || !p.mavenHome) log(' 처음 한 번만 빌드 도구를 받습니다. 다음부터는 바로 만들어집니다.');
  const jdkHome = p.jdkHome || await installJdk(major, log);
  const mavenHome = p.mavenHome || await installMaven(log);
  return { system: false, jdkHome, mavenHome };
}

async function runMaven(t, args, cwd, onLine) {
  if (t.system) return (await run('mvn', args, { cwd, shell: isWin }, onLine)).code;
  const boot = path.join(t.mavenHome, 'boot');
  const cw = fs.readdirSync(boot).find((f) => /^plexus-classworlds-.*\.jar$/.test(f));
  if (!cw) { onLine && onLine('[ERROR] Maven 파일이 이상합니다. tools 폴더를 지우고 다시 해주세요.'); return -1; }
  const java = path.join(t.jdkHome, 'bin', exe('java'));
  const env = Object.assign({}, process.env, { JAVA_HOME: t.jdkHome, MAVEN_HOME: t.mavenHome });
  const r = await run(java, [
    '-classpath', path.join(boot, cw),
    '-Dclassworlds.conf=' + path.join(t.mavenHome, 'bin', 'm2.conf'),
    '-Dmaven.home=' + t.mavenHome,
    '-Dlibrary.jansi.path=' + path.join(t.mavenHome, 'lib', 'jansi-native'),
    '-Dmaven.multiModuleProjectDirectory=' + cwd,
    'org.codehaus.plexus.classworlds.launcher.Launcher'
  ].concat(args), { cwd, env }, onLine);
  return r.code;
}

module.exports = { setBaseDir, status, ensure, runMaven, jdkMajorFor };
