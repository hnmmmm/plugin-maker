(function () {
  const COLORS = typeof MC_COLORS !== 'undefined' ? MC_COLORS : window.MC_COLORS;
  const DEFAULT = '#FFFFFF';
  const byCode = {};
  COLORS.forEach(([k, hex]) => { byCode[k] = hex; });

  function parse(str) {
    const out = [];
    let st = { color: null, bold: false, italic: false, underline: false, strike: false };
    const parts = String(str == null ? '' : str).split(/([&§][0-9a-fk-or])/i);
    parts.forEach((part) => {
      const m = /^[&§]([0-9a-fk-or])$/i.exec(part);
      if (m) {
        const k = m[1].toLowerCase();
        if (byCode[k]) st = { color: byCode[k], bold: false, italic: false, underline: false, strike: false };
        else if (k === 'r') st = { color: null, bold: false, italic: false, underline: false, strike: false };
        else if (k === 'l') st = Object.assign({}, st, { bold: true });
        else if (k === 'o') st = Object.assign({}, st, { italic: true });
        else if (k === 'n') st = Object.assign({}, st, { underline: true });
        else if (k === 'm') st = Object.assign({}, st, { strike: true });
        return;
      }
      if (part) out.push(Object.assign({ text: part }, st));
    });
    return out;
  }
  const strip = (str) => parse(str).map((s) => s.text).join('');
  const styled = (segs) => segs.some((s) => s.color || s.bold || s.italic || s.underline || s.strike);

  function renderSvg(textEl, str) {
    const segs = parse(str);
    if (!styled(segs)) return false;
    segs.forEach((s) => {
      const t = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
      t.textContent = s.text.replace(/ /g, ' ');
      let css = 'fill:' + (s.color || DEFAULT) + ' !important;';
      if (s.bold) css += 'font-weight:800;';
      if (s.italic) css += 'font-style:italic;';
      const deco = [s.underline ? 'underline' : '', s.strike ? 'line-through' : ''].filter(Boolean).join(' ');
      if (deco) css += 'text-decoration:' + deco + ';';
      t.setAttribute('style', css);
      textEl.appendChild(t);
    });
    return true;
  }

  function renderHtml(host, str, defaultColor) {
    host.textContent = '';
    parse(str).forEach((s) => {
      const sp = document.createElement('span');
      sp.textContent = s.text;
      sp.style.color = s.color || defaultColor || DEFAULT;
      if (s.bold) sp.style.fontWeight = '800';
      if (s.italic) sp.style.fontStyle = 'italic';
      const deco = [s.underline ? 'underline' : '', s.strike ? 'line-through' : ''].filter(Boolean).join(' ');
      if (deco) sp.style.textDecoration = deco;
      host.append(sp);
    });
  }

  const rgbOf = (s) => { const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(s); return m ? [+m[1], +m[2], +m[3]] : [255, 255, 255]; };
  const hexRgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  function nearestCode(rgb) {
    let best = null;
    let bd = Infinity;
    COLORS.forEach(([k, hex]) => {
      const c = hexRgb(hex);
      const d = (c[0] - rgb[0]) ** 2 + (c[1] - rgb[1]) ** 2 + (c[2] - rgb[2]) ** 2;
      if (d < bd) { bd = d; best = k; }
    });
    return best;
  }
  function serialize(root) {
    let out = '';
    let cur = { code: null, bold: false, italic: false, underline: false, strike: false };
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const text = n.nodeValue.replace(/ /g, ' ');
      if (!text) continue;
      const elx = n.parentElement;
      const cs = getComputedStyle(elx);
      let code = nearestCode(rgbOf(cs.color));
      if (code === 'f') code = null;
      let underline = false;
      let strike = false;
      for (let p = elx; p && p !== root.parentElement; p = p.parentElement) {
        const d = getComputedStyle(p).textDecorationLine || '';
        if (d.includes('underline')) underline = true;
        if (d.includes('line-through')) strike = true;
        if (p === root) break;
      }
      const st = { code, bold: parseInt(cs.fontWeight, 10) >= 600, italic: cs.fontStyle === 'italic', underline, strike };
      const lost = (cur.bold && !st.bold) || (cur.italic && !st.italic) || (cur.underline && !st.underline) || (cur.strike && !st.strike);
      if (st.code !== cur.code || lost) {
        out += st.code ? '&' + st.code : (cur.code || lost ? '&r' : '');
        if (st.bold) out += '&l';
        if (st.italic) out += '&o';
        if (st.underline) out += '&n';
        if (st.strike) out += '&m';
      } else {
        if (st.bold && !cur.bold) out += '&l';
        if (st.italic && !cur.italic) out += '&o';
        if (st.underline && !cur.underline) out += '&n';
        if (st.strike && !cur.strike) out += '&m';
      }
      cur = st;
      out += text;
    }
    return out;
  }

  function open(title, value, onSave, opts) {
    opts = opts || {};
    const wrap = el('div', 'ask-overlay');
    const box = el('div', 'rt-box');
    box.append(el('p', 'ask-msg', title || '글자 꾸미기'));
    const bar = el('div', 'rt-bar');
    const ed = el('div', 'rt-edit');
    ed.contentEditable = 'true';
    ed.spellcheck = false;
    renderHtml(ed, value || '', DEFAULT);
    const keep = (e) => e.preventDefault();
    const exec = (cmd, arg) => {
      ed.focus();
      document.execCommand('styleWithCSS', false, true);
      document.execCommand(cmd, false, arg);
    };
    COLORS.forEach(([k, hex, name]) => {
      const b = el('button', 'rt-sw');
      b.style.background = hex;
      b.title = name;
      b.addEventListener('mousedown', keep);
      b.addEventListener('click', () => exec('foreColor', hex));
      bar.append(b);
    });
    const fmt = el('div', 'rt-fmt');
    [['굵게', 'bold', 'font-weight:800'], ['기울임', 'italic', 'font-style:italic'], ['밑줄', 'underline', 'text-decoration:underline'], ['취소선', 'strikeThrough', 'text-decoration:line-through']].forEach(([label, cmd, css]) => {
      const b = el('button', 'rt-btn', label);
      b.setAttribute('style', css);
      b.addEventListener('mousedown', keep);
      b.addEventListener('click', () => exec(cmd));
      fmt.append(b);
    });
    const clear = el('button', 'rt-btn', '꾸밈 지우기');
    clear.addEventListener('mousedown', keep);
    clear.addEventListener('click', () => { exec('removeFormat'); exec('foreColor', DEFAULT); });
    fmt.append(clear);
    const hint = el('p', 'rt-hint', '글자를 드래그해서 고른 다음 색이나 굵게를 누릅니다. 아무것도 안 고르고 누르면 이제부터 쓰는 글자에 적용됩니다.');
    const row = el('div', 'ask-row');
    const cancel = el('button', 'top-btn', '취소');
    const ok = el('button', 'primary top-primary', '확인');
    row.append(cancel, ok);
    box.append(bar, fmt, ed, hint, row);
    wrap.append(box);
    document.body.append(wrap);
    let done = false;
    const finish = (save) => {
      if (done) return;
      done = true;
      const v = save ? serialize(ed) : null;
      wrap.remove();
      if (save) onSave(v);
    };
    ed.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); finish(true); }
      if (e.key === 'Escape') { e.preventDefault(); finish(false); }
    });
    ed.addEventListener('paste', (e) => {
      e.preventDefault();
      const t = (e.clipboardData || window.clipboardData).getData('text').replace(/[\r\n]+/g, ' ');
      document.execCommand('insertText', false, t);
    });
    ok.addEventListener('click', () => finish(true));
    cancel.addEventListener('click', () => finish(false));
    wrap.addEventListener('mousedown', (e) => { if (e.target === wrap) finish(false); });
    setTimeout(() => {
      ed.focus();
      const r = document.createRange();
      r.selectNodeContents(ed);
      r.collapse(false);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(r);
    }, 0);
  }

  window.RichText = { parse, strip, renderSvg, renderHtml, serialize, open, styled };
})();
