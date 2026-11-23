(function () {
  let open = null;

  function close() {
    if (!open) return;
    open.wrap.remove();
    document.removeEventListener('pointerdown', open.outside, true);
    document.removeEventListener('mousedown', open.outside, true);
    window.removeEventListener('blur', open.blur);
    document.removeEventListener('keydown', open.key, true);
    open = null;
  }

  window.openPicker = function (anchor, opts, onPick) {
    close();
    const wrap = el('div', 'pk-pop');
    const search = el('input', 'pk-search');
    search.placeholder = (opts.title || '고르기') + ' · 한글이나 영어로 찾기';
    search.spellcheck = false;
    const list = el('div', 'pk-list');
    wrap.append(search, list);
    document.body.append(wrap);

    const all = (opts.extra || []).concat(opts.items || []);
    let shown = [];
    let active = 0;
    const draw = () => {
      const q = search.value.trim().toLowerCase();
      list.textContent = '';
      shown = all.filter((it) => !q || String(it.k).toLowerCase().includes(q) || String(it.v).toLowerCase().includes(q));
      let lastG = null;
      shown.forEach((it, i) => {
        if (it.g !== lastG && it.g) list.append(el('div', 'pk-group', it.g));
        lastG = it.g;
        const row = el('button', 'pk-item' + (it.v === opts.value ? ' cur' : '') + (i === active ? ' on' : ''));
        if (it.img) {
          const im = document.createElement('img');
          im.src = it.img;
          im.className = 'pk-img';
          row.append(im);
        }
        row.append(el('span', 'pk-k', it.k), el('span', 'pk-v', it.v === it.k ? '' : String(it.v)));
        row.addEventListener('click', () => { close(); onPick(it.v); });
        list.append(row);
      });
      if (!shown.length) list.append(el('div', 'pk-empty', '찾는 게 없습니다'));
    };
    const place = () => {
      const r = anchor.getBoundingClientRect();
      const w = 300;
      const h = Math.min(420, window.innerHeight - 40);
      wrap.style.width = w + 'px';
      wrap.style.maxHeight = h + 'px';
      let left = Math.min(Math.max(8, r.left), window.innerWidth - w - 8);
      const real = Math.min(h, wrap.offsetHeight || h);
      let top = r.bottom + 6;
      if (top + real > window.innerHeight - 8) top = r.top - real - 6 >= 8 ? r.top - real - 6 : Math.max(8, window.innerHeight - real - 8);
      wrap.style.left = left + 'px';
      wrap.style.top = top + 'px';
    };
    search.addEventListener('input', () => { active = 0; draw(); });
    const key = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); close(); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); active = Math.min(shown.length - 1, active + 1); draw(); scrollActive(); }
      if (e.key === 'ArrowUp') { e.preventDefault(); active = Math.max(0, active - 1); draw(); scrollActive(); }
      if (e.key === 'Enter' && shown[active]) { e.preventDefault(); const v = shown[active].v; close(); onPick(v); }
    };
    const scrollActive = () => { const a = list.querySelector('.pk-item.on'); if (a) a.scrollIntoView({ block: 'nearest' }); };
    const outside = (e) => { if (!wrap.contains(e.target)) close(); };
    document.addEventListener('pointerdown', outside, true);
    document.addEventListener('mousedown', outside, true);
    const blur = () => close();
    window.addEventListener('blur', blur);
    document.addEventListener('keydown', key, true);
    open = { wrap, outside, key, blur };
    active = Math.max(0, all.findIndex((it) => it.v === opts.value));
    draw();
    place();
    scrollActive();
    setTimeout(() => search.focus(), 0);
  };
  window.closePicker = close;

  window.choiceItems = function (type) {
    const full = window.MCCAT && window.MCCAT.get(type);
    if (full) return full;
    const T = window.SLOT_TYPES && window.SLOT_TYPES[type === 'block' ? 'material' : type];
    const seen = new Set();
    const out = [];
    (T ? T.items : []).forEach((it) => {
      if (seen.has(it.v) || (window.MC && !window.MC.ok(it))) return;
      seen.add(it.v);
      out.push({ v: it.v, k: it.k, g: it.g });
    });
    return out;
  };
  window.choiceLabel = function (type, v) {
    if (v === 'AIR') return '(빈칸)';
    const c = window.MCCAT && (window.MCCAT.find(type, v) || (type === 'block' && window.MCCAT.find('material', v)));
    if (c) return c.k;
    const T = window.SLOT_TYPES && window.SLOT_TYPES[type === 'block' ? 'material' : type];
    const it = T && T.items.find((x) => x.v === v);
    return it ? it.k : v;
  };
})();
