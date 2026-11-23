(function () {
  const PALETTE = [
    '#000000', '#3b3b3b', '#6b6b6b', '#a0a0a0', '#d6d6d6', '#ffffff',
    '#5c1a1a', '#b3261e', '#ff5c5c', '#ff9e9e', '#7a3f12', '#c46a1b',
    '#ffa53d', '#ffd29e', '#8a6d0b', '#e6c229', '#fff27a', '#2e5e1f',
    '#4caf3a', '#9be37a', '#0f5257', '#1fa3a8', '#6ee7c8', '#c9fff0',
    '#123a75', '#2f6fdb', '#8ab4f8', '#c8dcff', '#3d1f66', '#7b4bd1',
    '#c4b5fd', '#7a1f5c', '#d14c9b', '#f48fb1', '#5a3a22', '#9c6b43',
    '#c6c6c6', '#8b8b8b', '#373737', '#555555'
  ];

  const SHAPES = {
    '검': ['..............33', '.............323', '............3231', '...........3231.', '..........3231..', '.........3231...',
      '........3231....', '...11..3231.....', '...121321.......', '....1221........', '....1121........', '...1..11........',
      '..1.............', '.1..............', '................', '................'],
    '보석': ['................', '................', '.....111111.....', '....13333331....', '...1332222331...', '..132222222231..',
      '..122222222221..', '...1222222221...', '....12222221....', '.....122221.....', '......1221......', '.......11.......',
      '................', '................', '................', '................'],
    '지팡이': ['............333.', '...........32223', '...........32223', '............323.', '...........11...', '..........11....',
      '.........11.....', '........11......', '.......11.......', '......11........', '.....11.........', '....11..........',
      '...11...........', '..11............', '................', '................'],
    '동그라미': ['................', '.....111111.....', '...1122222211...', '..122233222221..', '..123322222221..', '.12332222222221.',
      '.12322222222221.', '.12222222222221.', '.12222222222221.', '.12222222222221.', '..122222222221..', '..112222222211..',
      '...1122222211...', '.....111111.....', '................', '................'],
    '블록': ['1111111111111111', '1333333333333331', '1322222222222221', '1322222222222221', '1322222222222221', '1322222222222221',
      '1322222222222221', '1322222222222221', '1322222222222221', '1322222222222221', '1322222222222221', '1322222222222221',
      '1322222222222221', '1322222222222221', '1222222222222221', '1111111111111111']
  };

  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    const ch = (v) => Math.max(0, Math.min(255, Math.round(v + amt * 255)));
    const r = ch((n >> 16) & 255), g = ch((n >> 8) & 255), b = ch(n & 255);
    return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
  }

  function chestStart(px, w, h, rows) {
    const set = (x, y, c) => { if (x >= 0 && y >= 0 && x < w && y < h) px[y * w + x] = c; };
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) set(x, y, '#c6c6c6');
    for (let x = 0; x < w; x++) { set(x, 0, '#ffffff'); set(x, 1, '#ffffff'); set(x, h - 1, '#555555'); set(x, h - 2, '#555555'); }
    for (let y = 0; y < h; y++) { set(0, y, '#ffffff'); set(1, y, '#ffffff'); set(w - 1, y, '#555555'); set(w - 2, y, '#555555'); }
    for (let r = 0; r < rows; r++) for (let c = 0; c < 9; c++) {
      const sx = 7 + c * 18, sy = 17 + r * 18;
      for (let y = 0; y < 18; y++) for (let x = 0; x < 18; x++) {
        let col = '#8b8b8b';
        if (x === 0 || y === 0) col = '#373737';
        else if (x === 17 || y === 17) col = '#ffffff';
        set(sx + x, sy + y, col);
      }
    }
  }

  function guides(kind, w, h, rows) {
    if (kind === 'gui') {
      const out = [{ x: 0, y: 0, w, h: 17, label: '제목 자리' }];
      for (let r = 0; r < rows; r++) for (let c = 0; c < 9; c++) out.push({ x: 8 + c * 18, y: 18 + r * 18, w: 16, h: 16, label: String(r * 9 + c + 1), slot: true });
      return out;
    }
    if (kind === 'humanoid' || kind === 'humanoid32') {
      const g = [
        { x: 0, y: 0, w: 32, h: 16, label: '머리' }, { x: 32, y: 0, w: 32, h: 16, label: '머리 겉' },
        { x: 0, y: 16, w: 16, h: 16, label: '다리' }, { x: 16, y: 16, w: 24, h: 16, label: '몸' }, { x: 40, y: 16, w: 16, h: 16, label: '팔' }
      ];
      if (kind === 'humanoid') g.push({ x: 16, y: 48, w: 16, h: 16, label: '왼다리' }, { x: 32, y: 48, w: 16, h: 16, label: '왼팔' }, { x: 16, y: 32, w: 24, h: 16, label: '몸 겉' });
      return g;
    }
    return [];
  }

  window.openPixelEditor = function (src, onSave, opts) {
    opts = opts || {};
    let W = opts.width || 16;
    let H = opts.height || W;
    const fixedSize = !!opts.width;
    let tool = 'pen';
    let color = '#2f6fdb';
    let mirror = false;
    let grid = W <= 64;
    let showGuide = !!opts.guide;
    const undo = [];
    const redo = [];
    const recent = [];
    const blank = () => Array.from({ length: W * H }, () => '');
    let px = blank();

    const wrap = el('div', 'ask-overlay');
    const box = el('div', 'px-box');
    const head = el('div', 'px-head');
    head.append(el('h3', '', '그림 그리기' + (opts.title ? ' · ' + opts.title : '') + ' (' + W + '×' + H + ')'),
      el('p', '', '칸을 눌러서 칠합니다. 오른쪽 클릭은 지우개입니다. 휠로 확대·축소합니다.'));
    const body = el('div', 'px-body');
    const left = el('div', 'px-tools');
    const center = el('div', 'px-center');
    const right = el('div', 'px-side');
    const view = el('div', 'px-view');
    const canvas = document.createElement('canvas');
    canvas.className = 'px-canvas';
    view.append(canvas);
    center.append(view);
    const ctx = canvas.getContext('2d');
    let cell = Math.max(2, Math.floor(Math.min(520 / W, 440 / H)));

    const TOOLS = [['pen', '연필', 'B'], ['eraser', '지우개', 'E'], ['fill', '채우기', 'G'], ['pick', '스포이드', 'I'], ['rect', '네모', 'R']];
    const toolBtns = {};
    TOOLS.forEach(([id, name, key]) => {
      const b = el('button', 'px-tool', name);
      b.title = name + ' (' + key + ')';
      b.addEventListener('click', () => setTool(id));
      toolBtns[id] = b;
      left.append(b);
    });
    left.append(el('div', 'px-sep'));
    const mirrorBtn = el('button', 'px-tool', '좌우 대칭');
    mirrorBtn.addEventListener('click', () => { mirror = !mirror; mirrorBtn.classList.toggle('on', mirror); draw(); });
    const gridBtn = el('button', 'px-tool' + (grid ? ' on' : ''), '모눈');
    gridBtn.addEventListener('click', () => { grid = !grid; gridBtn.classList.toggle('on', grid); draw(); });
    left.append(mirrorBtn, gridBtn);
    if (opts.guide) {
      const gBtn = el('button', 'px-tool on', '안내선');
      gBtn.title = opts.guide === 'gui' ? '메뉴 칸 위치를 보여줍니다' : '몸 부위 위치를 보여줍니다';
      gBtn.addEventListener('click', () => { showGuide = !showGuide; gBtn.classList.toggle('on', showGuide); draw(); });
      left.append(gBtn);
    }
    const zoomIn = el('button', 'px-tool', '확대 +');
    zoomIn.addEventListener('click', () => { cell = Math.min(48, cell + 1); draw(); });
    const zoomOut = el('button', 'px-tool', '축소 −');
    zoomOut.addEventListener('click', () => { cell = Math.max(1, cell - 1); draw(); });
    const undoBtn = el('button', 'px-tool', '되돌리기');
    undoBtn.addEventListener('click', doUndo);
    const redoBtn = el('button', 'px-tool', '다시하기');
    redoBtn.addEventListener('click', doRedo);
    const clearBtn = el('button', 'px-tool', '모두 지우기');
    clearBtn.addEventListener('click', () => { push(); px = blank(); draw(); });
    left.append(zoomIn, zoomOut, undoBtn, redoBtn, clearBtn);

    const palette = el('div', 'px-palette');
    PALETTE.forEach((c) => {
      const s = el('button', 'px-swatch');
      s.style.background = c;
      s.title = c;
      s.addEventListener('click', () => setColor(c));
      palette.append(s);
    });
    const customRow = el('label', 'px-custom');
    const picker = document.createElement('input');
    picker.type = 'color';
    picker.value = color;
    picker.addEventListener('input', () => setColor(picker.value));
    const cur = el('span', 'px-cur');
    customRow.append(picker, el('span', '', '다른 색 고르기'), cur);
    const recentRow = el('div', 'px-recent');

    const startRow = el('div', 'px-shapes');
    if (W === 16 && H === 16 || W === 32 && H === 32) {
      Object.keys(SHAPES).forEach((name) => {
        const b = el('button', 'px-chip', name);
        b.addEventListener('click', () => applyShape(name));
        startRow.append(b);
      });
    }
    if (opts.start === 'chest') {
      const b = el('button', 'px-chip', '마크 상자 모양으로 시작');
      b.addEventListener('click', () => { push(); chestStart(px, W, H, opts.rows || 3); draw(); });
      startRow.append(b);
    }
    const sizeRow = el('div', 'px-shapes');
    if (!fixedSize) {
      [16, 32].forEach((n) => {
        const b = el('button', 'px-chip' + (n === W ? ' on' : ''), n + '×' + n);
        b.addEventListener('click', () => {
          if (n === W) return;
          push();
          resize(n, n);
          [...sizeRow.children].forEach((c) => c.classList.toggle('on', c === b));
          draw();
        });
        sizeRow.append(b);
      });
    }
    const loadBtn = el('button', 'px-chip', 'PNG 불러오기');
    loadBtn.addEventListener('click', async () => {
      if (!window.api || !window.api.pickImage) { toast('프로그램 창에서만 그림을 불러올 수 있습니다', 'warn'); return; }
      const r = await window.api.pickImage();
      if (r && r.error) { notice(r.error); return; }
      if (r && r.ok) loadImage(r.dataUrl, true);
    });
    sizeRow.append(loadBtn);

    const prev = el('div', 'px-preview');
    const pv1 = document.createElement('canvas');
    const pv2 = document.createElement('canvas');
    pv1.className = 'px-pv';
    pv2.className = 'px-pv big';
    prev.append(pv1, pv2);

    right.append(el('div', 'px-label', '색'), palette, customRow, recentRow);
    if (startRow.children.length) right.append(el('div', 'px-label', '시작 모양'), startRow);
    right.append(el('div', 'px-label', fixedSize ? '불러오기' : '크기 · 불러오기'), sizeRow, el('div', 'px-label', '미리보기'), prev);
    body.append(left, center, right);
    const foot = el('div', 'px-foot');
    const cancel = el('button', 'top-btn', '취소');
    const save = el('button', 'primary top-primary', '저장');
    foot.append(cancel, save);
    box.append(head, body, foot);
    wrap.append(box);
    document.body.append(wrap);

    let rectStart = null;
    let rectEnd = null;
    function draw() {
      canvas.width = W * cell;
      canvas.height = H * cell;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const chk = Math.max(cell, 8);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const v = px[y * W + x];
        if (v) ctx.fillStyle = v;
        else ctx.fillStyle = (Math.floor(x * cell / chk) + Math.floor(y * cell / chk)) % 2 ? '#1c1c1c' : '#222222';
        ctx.fillRect(x * cell, y * cell, cell, cell);
      }
      if (grid && cell >= 6) {
        ctx.strokeStyle = 'rgba(255,255,255,0.06)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = 1; i < W; i++) { ctx.moveTo(i * cell + 0.5, 0); ctx.lineTo(i * cell + 0.5, H * cell); }
        for (let i = 1; i < H; i++) { ctx.moveTo(0, i * cell + 0.5); ctx.lineTo(W * cell, i * cell + 0.5); }
        ctx.stroke();
      }
      if (showGuide && opts.guide) {
        ctx.lineWidth = 1;
        ctx.font = Math.max(9, Math.min(13, cell * 4)) + 'px sans-serif';
        guides(opts.guide, W, H, opts.rows || 3).forEach((g) => {
          ctx.strokeStyle = g.slot ? 'rgba(110,231,200,0.55)' : 'rgba(246,193,119,0.8)';
          ctx.strokeRect(g.x * cell + 0.5, g.y * cell + 0.5, g.w * cell - 1, g.h * cell - 1);
          if (cell >= 2) { ctx.fillStyle = g.slot ? 'rgba(110,231,200,0.8)' : 'rgba(246,193,119,0.95)'; ctx.fillText(g.label, g.x * cell + 3, g.y * cell + Math.max(10, cell * 3)); }
        });
      }
      if (mirror) {
        ctx.strokeStyle = 'rgba(110,231,200,0.45)';
        ctx.beginPath(); ctx.moveTo(W * cell / 2 + 0.5, 0); ctx.lineTo(W * cell / 2 + 0.5, H * cell); ctx.stroke();
      }
      if (rectStart && rectEnd) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        const x0 = Math.min(rectStart[0], rectEnd[0]), y0 = Math.min(rectStart[1], rectEnd[1]);
        const x1 = Math.max(rectStart[0], rectEnd[0]), y1 = Math.max(rectStart[1], rectEnd[1]);
        ctx.strokeRect(x0 * cell, y0 * cell, (x1 - x0 + 1) * cell, (y1 - y0 + 1) * cell);
      }
      const big = Math.max(1, Math.floor(160 / Math.max(W, H)));
      [[pv1, 1], [pv2, big]].forEach(([c, scale]) => {
        c.width = W * scale; c.height = H * scale;
        const k = c.getContext('2d');
        k.imageSmoothingEnabled = false;
        k.clearRect(0, 0, c.width, c.height);
        px.forEach((v, j) => { if (v) { k.fillStyle = v; k.fillRect((j % W) * scale, Math.floor(j / W) * scale, scale, scale); } });
      });
    }
    function push() { undo.push({ W, H, px: px.slice() }); if (undo.length > 60) undo.shift(); redo.length = 0; }
    function restore(st) { W = st.W; H = st.H; px = st.px; draw(); }
    function doUndo() { if (!undo.length) return; redo.push({ W, H, px: px.slice() }); restore(undo.pop()); }
    function doRedo() { if (!redo.length) return; undo.push({ W, H, px: px.slice() }); restore(redo.pop()); }
    function setTool(t) { tool = t; Object.keys(toolBtns).forEach((k) => toolBtns[k].classList.toggle('on', k === t)); }
    function setColor(c) {
      color = c;
      picker.value = c;
      cur.style.background = c;
      if (!recent.includes(c)) { recent.unshift(c); recent.length = Math.min(recent.length, 10); }
      recentRow.textContent = '';
      recent.forEach((rc) => { const s = el('button', 'px-swatch small'); s.style.background = rc; s.addEventListener('click', () => setColor(rc)); recentRow.append(s); });
      if (tool === 'eraser' || tool === 'pick') setTool('pen');
    }
    function resize(nw, nh) {
      const old = px, ow = W, oh = H;
      W = nw; H = nh;
      px = blank();
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) px[y * W + x] = old[Math.floor(y * oh / H) * ow + Math.floor(x * ow / W)];
      cell = Math.max(2, Math.floor(Math.min(520 / W, 440 / H)));
    }
    function setPx(x, y, v) {
      if (x < 0 || y < 0 || x >= W || y >= H) return;
      px[y * W + x] = v;
      if (mirror) px[y * W + (W - 1 - x)] = v;
    }
    function fill(x, y, v) {
      const target = px[y * W + x];
      if (target === v) return;
      const stack = [[x, y]];
      while (stack.length) {
        const [cx, cy] = stack.pop();
        if (cx < 0 || cy < 0 || cx >= W || cy >= H || px[cy * W + cx] !== target) continue;
        px[cy * W + cx] = v;
        stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
      }
    }
    function applyShape(name) {
      push();
      const rows = SHAPES[name];
      px = blank();
      const cols = { 1: shade(color, -0.25), 2: color, 3: shade(color, 0.25) };
      const s = W / 16;
      rows.forEach((row, y) => [...row].forEach((ch, x) => {
        if (!cols[ch]) return;
        for (let dy = 0; dy < s; dy++) for (let dx = 0; dx < s; dx++) px[(y * s + dy) * W + x * s + dx] = cols[ch];
      }));
      draw();
    }
    function loadImage(url, record) {
      const img = new Image();
      img.onload = () => {
        if (record) push();
        if (!fixedSize) {
          const n = img.width > 16 || img.height > 16 ? 32 : 16;
          W = n; H = n;
          [...sizeRow.children].forEach((c) => c.classList.toggle('on', c.textContent === n + '×' + n));
          cell = Math.max(2, Math.floor(Math.min(520 / W, 440 / H)));
        }
        const c = document.createElement('canvas');
        c.width = W; c.height = H;
        const k = c.getContext('2d');
        k.imageSmoothingEnabled = false;
        k.drawImage(img, 0, 0, W, H);
        const d = k.getImageData(0, 0, W, H).data;
        px = blank();
        for (let i = 0; i < W * H; i++) {
          if (d[i * 4 + 3] < 40) continue;
          px[i] = '#' + ((1 << 24) | (d[i * 4] << 16) | (d[i * 4 + 1] << 8) | d[i * 4 + 2]).toString(16).slice(1);
        }
        draw();
      };
      img.src = url;
    }
    function toPng() {
      const c = document.createElement('canvas');
      c.width = W; c.height = H;
      const k = c.getContext('2d');
      px.forEach((v, j) => { if (v) { k.fillStyle = v; k.fillRect(j % W, Math.floor(j / W), 1, 1); } });
      return c.toDataURL('image/png');
    }

    let painting = false;
    let last = null;
    let erase = false;
    const cellAt = (e) => {
      const r = canvas.getBoundingClientRect();
      return [Math.floor((e.clientX - r.left) / r.width * W), Math.floor((e.clientY - r.top) / r.height * H)];
    };
    function paintLine(a, b) {
      const v = erase || tool === 'eraser' ? '' : color;
      let [x0, y0] = a; const [x1, y1] = b;
      const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
      let err = dx + dy;
      for (;;) {
        setPx(x0, y0, v);
        if (x0 === x1 && y0 === y1) break;
        const e2 = 2 * err;
        if (e2 >= dy) { err += dy; x0 += sx; }
        if (e2 <= dx) { err += dx; y0 += sy; }
      }
    }
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener('wheel', (e) => { e.preventDefault(); cell = Math.max(1, Math.min(48, cell + (e.deltaY < 0 ? 1 : -1))); draw(); }, { passive: false });
    canvas.addEventListener('mousedown', (e) => {
      const [x, y] = cellAt(e);
      erase = e.button === 2;
      if (tool === 'pick' && !erase) { const v = px[y * W + x]; if (v) setColor(v); return; }
      push();
      if (tool === 'fill' && !erase) { fill(x, y, color); draw(); return; }
      if (tool === 'rect' && !erase) { rectStart = [x, y]; rectEnd = [x, y]; painting = true; draw(); return; }
      painting = true;
      last = [x, y];
      paintLine(last, last);
      draw();
    });
    const onMove = (e) => {
      if (!painting) return;
      const p = cellAt(e);
      if (rectStart) { rectEnd = p; draw(); return; }
      paintLine(last, p);
      last = p;
      draw();
    };
    const onUp = () => {
      if (rectStart && rectEnd) {
        const x0 = Math.min(rectStart[0], rectEnd[0]), y0 = Math.min(rectStart[1], rectEnd[1]);
        const x1 = Math.max(rectStart[0], rectEnd[0]), y1 = Math.max(rectStart[1], rectEnd[1]);
        for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) setPx(x, y, color);
        rectStart = rectEnd = null;
        draw();
      }
      painting = false;
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    const onKey = (e) => {
      if (e.target && e.target.tagName === 'INPUT' && e.target.type !== 'color') return;
      const k = e.key.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && k === 'z') { e.preventDefault(); doUndo(); return; }
      if ((e.ctrlKey || e.metaKey) && k === 'y') { e.preventDefault(); doRedo(); return; }
      if (e.ctrlKey || e.metaKey) return;
      if (k === 'b') setTool('pen');
      if (k === 'e') setTool('eraser');
      if (k === 'g') setTool('fill');
      if (k === 'i') setTool('pick');
      if (k === 'r') setTool('rect');
      if (k === 'escape') close(false);
    };
    document.addEventListener('keydown', onKey, true);
    function close(ok) {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      document.removeEventListener('keydown', onKey, true);
      wrap.remove();
      if (ok) onSave(toPng());
    }
    cancel.addEventListener('click', () => close(false));
    save.addEventListener('click', () => close(true));

    setTool('pen');
    setColor(color);
    if (src && /^data:image\/png;base64,/.test(src) && !opts.isPlaceholder) loadImage(src, false);
    else {
      if (opts.start === 'chest') chestStart(px, W, H, opts.rows || 3);
      draw();
    }
  };
  window.pixelChestStart = function (rows) {
    const w = 176, h = 17 + rows * 18;
    const px = Array.from({ length: w * h }, () => '');
    chestStart(px, w, h, rows);
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const k = c.getContext('2d');
    px.forEach((v, j) => { if (v) { k.fillStyle = v; k.fillRect(j % w, Math.floor(j / w), 1, 1); } });
    return c.toDataURL('image/png');
  };
})();
