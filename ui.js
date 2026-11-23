
const editor      = document.getElementById('editor');
const projectName = document.getElementById('project-name');
const dirtyDot    = document.getElementById('dirty-dot');
const toastBox    = document.getElementById('toast-box');
const statusText  = document.getElementById('status-text');

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function escAttr(s) {
  return esc(s).replace(/"/g, '&quot;');
}

function notice(message, action) {
  const box = document.getElementById('notice-box');
  const n = el('div', 'notice');
  n.append(el('p', 'notice-msg', message));
  const row = el('div', 'notice-row');
  if (action) {
    const b = el('button', 'notice-btn', action.label);
    b.addEventListener('click', () => { action.run(); n.remove(); });
    row.append(b);
  }
  const close = el('button', 'notice-close', '닫기');
  close.addEventListener('click', () => n.remove());
  row.append(close);
  n.append(row);
  box.append(n);
}

function toast(message, kind) {
  const t = el('div', 'toast' + (kind ? ' ' + kind : ''), message);
  toastBox.append(t);
  setTimeout(() => {
    t.classList.add('out');
    setTimeout(() => t.remove(), 300);
  }, 2400);
}

let dirty = false;
function setDirty(value) {
  dirty = value;
  dirtyDot.classList.toggle('off', !value);
}

function refreshEditor() {
  if (window.refreshCodeView) window.refreshCodeView();
}

function askText(message, def, cb) {
  const wrap = el('div', 'ask-overlay');
  const box = el('div', 'ask-box');
  const input = el('input', 'ask-input');
  input.value = def || '';
  input.maxLength = 40;
  const row = el('div', 'ask-row');
  const cancel = el('button', 'top-btn', '취소');
  const ok = el('button', 'primary top-primary', '확인');
  row.append(cancel, ok);
  box.append(el('p', 'ask-msg', message), input, row);
  wrap.append(box);
  document.body.append(wrap);
  setTimeout(() => input.focus(), 0);
  let done = false;
  const finish = (v) => { if (done) return; done = true; wrap.remove(); cb(v); };
  ok.addEventListener('click', () => finish(input.value));
  cancel.addEventListener('click', () => finish(null));
  wrap.addEventListener('mousedown', (e) => { if (e.target === wrap) finish(null); });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') finish(input.value);
    if (e.key === 'Escape') finish(null);
  });
}

const MC_COLORS = [
  ['0', '#000000', '검정'], ['1', '#0000AA', '남색'], ['2', '#00AA00', '초록'], ['3', '#00AAAA', '청록'],
  ['4', '#AA0000', '빨강'], ['5', '#AA00AA', '보라'], ['6', '#FFAA00', '금색'], ['7', '#AAAAAA', '회색'],
  ['8', '#555555', '진회색'], ['9', '#5555FF', '파랑'], ['a', '#55FF55', '연두'], ['b', '#55FFFF', '하늘'],
  ['c', '#FF5555', '연빨강'], ['d', '#FF55FF', '분홍'], ['e', '#FFFF55', '노랑'], ['f', '#FFFFFF', '흰색']
];
const MC_FORMATS = [['l', '굵게'], ['o', '기울임'], ['n', '밑줄'], ['m', '취소선'], ['r', '처음대로']];

function colorPreview(text, host) {
  host.textContent = '';
  let color = '#FFFFFF';
  let style = {};
  const parts = String(text).split(/(&[0-9a-fk-or])/i);
  parts.forEach((part) => {
    const m = /^&([0-9a-fk-or])$/i.exec(part);
    if (m) {
      const k = m[1].toLowerCase();
      const c = MC_COLORS.find((x) => x[0] === k);
      if (c) { color = c[1]; style = {}; }
      else if (k === 'r') { color = '#FFFFFF'; style = {}; }
      else if (k === 'l') style.fontWeight = '800';
      else if (k === 'o') style.fontStyle = 'italic';
      else if (k === 'n') style.textDecoration = 'underline';
      else if (k === 'm') style.textDecoration = 'line-through';
      return;
    }
    if (!part) return;
    const s = el('span', '', part);
    s.style.color = color;
    Object.assign(s.style, style);
    host.append(s);
  });
  if (!host.childNodes.length) host.append(el('span', 'cb-empty', '(글자를 쓰면 여기에 실제 색으로 보입니다)'));
}



(function () {
  const seen = new Set();
  const report = (msg) => {
    const key = String(msg).slice(0, 120);
    if (seen.has(key)) return;
    seen.add(key);
    try { toast('문제가 하나 생겼습니다. 저장하고 다시 켜면 대부분 괜찮아집니다: ' + key, 'warn'); } catch (e) {  }
  };
  window.addEventListener('error', (e) => report(e.message || e));
  window.addEventListener('unhandledrejection', (e) => report((e.reason && e.reason.message) || e.reason));
})();
