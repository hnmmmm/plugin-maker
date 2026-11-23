const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const builder = require('./builder');
const tools = require('./tools');
const mcassets = require('./mcassets');

let mainWin = null;

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWin) { if (mainWin.isMinimized()) mainWin.restore(); mainWin.focus(); }
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1320,
    height: 840,
    minWidth: 960,
    minHeight: 620,
    title: '마인크래프트 플러그인 메이커',
    backgroundColor: '#080808',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false
    }
  });
  mainWin = win;
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => { if (url !== win.webContents.getURL()) e.preventDefault(); });
  win.loadFile(path.join(__dirname, 'index.html'));
}

function baseDir() { return path.join(app.getPath('documents'), 'PluginMaker'); }
function projectsDir() {
  const d = path.join(baseDir(), 'projects');
  fs.mkdirSync(d, { recursive: true });
  return d;
}
const okId = (id) => typeof id === 'string' && /^[A-Za-z0-9_-]{1,60}$/.test(id);

ipcMain.handle('projects:list', async () => {
  try {
    const dir = projectsDir();
    const files = (await fs.promises.readdir(dir)).filter((f) => f.endsWith('.pmproj'));
    const rows = await Promise.all(files.map(async (f) => {
      try {
        const full = path.join(dir, f);
        const [text, st] = await Promise.all([fs.promises.readFile(full, 'utf8'), fs.promises.stat(full)]);
        const p = JSON.parse(text);
        let lines = 0;
        for (const l of String(p.code || '').split('\n')) if (l) lines++;
        return { id: p.id, name: p.name, mcVersion: p.mcVersion, platform: p.platform, lines, savedAt: st.mtimeMs };
      } catch (e) { return null; }
    }));
    const list = rows.filter(Boolean).sort((a, b) => b.savedAt - a.savedAt);
    return { ok: true, list };
  } catch (err) { return { ok: false, error: String(err.message || err), list: [] }; }
});

ipcMain.handle('projects:load', async (e, id) => {
  if (!okId(id)) return { ok: false, error: '잘못된 프로젝트입니다' };
  try {
    const file = path.join(projectsDir(), id + '.pmproj');
    try {
      return { ok: true, project: JSON.parse(fs.readFileSync(file, 'utf8')) };
    } catch (broken) {
      if (!fs.existsSync(file + '.bak')) throw broken;
      return { ok: true, project: JSON.parse(fs.readFileSync(file + '.bak', 'utf8')), restored: true };
    }
  } catch (err) { return { ok: false, error: String(err.message || err) }; }
});

ipcMain.handle('projects:save', async (e, p) => {
  if (!p || !okId(p.id)) return { ok: false, error: '잘못된 프로젝트입니다' };
  try {
    const data = {
      format: 2, id: p.id, name: String(p.name || '내 플러그인').slice(0, 40),
      mcVersion: String(p.mcVersion || ''), platform: p.platform === 'spigot' ? 'spigot' : 'paper',
      pluginName: String(p.pluginName || ''), code: String(p.code || ''),
      workspace: p.workspace && typeof p.workspace === 'object' ? p.workspace : null,
      pack: p.pack && typeof p.pack === 'object' ? p.pack : null
    };
    const file = path.join(projectsDir(), p.id + '.pmproj');
    const tmp = file + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
    if (fs.existsSync(file)) { try { fs.copyFileSync(file, file + '.bak'); } catch (e2) {  } }
    fs.renameSync(tmp, file);
    return { ok: true };
  } catch (err) { return { ok: false, error: String(err.message || err) }; }
});

ipcMain.handle('projects:delete', async (e, id) => {
  if (!okId(id)) return { ok: false };
  try { fs.unlinkSync(path.join(projectsDir(), id + '.pmproj')); return { ok: true }; }
  catch (err) { return { ok: false, error: String(err.message || err) }; }
});

ipcMain.handle('export:env', async (e, mcVersion) => tools.status(builder.javaFor(mcVersion)));

ipcMain.handle('export:defaultDir', async (e, pluginName) =>
  path.join(baseDir(), 'exports', builder.sanitizeName(pluginName)));

ipcMain.handle('export:pickFolder', async (event, def) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  const r = await dialog.showOpenDialog(win, {
    title: '저장할 폴더 고르기', defaultPath: def, properties: ['openDirectory', 'createDirectory']
  });
  if (r.canceled || !r.filePaths.length) return { ok: false };
  return { ok: true, path: r.filePaths[0] };
});

ipcMain.handle('export:pickServer', async (event, def) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  const r = await dialog.showOpenDialog(win, { title: '서버의 plugins 폴더 고르기', defaultPath: def || undefined, properties: ['openDirectory'] });
  if (r.canceled || !r.filePaths.length) return { ok: false };
  const p = r.filePaths[0];
  const inner = path.join(p, 'plugins');
  return { ok: true, path: path.basename(p).toLowerCase() !== 'plugins' && fs.existsSync(inner) ? inner : p };
});

ipcMain.handle('export:openFolder', async (e, p) => {
  if (typeof p === 'string' && fs.existsSync(p)) shell.openPath(p);
});

ipcMain.handle('export:run', async (event, opts) => {
  const log = (line) => { try { event.sender.send('export:log', line); } catch (e) {  } };
  try {
    const pluginName = builder.sanitizeName(opts.pluginName);
    const version = /^[0-9A-Za-z.\-]{1,20}$/.test(opts.version || '') ? opts.version : '1.0.0';
    const outDir = opts.outDir || path.join(baseDir(), 'exports', pluginName);
    const pkg = 'com.example.' + pluginName.toLowerCase();

    if (!String(opts.code || '').trim()) return { ok: false, error: '아직 블록이 없습니다. "~했을 때" 블록부터 놓아주세요.' };

    const problems = builder.analyze(opts.code);
    if (problems.length) return { ok: true, outDir, built: false, problems };

    log(' 프로젝트 파일을 만드는 중... ' + outDir);
    const info = builder.writeProject(outDir, {
      code: opts.code, pluginName, version, pkg,
      mcVersion: opts.mcVersion, platform: opts.platform
    });
    log(' 프로젝트 파일 완성 (명령어 ' + info.commands.length + '개 자동 등록)');
    let packPath = null;
    if (typeof opts.pack === 'string' && opts.pack.length) {
      packPath = path.join(outDir, 'resourcepack.zip');
      fs.writeFileSync(packPath, Buffer.from(opts.pack, 'base64'));
      log(' 리소스팩 저장: ' + packPath);
    }

    if (!opts.build) return { ok: true, outDir, built: false, pack: packPath };

    let t;
    try {
      t = await tools.ensure(builder.javaFor(opts.mcVersion), log);
    } catch (err) {
      return { ok: true, outDir, built: false, pack: packPath, toolError: String(err.message || err) };
    }
    log(' .jar 파일을 만드는 중... (처음엔 몇 분 걸릴 수 있습니다)');
    const lines = [];
    const r = await builder.buildJar(outDir, pluginName, (l) => { lines.push(l); log(l); }, t);
    if (r.ok) {
      let copied = null;
      if (typeof opts.serverDir === 'string' && opts.serverDir && fs.existsSync(opts.serverDir)) {
        try {
          copied = path.join(opts.serverDir, path.basename(r.jar));
          fs.copyFileSync(r.jar, copied);
          log(' 서버 plugins 폴더에 넣었습니다: ' + copied);
        } catch (err) { log('[ERROR] 서버 폴더에 복사하지 못했습니다: ' + err.message); copied = null; }
      }
      return { ok: true, outDir, built: true, jar: r.jar, pack: packPath, copied };
    }
    return { ok: true, outDir, built: false, buildFailed: true, errors: builder.explainBuildLog(lines, info.java.offset) };
  } catch (err) {
    return { ok: false, error: String(err.message || err) };
  }
});

const okVer = (v) => typeof v === 'string' && /^[0-9A-Za-z._-]{1,24}$/.test(v);
const catalogJobs = {};
ipcMain.handle('mc:catalog', async (event, ver) => {
  if (!okVer(ver)) return { ok: false, error: '버전 이름이 이상합니다' };
  try {
    const cached = mcassets.cachedCatalog(ver);
    if (cached) return { ok: true, catalog: cached };
    const log = (line) => { try { event.sender.send('mc:log', line); } catch (e) {  } };
    if (!catalogJobs[ver]) catalogJobs[ver] = mcassets.buildRaw(ver, log).finally(() => { delete catalogJobs[ver]; });
    return { ok: true, raw: await catalogJobs[ver] };
  } catch (err) { return { ok: false, error: String(err.message || err) }; }
});
ipcMain.handle('mc:saveCatalog', async (e, ver, cat) => {
  if (!okVer(ver)) return { ok: false };
  try { return { ok: mcassets.saveCatalog(ver, cat) }; } catch (err) { return { ok: false, error: String(err.message || err) }; }
});

ipcMain.handle('file:saveBinary', async (event, data) => {
  const name = data && typeof data.name === 'string' ? data.name.replace(/[\\/:*?"<>|]/g, '_') : 'resourcepack';
  const base64 = data && typeof data.base64 === 'string' ? data.base64 : '';
  const win = BrowserWindow.fromWebContents(event.sender);
  const result = await dialog.showSaveDialog(win, {
    title: '리소스팩 저장하기', defaultPath: name + '.zip',
    filters: [{ name: '리소스팩 (zip)', extensions: ['zip'] }]
  });
  if (result.canceled || !result.filePath) return { ok: false };
  try { fs.writeFileSync(result.filePath, Buffer.from(base64, 'base64')); return { ok: true, path: result.filePath }; }
  catch (err) { return { ok: false, error: String(err.message || err) }; }
});

ipcMain.handle('file:pickImage', async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  const r = await dialog.showOpenDialog(win, {
    title: '그림 고르기', properties: ['openFile'],
    filters: [{ name: 'PNG 그림', extensions: ['png'] }]
  });
  if (r.canceled || !r.filePaths.length) return { ok: false };
  try {
    const buf = fs.readFileSync(r.filePaths[0]);
    if (buf.length < 8 || buf.readUInt32BE(0) !== 0x89504e47) return { ok: false, error: '진짜 PNG 그림이 아닙니다 (확장자만 png 인 다른 그림일 수 있습니다)' };
    if (buf.length > 2 * 1024 * 1024) return { ok: false, error: '그림이 너무 큽니다 (2MB 이하로 골라주세요)' };
    return { ok: true, dataUrl: 'data:image/png;base64,' + buf.toString('base64') };
  } catch (err) { return { ok: false, error: String(err.message || err) }; }
});

ipcMain.handle('file:save', async (event, data) => {
  const name = data && typeof data.name === 'string' ? data.name : 'MyPlugin';
  const content = data && typeof data.content === 'string' ? data.content : '';
  const win = BrowserWindow.fromWebContents(event.sender);
  const result = await dialog.showSaveDialog(win, {
    title: '코드만 저장하기', defaultPath: name + '.java',
    filters: [{ name: 'Java 파일', extensions: ['java'] }, { name: '모든 파일', extensions: ['*'] }]
  });
  if (result.canceled || !result.filePath) return { ok: false };
  try { fs.writeFileSync(result.filePath, content, 'utf8'); return { ok: true, path: result.filePath }; }
  catch (err) { return { ok: false, error: String(err.message || err) }; }
});

app.whenReady().then(() => {
  tools.setBaseDir(app.getPath('userData'));
  mcassets.setBaseDir(app.getPath('userData'));
  createWindow();
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
