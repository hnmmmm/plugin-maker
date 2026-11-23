const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const IMPORTS = [
  'org.bukkit.*', 'org.bukkit.attribute.*', 'org.bukkit.block.*', 'org.bukkit.command.*',
  'org.bukkit.enchantments.*', 'org.bukkit.entity.*', 'org.bukkit.event.*',
  'org.bukkit.event.block.*', 'org.bukkit.event.entity.*', 'org.bukkit.event.inventory.*',
  'org.bukkit.event.player.*', 'org.bukkit.inventory.*', 'org.bukkit.inventory.meta.*',
  'org.bukkit.plugin.java.JavaPlugin', 'org.bukkit.potion.*', 'org.bukkit.scheduler.*',
  'org.bukkit.util.Vector', 'org.bukkit.boss.*', 'org.bukkit.scoreboard.*',
  'org.bukkit.event.world.*', 'org.bukkit.event.weather.*', 'org.bukkit.event.server.*', 'org.bukkit.event.vehicle.*',
  'org.bukkit.configuration.ConfigurationSection', 'org.bukkit.configuration.file.FileConfiguration',
  'org.bukkit.configuration.file.YamlConfiguration',
  'java.util.List', 'java.util.ArrayList', 'java.util.Map', 'java.util.HashMap',
  'java.util.Set', 'java.util.HashSet', 'java.util.UUID', 'java.util.Random',
  'java.util.Arrays', 'java.util.Collections', 'java.io.File', 'java.io.IOException'
];
const IMPORTS_SINCE = { 'org.bukkit.persistence.PersistentDataType': 14 };

function sanitizeName(name) {
  const s = String(name || '').replace(/[^A-Za-z0-9_]/g, '');
  return /^[A-Za-z]/.test(s) ? s : 'MyPlugin';
}

function parseMc(mc) {
  const s = String(mc || '');
  let m = /^1\.(\d+)(?:\.(\d+))?/.exec(s);
  if (m) return { minor: +m[1], patch: +(m[2] || 0), classic: true };
  m = /^(\d+)\.(\d+)(?:\.(\d+))?/.exec(s);
  if (m) return { major: +m[1], minor: +m[2], patch: +(m[3] || 0), classic: false };
  return { classic: false, major: 99, minor: 0, patch: 0 };
}

function javaFor(mc) {
  const v = parseMc(mc);
  if (!v.classic) return 25;
  if (v.minor >= 21 || (v.minor === 20 && v.patch >= 5)) return 21;
  if (v.minor >= 18) return 17;
  if (v.minor === 17) return 16;
  return 8;
}

function apiVersionFor(mc) {
  const v = parseMc(mc);
  if (!v.classic) return v.major + '.' + v.minor;
  return v.minor >= 13 ? '1.' + v.minor : null;
}

function apiDepVersion(mc, spigot) {
  const v = parseMc(mc);
  if (v.classic || spigot) return mc + '-R0.1-SNAPSHOT';
  const nums = String(mc).split('.').map(Number);
  const upper = nums.slice(0, -1).concat(nums[nums.length - 1] + 1).join('.');
  return '[' + mc + '.build,' + upper + ')';
}

function detectCommands(code) {
  const found = new Set();
  const re = /(?:getName\(\)|label)\s*\.\s*equals(?:IgnoreCase)?\(\s*"([A-Za-z0-9_\-]+)"\s*\)/g;
  const re2 = /getCommand\(\s*"([A-Za-z0-9_\-]+)"\s*\)/g;
  let m;
  while ((m = re.exec(code))) found.add(m[1].toLowerCase());
  while ((m = re2.exec(code))) found.add(m[1].toLowerCase());
  return [...found];
}

function buildJava(code, pkg, mcVersion) {
  const full = /class\s+(\w+)\s+extends\s+JavaPlugin/.exec(code);
  if (full) {
    const p = /package\s+([\w.]+)\s*;/.exec(code);
    const usedPkg = p ? p[1] : pkg;
    const src = p ? code : 'package ' + pkg + ';\n\n' + code;
    return { pkg: usedPkg, className: full[1], source: src, offset: p ? 0 : 2 };
  }

  const extra = [];
  let body = code.replace(/\r\n/g, '\n').replace(/\s+$/, '').split('\n').map((l) => {
    const m = /^\s*import\s+(static\s+)?([\w.*]+)\s*;\s*$/.exec(l);
    if (m) { extra.push((m[1] || '') + m[2]); return ''; }
    return l;
  }).join('\n');

  const register = 'getServer().getPluginManager().registerEvents(this, this);';
  const enableRe = /(public\s+void\s+onEnable\s*\(\s*\)\s*\{)/;
  let stub = '';
  if (enableRe.test(body)) {
    body = body.replace(enableRe, '$1 ' + register);
  } else {
    stub = '    @Override public void onEnable() { ' + register + ' }\n';
  }
  const v = parseMc(mcVersion);
  const versioned = Object.keys(IMPORTS_SINCE).filter((i) => !v.classic || v.minor >= IMPORTS_SINCE[i]);
  const base = IMPORTS.concat(versioned);
  const imports = base.concat(extra.filter((i) => !base.includes(i)));
  const indented = body.split('\n').map((l) => (l ? '    ' + l : l)).join('\n');
  const head =
    'package ' + pkg + ';\n\n' +
    imports.map((i) => 'import ' + i + ';').join('\n') + '\n\n' +
    'public class Main extends JavaPlugin implements Listener {\n' + stub;
  const offset = head.split('\n').length - 1;
  return { pkg, className: 'Main', source: head + indented + '\n}\n', offset };
}

const { maskCode, analyze } = require('./check');

function explainBuildLog(lines, offset) {
  const out = [];
  const seen = new Set();
  const re = /([^\s\/\\]+\.java):\[(\d+),(\d+)\]\s+(.*)$/;
  for (let k = 0; k < lines.length; k++) {
    const mm = re.exec(lines[k]);
    if (!mm) continue;
    const gen = +mm[2];
    const msg = mm[4].trim();
    let symbol = '';
    for (let j = k + 1; j < Math.min(lines.length, k + 4); j++) {
      const sm = /symbol:\s+(.*)$/.exec(lines[j]);
      if (sm) { symbol = sm[1].trim(); break; }
      if (re.test(lines[j])) break;
    }
    const line = gen - offset;
    const where = line >= 1 ? line + '번째 줄: ' : '';
    let text;
    if (/cannot find symbol/.test(msg)) {
      const name = symbol.replace(/^(variable|class|method)\s+/, '');
      text = '모르는 이름입니다' + (name ? ' → ' + name : '') + '. 철자·대소문자를 확인하거나, 고른 마크 버전에 없는 이름일 수 있습니다.';
    } else if (/<identifier> expected|illegal start of (type|expression)|class, interface, enum, or record expected|'\{' or ';' expected|'\{' expected/.test(msg)) {
      text = '코드 모양이 이상합니다. 동작 코드가 "~했을 때" 카드 밖에 있거나 { } 짝이 안 맞을 수 있습니다.';
    } else if (/';' expected/.test(msg)) {
      text = '줄 끝에 ; 가 빠진 것 같습니다.';
    } else if (/reached end of file while parsing/.test(msg)) {
      text = '} 가 부족합니다. 열어둔 { 를 모두 닫아주세요.';
    } else if (/unclosed string literal/.test(msg)) {
      text = '따옴표(") 가 닫히지 않았습니다.';
    } else if (/not a statement/.test(msg)) {
      text = '완성된 문장이 아닙니다. 줄 끝이나 괄호를 확인해주세요.';
    } else if (/incompatible types/.test(msg)) {
      text = '값의 종류가 안 맞습니다 (' + msg + ').';
    } else if (/cannot be applied to given types|no suitable (method|constructor)/.test(msg)) {
      text = '함수에 넣은 값의 개수나 종류가 다릅니다.';
    } else if (/already defined/.test(msg)) {
      text = /method|메서드/.test(msg)
        ? '같은 이름의 메서드(함수)가 두 번 있습니다. 같은 이벤트 카드를 두 번 넣었는지 확인해주세요.'
        : '같은 이름의 변수가 이미 있습니다. 이름을 바꿔주세요.';
    } else if (/unreported exception/.test(msg)) {
      text = '오류가 날 수 있는 코드라서 try/catch로 감싸야 합니다.';
    } else if (/missing return statement/.test(msg)) {
      text = '결과를 돌려주는 return 이 빠졌습니다.';
    } else {
      text = msg;
    }
    const line2 = where + text;
    if (!seen.has(line2)) { seen.add(line2); out.push(line2); }
    if (out.length >= 6) break;
  }
  return out;
}

function pluginYml(opt) {
  const lines = [
    'name: ' + opt.pluginName,
    "version: '" + opt.version + "'",
    'main: ' + opt.pkg + '.' + opt.className
  ];
  const api = apiVersionFor(opt.mcVersion);
  if (api) lines.push("api-version: '" + api + "'");
  if (opt.commands.length) {
    lines.push('commands:');
    opt.commands.forEach(c => {
      lines.push('  "' + c + '":');
      lines.push('    description: "' + c + ' 명령어"');
    });
  }
  return lines.join('\n') + '\n';
}

function pomXml(opt) {
  const spigot = opt.platform === 'spigot';
  const repo = spigot
    ? ['spigotmc-repo', 'https://hub.spigotmc.org/nexus/content/repositories/snapshots/']
    : ['papermc', 'https://repo.papermc.io/repository/maven-public/'];
  const v = parseMc(opt.mcVersion);
  let group, artifact;
  if (spigot) { group = 'org.spigotmc'; artifact = 'spigot-api'; }
  else if (v.classic && v.minor <= 16) { group = 'com.destroystokyo.paper'; artifact = 'paper-api'; }
  else { group = 'io.papermc.paper'; artifact = 'paper-api'; }

  return `<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">
  <modelVersion>4.0.0</modelVersion>
  <groupId>${opt.pkg}</groupId>
  <artifactId>${opt.pluginName.toLowerCase()}</artifactId>
  <version>${opt.version}</version>
  <packaging>jar</packaging>

  <properties>
    <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
    <maven.compiler.release>${javaFor(opt.mcVersion)}</maven.compiler.release>
  </properties>

  <repositories>
    <repository>
      <id>${repo[0]}</id>
      <url>${repo[1]}</url>
    </repository>
  </repositories>

  <dependencies>
    <dependency>
      <groupId>${group}</groupId>
      <artifactId>${artifact}</artifactId>
      <version>${apiDepVersion(opt.mcVersion, spigot)}</version>
      <scope>provided</scope>
    </dependency>
  </dependencies>

  <build>
    <finalName>${opt.pluginName}</finalName>
    <plugins>
      <plugin>
        <groupId>org.apache.maven.plugins</groupId>
        <artifactId>maven-compiler-plugin</artifactId>
        <version>3.13.0</version>
      </plugin>
    </plugins>
  </build>
</project>
`;
}

function writeProject(outDir, opt) {
  const java = buildJava(opt.code, opt.pkg, opt.mcVersion);
  const o = Object.assign({}, opt, { pkg: java.pkg, className: java.className });
  o.commands = detectCommands(opt.code);

  const srcDir = path.join(outDir, 'src', 'main', 'java', ...java.pkg.split('.'));
  const resDir = path.join(outDir, 'src', 'main', 'resources');
  fs.mkdirSync(srcDir, { recursive: true });
  fs.mkdirSync(resDir, { recursive: true });

  fs.writeFileSync(path.join(srcDir, java.className + '.java'), java.source, 'utf8');
  fs.writeFileSync(path.join(resDir, 'plugin.yml'), pluginYml(o), 'utf8');
  fs.writeFileSync(path.join(outDir, 'pom.xml'), pomXml(o), 'utf8');
  fs.writeFileSync(path.join(outDir, 'build.bat'), '@echo off\r\nmvn -q package\r\npause\r\n', 'utf8');
  fs.writeFileSync(path.join(outDir, 'build.sh'), '#!/bin/sh\nmvn -q package\n', 'utf8');
  return { java, commands: o.commands };
}

function run(cmd, args, cwd, onLog) {
  return new Promise((resolve) => {
    let p;
    try {
      p = spawn(cmd, args, { cwd, shell: process.platform === 'win32' });
    } catch (e) { resolve(-1); return; }
    const feed = (b) => { if (onLog) String(b).split(/\r?\n/).forEach(l => l && onLog(l)); };
    p.stdout.on('data', feed);
    p.stderr.on('data', feed);
    p.on('error', () => resolve(-1));
    p.on('close', (code) => resolve(code));
  });
}

async function checkEnv() {
  const [mvn, javac] = (await Promise.all([
    run('mvn', ['-v'], undefined, null), run('javac', ['-version'], undefined, null)
  ])).map((code) => code === 0);
  return { mvn, javac };
}

async function buildJar(outDir, pluginName, onLog, t) {
  const code = t ? await require('./tools').runMaven(t, ['-B', 'package'], outDir, onLog) : await run('mvn', ['-B', 'package'], outDir, onLog);
  const jar = path.join(outDir, 'target', pluginName + '.jar');
  if (code === 0 && fs.existsSync(jar)) {
    const copy = path.join(outDir, pluginName + '.jar');
    fs.copyFileSync(jar, copy);
    return { ok: true, jar: copy };
  }
  return { ok: false };
}

module.exports = { sanitizeName, javaFor, apiVersionFor, apiDepVersion, buildJava, analyze, explainBuildLog, detectCommands, pluginYml, pomXml, writeProject, checkEnv, buildJar };
