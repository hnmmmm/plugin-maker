(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.CodeCheck = factory();
})(typeof self !== 'undefined' ? self : this, function () {
function maskCode(src) {
  let out = '';
  let i = 0;
  const n = src.length;
  while (i < n) {
    const c = src[i], d = src[i + 1];
    if (c === '/' && d === '/') { while (i < n && src[i] !== '\n') { out += ' '; i++; } continue; }
    if (c === '/' && d === '*') {
      out += '  '; i += 2;
      while (i < n && !(src[i] === '*' && src[i + 1] === '/')) { out += src[i] === '\n' ? '\n' : ' '; i++; }
      if (i < n) { out += '  '; i += 2; }
      continue;
    }
    if (c === '"' || c === "'") {
      out += c; i++;
      while (i < n && src[i] !== c && src[i] !== '\n') {
        if (src[i] === '\\' && i + 1 < n) { out += '  '; i += 2; continue; }
        out += ' '; i++;
      }
      if (i < n && src[i] === c) { out += c; i++; }
      continue;
    }
    out += c; i++;
  }
  return out;
}

const NOT_DECL = /^(else|return|new|throw|case|if|for|while|switch|catch|try|do|synchronized)\b/;
function isMemberChunk(text, endsWithBlock) {
  let t = text.trim();
  t = t.replace(/^(@\w+(\s*\([^)]*\))?\s*)+/, '').trim();
  if (!t) return true;
  if (endsWithBlock) {
    const header = t.slice(0, t.indexOf('{')).trim();
    if (/(^|\s)(class|interface|enum|record)\s+\w+/.test(header)) return true;
    if (/^(static\s*)?$/.test(header)) return true;
    if (NOT_DECL.test(header)) return false;
    const mods = '(?:(?:public|private|protected|static|final|synchronized|abstract|default)\\s+)*';
    if (new RegExp('^' + mods + '(?:<[^>]+>\\s+)?[\\w<>\\[\\],.? ]+?\\s+\\w+\\s*\\([^)]*\\)\\s*(?:throws\\s+[\\w., ]+)?$').test(header)) return true;
    if (new RegExp('^' + mods + '[A-Z]\\w*\\s*\\([^)]*\\)\\s*(?:throws\\s+[\\w., ]+)?$').test(header)) return true;
    return false;
  }
  const beforeEq = t.split('=')[0];
  if (beforeEq.includes('(') ) return false;
  if (NOT_DECL.test(t)) return false;
  const mods = '(?:(?:public|private|protected|static|final|volatile|transient)\\s+)*';
  return new RegExp('^' + mods + '[\\w<>\\[\\],.? ]+?\\s+\\w+\\s*(?:=[\\s\\S]*)?;$').test(t.replace(/\s+/g, ' '));
}

function analyze(code) {
  const problems = [];
  const src = String(code || '').replace(/\r\n/g, '\n');
  if (/class\s+\w+\s+extends\s+JavaPlugin/.test(src)) return problems;
  const m = maskCode(src);
  const lineAt = (idx) => src.slice(0, idx).split('\n').length;

  let depth = 0, paren = 0, i = 0;
  const chunks = [];
  let start = -1;
  while (i < m.length) {
    const c = m[i];
    if (start < 0 && !/\s/.test(c)) {
      if (/^\s*import\s/.test(src.slice(i, i + 10)) ) {
        while (i < m.length && m[i] !== '\n') i++;
        continue;
      }
      start = i;
    }
    if (c === '(') paren++;
    else if (c === ')') paren = Math.max(0, paren - 1);
    else if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth < 0) { problems.push(lineAt(i) + '번째 줄: } 가 너무 많습니다. 짝이 맞지 않는 } 를 지워주세요.'); depth = 0; start = -1; i++; continue; }
      if (depth === 0 && start >= 0) {
        let j = i + 1;
        while (j < m.length && /\s/.test(m[j])) j++;
        if (m[j] !== ';' && m[j] !== ',') {
          chunks.push({ s: start, e: i + 1, block: true });
          start = -1;
        }
      }
    } else if (c === ';' && depth === 0 && paren === 0 && start >= 0) {
      chunks.push({ s: start, e: i + 1, block: false });
      start = -1;
    }
    i++;
  }
  if (depth > 0) problems.push('코드 끝: { 를 열고 } 로 닫지 않았습니다. } 가 ' + depth + '개 더 필요합니다.');

  let group = null;
  const flush = () => {
    if (!group) return;
    const first = src.slice(group.s, group.e).split('\n')[0].trim();
    const preview = first.length > 36 ? first.slice(0, 36) + '…' : first;
    const l1 = lineAt(group.s), l2 = lineAt(group.e - 1);
    problems.push((l1 === l2 ? l1 + '번째 줄' : l1 + '~' + l2 + '번째 줄') + ': "' + preview +
      '" 같은 동작 코드가 카드 밖에 혼자 있습니다. "~했을 때" 카드나 "명령어" 카드 안(중괄호 { } 사이)으로 옮겨주세요.');
    group = null;
  };
  chunks.forEach((c) => {
    const text = m.slice(c.s, c.e);
    if (isMemberChunk(text, c.block)) { flush(); return; }
    if (group) group.e = c.e; else group = { s: c.s, e: c.e };
  });
  flush();
  return problems;
}


  return { maskCode, analyze, isMemberChunk };
});
