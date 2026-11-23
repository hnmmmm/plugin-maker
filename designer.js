(function () {
  const RT = () => window.RichText;
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

  window.defaultGuiLayout = () => ({ rows: 3, title: '&8메뉴', fill: null, slots: {}, bg: null, titleHide: false, titleX: 0, noHover: false });
  window.defaultItemData = () => ({ base: 'BLAZE_ROD', name: '', lore: [], glow: false, unbreakable: false, enchants: [], texture: null, model: null });

  function richButton(value, placeholder, onChange, title) {
    const b = el('button', 'dz-rich');
    const show = (v) => {
      if (RT().strip(v || '')) RT().renderHtml(b, v);
      else { b.textContent = ''; b.append(el('span', 'dz-ph', placeholder)); }
    };
    show(value);
    b.addEventListener('click', () => RT().open(title || '글자 쓰기', value || '', (v) => { value = v; show(v); onChange(v); }));
    return b;
  }

  function tooltip(host, name, lore, extra) {
    host.textContent = '';
    host.className = 'mc-tip';
    const n = el('div', 'mc-tip-name');
    RT().renderHtml(n, name || '', '#FFFFFF');
    host.append(n);
    (extra || []).forEach((t) => { const l = el('div', 'mc-tip-line'); l.textContent = t; l.style.color = '#A8A8A8'; host.append(l); });
    (lore || []).forEach((t) => { const l = el('div', 'mc-tip-line'); RT().renderHtml(l, t, '#AA00AA'); host.append(l); });
  }

  function itemButton(label, onPick, extraItems) {
    const b = el('button', 'dz-pick', label);
    b.addEventListener('click', () => window.openPicker(b, { title: '아이템', items: window.choiceItems('material'), extra: extraItems || [], value: null }, onPick));
    return b;
  }
  const matLabel = (v) => window.choiceLabel('material', v);

  window.openGuiDesigner = function (layoutIn, opts, onSave) {
    const L = Object.assign(window.defaultGuiLayout(), clone(layoutIn || {}));
    L.slots = L.slots || {};
    const customs = opts.customItems || [];
    let sel = null;
    const S = 2;

    const wrap = el('div', 'ask-overlay');
    const box = el('div', 'dz-box');
    const head = el('div', 'dz-head');
    head.append(el('h3', '', '메뉴 꾸미기 · ' + (opts.name || '')), el('p', '', '칸을 눌러서 아이템을 놓고, 누르면 무슨 일이 일어날지 고릅니다. 칸끼리 끌어서 옮길 수 있습니다.'));

    const top = el('div', 'dz-top');
    const titleBtn = richButton(L.title, '메뉴 제목', (v) => { L.title = v; render(); }, '메뉴 제목');
    const rowsBox = el('div', 'dz-chips');
    for (let r = 1; r <= 6; r++) {
      const c = el('button', 'px-chip', r + '줄');
      c.addEventListener('click', () => { setRows(r); });
      rowsBox.append(c);
    }
    const fillBtn = el('button', 'dz-pick');
    const fillLabel = () => { fillBtn.textContent = '빈칸: ' + (L.fill ? matLabel(L.fill) : '비워 두기'); };
    fillBtn.addEventListener('click', () => window.openPicker(fillBtn, { title: '빈칸 채우기', items: window.choiceItems('material'), extra: [{ v: '@none', k: '(비워 두기)', g: '' }], value: L.fill }, (v) => { L.fill = v === '@none' ? null : v; fillLabel(); render(); }));
    fillLabel();
    const bgBtn = el('button', 'dz-pick', '배경 직접 그리기');
    bgBtn.title = '리소스팩으로 메뉴 모양을 바꿉니다 (마크 1.19.3 이상)';
    bgBtn.addEventListener('click', () => {
      window.openPixelEditor(L.bg || window.pixelChestStart(L.rows), (png) => { L.bg = png; render(); },
        { title: '메뉴 배경', width: 176, height: 17 + L.rows * 18, guide: 'gui', rows: L.rows, start: 'chest' });
    });
    const bgClear = el('button', 'dz-pick', '배경 원래대로');
    bgClear.addEventListener('click', () => { L.bg = null; render(); });
    const titleTools = el('div', 'dz-title-tools');
    const hideBtn = el('button', 'px-chip');
    const tLeft = el('button', 'px-chip', '◀');
    const tRight = el('button', 'px-chip', '▶');
    const pos = el('span', 'dz-lbl');
    tLeft.title = '제목을 왼쪽으로 (Shift: 10칸)'; tRight.title = '제목을 오른쪽으로 (Shift: 10칸)';
    const move = (d, e) => { if (!L.bg) { toast('제목 옮기기는 "배경 직접 그리기"를 한 메뉴에서 됩니다 (리소스팩 필요)', 'warn'); return; } L.titleX = Math.max(-8, Math.min(150, (L.titleX || 0) + d * (e.shiftKey ? 10 : 1))); render(); };
    tLeft.addEventListener('click', (e) => move(-1, e));
    tRight.addEventListener('click', (e) => move(1, e));
    hideBtn.addEventListener('click', () => { L.titleHide = !L.titleHide; render(); });
    titleTools.append(hideBtn, tLeft, pos, tRight);
    const syncTitleTools = () => { hideBtn.textContent = L.titleHide ? '제목 보이기' : '제목 숨기기'; hideBtn.classList.toggle('on', !!L.titleHide); pos.textContent = (L.titleX || 0) + 'px'; tLeft.disabled = tRight.disabled = !!L.titleHide; };
    const hoverBtn = el('button', 'px-chip');
    hoverBtn.title = '마우스를 올린 칸이 하얗게 밝아지는 걸 막습니다. 리소스팩으로 바꾸는 거라 마크 1.21.2 이상, 모든 상자 화면에 같이 적용됩니다.';
    hoverBtn.addEventListener('click', () => { L.noHover = !L.noHover; render(); });
    const syncHover = () => { hoverBtn.textContent = L.noHover ? '칸 밝아짐: 끔' : '칸 밝아짐: 켬'; hoverBtn.classList.toggle('on', !!L.noHover); panel.classList.toggle('no-hover', !!L.noHover); };
    top.append(el('span', 'dz-lbl', '제목'), titleBtn, titleTools, hoverBtn, el('span', 'dz-lbl', '크기'), rowsBox, fillBtn, bgBtn, bgClear);

    const main = el('div', 'dz-main');
    const stage = el('div', 'dz-stage');
    const panel = el('div', 'gui-panel');
    const titleEl = el('div', 'gui-title');
    stage.append(panel);
    const bgNote = el('p', 'dz-note', '');
    const left = el('div', 'dz-left');
    left.append(stage, bgNote);

    const side = el('div', 'dz-side');
    main.append(left, side);

    const foot = el('div', 'px-foot');
    const cancel = el('button', 'top-btn', '취소');
    const save = el('button', 'primary top-primary', '저장');
    foot.append(cancel, save);
    box.append(head, top, main, foot);
    wrap.append(box);
    document.body.append(wrap);

    const tip = el('div', 'mc-tip hidden');
    tip.style.position = 'fixed';
    tip.style.zIndex = 300;
    tip.style.pointerEvents = 'none';
    document.body.append(tip);

    function setRows(r) {
      const old = L.rows;
      L.rows = r;
      Object.keys(L.slots).forEach((k) => { if (Number(k) > r * 9) delete L.slots[k]; });
      if (L.bg && old !== r) {
        const img = new Image();
        img.onload = () => {
          const base = new Image();
          base.onload = () => {
            const c = document.createElement('canvas');
            c.width = 176; c.height = 17 + r * 18;
            const k = c.getContext('2d');
            k.drawImage(base, 0, 0);
            k.drawImage(img, 0, 0, 176, Math.min(img.height, c.height), 0, 0, 176, Math.min(img.height, c.height));
            L.bg = c.toDataURL('image/png');
            render();
          };
          base.src = window.pixelChestStart(r);
        };
        img.src = L.bg;
      }
      if (sel && sel > r * 9) sel = null;
      render();
    }

    const customOf = (name) => customs.find((c) => c.name === name);
    function slotView(n) {
      const s = L.slots[n];
      const btn = el('button', 'gui-slot' + (sel === n ? ' sel' : ''));
      const r = Math.floor((n - 1) / 9), c = (n - 1) % 9;
      btn.style.left = ((8 + c * 18) * S - 1) + 'px';
      btn.style.top = ((18 + r * 18) * S - 1) + 'px';
      btn.title = n + '번 칸';
      const item = s || (L.fill ? { mat: L.fill, fillOnly: true } : null);
      if (item) {
        const cu = item.custom ? customOf(item.custom) : null;
        if (cu && cu.texture) {
          const im = document.createElement('img');
          im.src = cu.texture;
          btn.append(im);
        } else {
          if (item.fillOnly) btn.append(el('span', 'gui-fill'));
          else btn.append(el('span', 'gui-slot-txt', (cu ? '★' : '') + String(cu ? cu.name : matLabel(item.mat)).slice(0, 5)));
        }
        if (s && s.amount > 1) btn.append(el('span', 'gui-slot-n', String(s.amount)));
        if (s && s.action && s.action.type && s.action.type !== 'none') btn.append(el('span', 'gui-slot-act', '●'));
      }
      btn.addEventListener('click', () => { sel = n; render(); });
      btn.draggable = !!s;
      btn.addEventListener('dragstart', (e) => { e.dataTransfer.setData('text/plain', String(n)); });
      btn.addEventListener('dragover', (e) => e.preventDefault());
      btn.addEventListener('drop', (e) => {
        e.preventDefault();
        const from = Number(e.dataTransfer.getData('text/plain'));
        if (!from || from === n) return;
        const a = L.slots[from], b2 = L.slots[n];
        if (a) L.slots[n] = a; else delete L.slots[n];
        if (b2) L.slots[from] = b2; else delete L.slots[from];
        sel = n;
        render();
      });
      btn.addEventListener('mouseenter', () => {
        if (!s) return;
        tooltip(tip, s.name || (s.custom ? s.custom : matLabel(s.mat)), s.lore || []);
        tip.classList.remove('hidden');
        const rr = btn.getBoundingClientRect();
        tip.style.left = (rr.right + 8) + 'px';
        tip.style.top = rr.top + 'px';
      });
      btn.addEventListener('mouseleave', () => tip.classList.add('hidden'));
      return btn;
    }

    function render() {
      [...rowsBox.children].forEach((c, i) => c.classList.toggle('on', i + 1 === L.rows));
      const h = 17 + L.rows * 18;
      panel.style.width = 176 * S + 'px';
      panel.style.height = h * S + 'px';
      panel.style.backgroundImage = 'url(' + (L.bg || window.pixelChestStart(L.rows)) + ')';
      panel.textContent = '';
      RT().renderHtml(titleEl, L.title || '', '#404040');
      titleEl.style.transform = 'translateX(' + ((L.bg ? L.titleX || 0 : 0) * S) + 'px)';
      if (!L.titleHide) panel.append(titleEl);
      syncTitleTools();
      syncHover();
      for (let n = 1; n <= L.rows * 9; n++) panel.append(slotView(n));
      bgNote.textContent = L.bg ? '직접 그린 배경은 리소스팩으로 보입니다. 마크 1.19.3 이상 + 서버에 리소스팩을 연결해야 합니다.' : '';
      renderSide();
    }

    function renderSide() {
      side.textContent = '';
      if (!sel) {
        side.append(el('div', 'dz-empty', '왼쪽 상자에서 칸을 눌러주세요.'));
        return;
      }
      const s = L.slots[sel];
      side.append(el('h4', 'dz-h', sel + '번 칸'));
      const customItems = customs.map((c) => ({ v: '@custom:' + c.name, k: '★ ' + c.name, g: '내 커스텀 아이템', img: c.texture || null }));
      const pickBtn = itemButton(s ? (s.custom ? '★ ' + s.custom : matLabel(s.mat)) : '아이템 고르기', (v) => {
        const cur = L.slots[sel] || { amount: 1, name: '', lore: [], action: { type: 'none' } };
        if (v.indexOf('@custom:') === 0) { cur.custom = v.slice(8); const cu = customOf(cur.custom); cur.mat = cu ? cu.base : 'STICK'; }
        else { cur.custom = null; cur.mat = v; }
        L.slots[sel] = cur;
        render();
      }, customItems);
      side.append(el('div', 'dz-lbl', '아이템'), pickBtn);
      if (!s) return;
      const amount = el('input', 'dz-num');
      amount.type = 'number'; amount.min = 1; amount.max = 64; amount.value = s.amount || 1;
      amount.addEventListener('change', () => { s.amount = Math.max(1, Math.min(64, Number(amount.value) || 1)); render(); });
      side.append(el('div', 'dz-lbl', '개수'), amount);
      side.append(el('div', 'dz-lbl', '이름 (안 쓰면 원래 이름)'), richButton(s.name, '이름 쓰기', (v) => { s.name = v; render(); }, '칸 이름'));
      side.append(el('div', 'dz-lbl', '설명 줄'));
      (s.lore || []).forEach((line, i) => {
        const row = el('div', 'dz-row');
        row.append(richButton(line, '설명', (v) => { s.lore[i] = v; render(); }, '설명 줄'));
        const x = el('button', 'dz-x', '✕');
        x.addEventListener('click', () => { s.lore.splice(i, 1); render(); });
        row.append(x);
        side.append(row);
      });
      const addLore = el('button', 'dz-add', '＋ 설명 줄 더하기');
      addLore.addEventListener('click', () => { s.lore = (s.lore || []).concat(['&7']); render(); });
      side.append(addLore);

      const A = s.action || (s.action = { type: 'none' });
      side.append(el('div', 'dz-lbl', '누르면'));
      const sel2 = document.createElement('select');
      sel2.className = 'dz-select';
      [['none', '아무것도 안 합니다'], ['close', '메뉴 닫기'], ['menu', '다른 메뉴 열기'], ['cmd', '명령어 실행 (누른 사람이)'], ['console', '서버 명령어 실행'],
        ['msg', '메시지 보내기'], ['give', '이 아이템 주기'], ['buy', '돈 내고 이 아이템 사기'], ['tp', '서버 위치로 보내기']].forEach(([v, k]) => {
        const o = document.createElement('option'); o.value = v; o.textContent = k; sel2.append(o);
      });
      sel2.value = A.type || 'none';
      sel2.addEventListener('change', () => { s.action = { type: sel2.value, close: A.close }; render(); });
      side.append(sel2);
      const field = (label, key, ph, type) => {
        const i = el('input', type === 'number' ? 'dz-num' : 'dz-text');
        if (type === 'number') i.type = 'number';
        i.placeholder = ph || '';
        i.value = A[key] == null ? '' : A[key];
        i.addEventListener('change', () => { A[key] = type === 'number' ? Number(i.value) || 0 : i.value; render(); });
        side.append(el('div', 'dz-lbl', label), i);
      };
      if (A.type === 'menu') {
        const others = (opts.menus || []).filter((m) => m !== opts.name);
        if (others.length) {
          const ms = document.createElement('select');
          ms.className = 'dz-select';
          others.forEach((m) => { const o = document.createElement('option'); o.value = m; o.textContent = m; ms.append(o); });
          if (!A.menu) A.menu = others[0];
          ms.value = A.menu;
          ms.addEventListener('change', () => { A.menu = ms.value; });
          side.append(el('div', 'dz-lbl', '열 메뉴'), ms);
        } else field('열 메뉴 이름', 'menu', '다른 메뉴를 먼저 만듭니다');
      }
      if (A.type === 'cmd') field('명령어 (/ 없이)', 'cmd', 'spawn');
      if (A.type === 'console') field('서버 명령어 ({이름} = 누른 사람)', 'cmd', 'give {이름} diamond 1');
      if (A.type === 'msg') { side.append(el('div', 'dz-lbl', '보낼 메시지')); side.append(richButton(A.msg, '메시지', (v) => { A.msg = v; }, '보낼 메시지')); }
      if (A.type === 'buy') { field('가격', 'price', '100', 'number'); field('돈 저장값 이름', 'var', '돈'); }
      if (A.type === 'tp') field('서버 위치 이름 (/setwarp 로 저장한 것)', 'loc', '스폰');
      if (A.type !== 'none' && A.type !== 'close' && A.type !== 'menu') {
        const lab = el('label', 'dz-check');
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = !!A.close;
        cb.addEventListener('change', () => { A.close = cb.checked; });
        lab.append(cb, el('span', '', '누른 다음 메뉴 닫기'));
        side.append(lab);
      }
      if (opts.onMakeBlock) {
        const mk = el('button', 'dz-add', '블록으로 직접 만들기 (더 복잡한 일)');
        mk.title = '"메뉴의 N번 칸을 눌렀을 때" 블록을 만들어줍니다. 그 안에 아무 블록이나 넣을 수 있습니다.';
        mk.addEventListener('click', () => { const n = sel; finish(true); opts.onMakeBlock(n); });
        side.append(mk);
      }
      const del = el('button', 'dz-del', '이 칸 비우기');
      del.addEventListener('click', () => { delete L.slots[sel]; render(); });
      side.append(del);
    }

    let done = false;
    function finish(ok) {
      if (done) return;
      done = true;
      tip.remove();
      wrap.remove();
      if (ok) onSave(L);
    }
    cancel.addEventListener('click', () => finish(false));
    save.addEventListener('click', () => finish(true));
    render();
  };

  window.openItemDesigner = function (dataIn, opts, onSave) {
    const D = Object.assign(window.defaultItemData(), clone(dataIn || {}));
    if (!D.name && opts.name) D.name = '&e' + opts.name;
    const wrap = el('div', 'ask-overlay');
    const box = el('div', 'dz-box dz-item');
    const head = el('div', 'dz-head');
    head.append(el('h3', '', '커스텀 아이템 꾸미기 · ' + (opts.name || '')), el('p', '', '그림을 그리고 이름·설명을 정합니다. 오른쪽이 게임에서 보일 모양입니다.'));
    const main = el('div', 'dz-main');
    const left = el('div', 'dz-left dz-item-left');
    const side = el('div', 'dz-side');
    const preview = el('div', '');
    const right = el('div', 'dz-right');
    main.append(left, side, right);
    const foot = el('div', 'px-foot');
    const cancel = el('button', 'top-btn', '취소');
    const save = el('button', 'primary top-primary', '저장');
    foot.append(cancel, save);
    box.append(head, main, foot);
    wrap.append(box);
    document.body.append(wrap);

    const enchName = (k) => window.choiceLabel('enchant', k);
    function render() {
      left.textContent = '';
      const pic = el('button', 'dz-texture');
      if (D.texture) { const im = document.createElement('img'); im.src = D.texture; pic.append(im); }
      else pic.append(el('span', 'dz-ph', '눌러서\n그림 그리기'));
      pic.title = '그림을 그리면 리소스팩에 들어갑니다';
      pic.addEventListener('click', () => window.openPixelEditor(D.texture, (png) => { D.texture = png; render(); }, { title: opts.name || '아이템' }));
      left.append(pic);
      if (D.texture) {
        const clr = el('button', 'dz-add', '그림 지우기 (원래 모양)');
        clr.addEventListener('click', () => { D.texture = null; render(); });
        left.append(clr);
      }
      left.append(el('div', 'dz-lbl', '기본 아이템 (그림이 없으면 이 모양)'), itemButton(matLabel(D.base), (v) => { D.base = v; render(); }));

      side.textContent = '';
      side.append(el('div', 'dz-lbl', '이름'), richButton(D.name, '이름 쓰기', (v) => { D.name = v; render(); }, '아이템 이름'));
      side.append(el('div', 'dz-lbl', '설명 줄'));
      D.lore.forEach((line, i) => {
        const row = el('div', 'dz-row');
        row.append(richButton(line, '설명', (v) => { D.lore[i] = v; render(); }, '설명 줄'));
        const x = el('button', 'dz-x', '✕');
        x.addEventListener('click', () => { D.lore.splice(i, 1); render(); });
        row.append(x);
        side.append(row);
      });
      const add = el('button', 'dz-add', '＋ 설명 줄 더하기');
      add.addEventListener('click', () => { D.lore.push('&7'); render(); });
      side.append(add);
      const check = (label, key) => {
        const lab = el('label', 'dz-check');
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = !!D[key];
        cb.addEventListener('change', () => { D[key] = cb.checked; render(); });
        lab.append(cb, el('span', '', label));
        side.append(lab);
      };
      check('반짝이게 (마법 부여된 것처럼)', 'glow');
      check('부서지지 않게', 'unbreakable');
      side.append(el('div', 'dz-lbl', '마법'));
      D.enchants.forEach((en, i) => {
        const row = el('div', 'dz-row');
        const b = el('button', 'dz-pick', enchName(en.e));
        b.addEventListener('click', () => window.openPicker(b, { title: '마법', items: window.choiceItems('enchant'), value: en.e }, (v) => { en.e = v; render(); }));
        const lv = el('input', 'dz-num small');
        lv.type = 'number'; lv.min = 1; lv.max = 255; lv.value = en.lv;
        lv.addEventListener('change', () => { en.lv = Math.max(1, Math.min(255, Number(lv.value) || 1)); render(); });
        const x = el('button', 'dz-x', '✕');
        x.addEventListener('click', () => { D.enchants.splice(i, 1); render(); });
        row.append(b, lv, x);
        side.append(row);
      });
      const addE = el('button', 'dz-add', '＋ 마법 더하기');
      addE.addEventListener('click', () => { D.enchants.push({ e: 'sharpness', lv: 1 }); render(); });
      side.append(addE);

      right.textContent = '';
      right.append(el('div', 'dz-lbl', '게임에서 보일 모양'));
      const slotPrev = el('div', 'dz-slotprev');
      if (D.texture) { const im = document.createElement('img'); im.src = D.texture; slotPrev.append(im); }
      else slotPrev.append(el('span', 'gui-slot-txt', matLabel(D.base).slice(0, 4)));
      if (D.glow || D.enchants.length) slotPrev.classList.add('glow');
      right.append(slotPrev, preview);
      tooltip(preview, D.name, D.lore, D.glow && !D.enchants.length ? [] : D.enchants.map((en) => enchName(en.e) + ' ' + (ROMAN[en.lv] || en.lv)));
      if (D.unbreakable) preview.append(Object.assign(el('div', 'mc-tip-line', '부서지지 않음'), { style: 'color:#5555FF' }));
    }
    let done = false;
    const finish = (ok) => { if (done) return; done = true; wrap.remove(); if (ok) onSave(D); };
    cancel.addEventListener('click', () => finish(false));
    save.addEventListener('click', () => finish(true));
    render();
  };

  window.guiThumb = function (L) {
    L = Object.assign(window.defaultGuiLayout(), L || {});
    const c = document.createElement('canvas');
    const cw = 5;
    c.width = 9 * cw + 2; c.height = L.rows * cw + 2;
    const k = c.getContext('2d');
    k.fillStyle = L.bg ? '#383838' : '#c6c6c6';
    k.fillRect(0, 0, c.width, c.height);
    for (let n = 1; n <= L.rows * 9; n++) {
      const r = Math.floor((n - 1) / 9), col = (n - 1) % 9;
      const s = L.slots[n];
      k.fillStyle = s ? (s.action && s.action.type !== 'none' ? '#3fd3ad' : '#8ab4f8') : (L.fill ? '#9a9a9a' : '#8b8b8b');
      k.fillRect(1 + col * cw, 1 + r * cw, cw - 1, cw - 1);
    }
    return c.toDataURL('image/png');
  };
  window.itemThumb = function (D) {
    if (D && D.texture) return D.texture;
    const c = document.createElement('canvas');
    c.width = 16; c.height = 16;
    const k = c.getContext('2d');
    k.fillStyle = '#222222'; k.fillRect(0, 0, 16, 16);
    k.fillStyle = '#c4b5fd'; k.fillRect(5, 3, 6, 10); k.fillRect(3, 5, 10, 6);
    return c.toDataURL('image/png');
  };
})();
