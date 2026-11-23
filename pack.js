(function () {
  const NS = 'mypack';
  const pack = { name: '내 리소스팩', packFormat: 34, auto: true, entries: [], overrides: [] };

  const FORMATS = [['1.16.5', 6], ['1.17', 7], ['1.18', 8], ['1.19', 9], ['1.19.3', 12], ['1.19.4', 13], ['1.20', 15], ['1.20.2', 18],
    ['1.20.3', 22], ['1.20.5', 32], ['1.21', 34], ['1.21.2', 42], ['1.21.4', 46]];
  function formatFor(mc) {
    let f = 6;
    FORMATS.forEach(([v, n]) => { if (MC.cmp(mc, v) >= 0) f = n; });
    return f;
  }
  const useItemDefs = () => MC.cmp(MC.version, '1.21.4') >= 0;
  const isHandheld = (b) => /_(sword|pickaxe|axe|shovel|hoe)$/.test(b) || b === 'stick' || b === 'bone' || b === 'blaze_rod' || b === 'breeze_rod' || b === 'mace';
  const isBlockItem = (b) => {
    const T = window.SLOT_TYPES && window.SLOT_TYPES.material;
    const it = T && T.items.find((x) => String(x.v).toLowerCase() === b);
    return !!(it && it.g === '블록');
  };
  let seq = 0;
  const nid = () => 'r' + Date.now().toString(36) + (seq++);
  const NAME_RE = /^[a-z0-9_]+$/;

  const CRC_T = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c >>> 0;
    }
    return t;
  })();
  function crc32(bytes) {
    let c = 0xFFFFFFFF;
    for (let i = 0; i < bytes.length; i++) c = CRC_T[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }
  function makeZip(files) {
    const enc = new TextEncoder();
    const locals = [];
    const centrals = [];
    let offset = 0;
    files.forEach((f) => {
      const name = enc.encode(f.path);
      const crc = crc32(f.data);
      const size = f.data.length;
      const lh = new DataView(new ArrayBuffer(30));
      lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true);
      lh.setUint16(8, 0, true); lh.setUint16(10, 0, true); lh.setUint16(12, 0x21, true);
      lh.setUint32(14, crc, true); lh.setUint32(18, size, true); lh.setUint32(22, size, true);
      lh.setUint16(26, name.length, true); lh.setUint16(28, 0, true);
      locals.push(new Uint8Array(lh.buffer), name, f.data);
      const ch = new DataView(new ArrayBuffer(46));
      ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true);
      ch.setUint16(8, 0x0800, true); ch.setUint16(10, 0, true); ch.setUint16(12, 0, true);
      ch.setUint16(14, 0x21, true); ch.setUint32(16, crc, true); ch.setUint32(20, size, true);
      ch.setUint32(24, size, true); ch.setUint16(28, name.length, true);
      ch.setUint32(42, offset, true);
      centrals.push(new Uint8Array(ch.buffer), name);
      offset += 30 + name.length + size;
    });
    const cdSize = centrals.reduce((n, p) => n + p.length, 0);
    const end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true);
    end.setUint32(12, cdSize, true); end.setUint32(16, offset, true);
    const parts = locals.concat(centrals, [new Uint8Array(end.buffer)]);
    const total = parts.reduce((n, p) => n + p.length, 0);
    const out = new Uint8Array(total);
    let at = 0;
    parts.forEach((p) => { out.set(p, at); at += p.length; });
    return out;
  }
  const b64 = (u8) => {
    let s = '';
    for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
    return btoa(s);
  };
  const dataUrlBytes = (url) => Uint8Array.from(atob(url.split(',')[1]), (c) => c.charCodeAt(0));

  function colorPng(hex) {
    const c = document.createElement('canvas');
    c.width = 16; c.height = 16;
    const x = c.getContext('2d');
    x.fillStyle = hex;
    x.fillRect(0, 0, 16, 16);
    x.fillStyle = 'rgba(0,0,0,.25)';
    x.fillRect(0, 0, 16, 1); x.fillRect(0, 15, 16, 1); x.fillRect(0, 0, 1, 16); x.fillRect(15, 0, 1, 16);
    return dataUrlBytes(c.toDataURL('image/png'));
  }

  const drawn = () => (window.lastTextures || []).map((t) => ({
    name: 'c_' + t.key, label: t.name, base: String(t.base || 'STICK').toLowerCase(), cmd: t.cmd, texture: t.png, drawn: true
  }));
  const allEntries = () => pack.entries.concat(drawn());

  const ITEM_TEX = { CLOCK: 'clock_00', COMPASS: 'compass_00', RECOVERY_COMPASS: 'recovery_compass_00', CROSSBOW: 'crossbow_standby', BOW: 'bow', POTION: 'potion' };
  const SKIP_GROUPS = new Set(['블록', '메뉴 장식']);
  const texOf = (p) => { const m = /^assets\/minecraft\/textures\/(.+)\.png$/.exec(p || ''); return m ? m[1] : null; };
  const FACE_NAME = { top: '윗면', side: '옆면', front: '앞면', bottom: '아랫면', end: '끝면', inner: '안쪽', on: '켜짐' };
  const fullItems = () => {
    const full = window.MCCAT && window.MCCAT.get('material');
    if (!full) return null;
    const seen = new Set();
    const out = [];
    full.forEach((it) => {
      if (!it.t || !/^item\//.test(it.t) || seen.has(it.t)) return;
      seen.add(it.t);
      out.push({ v: 'item:' + it.t.slice(5), k: it.k, g: it.g, img: it.img, path: 'assets/minecraft/textures/' + it.t + '.png', w: 16, h: 16 });
    });
    return out;
  };
  const fullBlocks = () => {
    const full = window.MCCAT && window.MCCAT.get('material');
    if (!full) return null;
    const names = new Map(full.map((it) => [it.v.toLowerCase(), it.k]));
    return Object.keys(window.MCCAT.textures).filter((t) => /^block\//.test(t)).sort().map((t) => {
      const id = t.slice(6);
      const m = /^(.*)_(top|side|front|bottom|end|inner|on)$/.exec(id);
      const k = names.get(id) || (m && names.get(m[1]) ? names.get(m[1]) + ' (' + FACE_NAME[m[2]] + ')' : id);
      return { v: 'block:' + id, k, g: '블록', img: window.MCCAT.texture(t), path: 'assets/minecraft/textures/' + t + '.png', w: 16, h: 16 };
    });
  };
  const itemCatalog = () => {
    const full = fullItems();
    if (full) return full;
    const T = window.SLOT_TYPES && window.SLOT_TYPES.material;
    const seen = new Set();
    const out = [];
    (T ? T.items : []).forEach((it) => {
      if (SKIP_GROUPS.has(it.g) || /_ORE$|ANCIENT_DEBRIS/.test(it.v) || seen.has(it.v) || (window.MC && !window.MC.ok(it))) return;
      seen.add(it.v);
      const tex = ITEM_TEX[it.v] || it.v.toLowerCase();
      out.push({ v: 'item:' + tex, k: it.k, g: it.g, path: 'assets/minecraft/textures/item/' + tex + '.png', w: 16, h: 16 });
    });
    return out;
  };
  const B = (tex, k, g) => ({ v: 'block:' + tex, k, g: g || '블록', path: 'assets/minecraft/textures/block/' + tex + '.png', w: 16, h: 16 });
  const BLOCKS = [
    B('stone', '돌'), B('cobblestone', '조약돌'), B('dirt', '흙'), B('grass_block_top', '잔디 블록 (윗면)', '잔디·나무'), B('grass_block_side', '잔디 블록 (옆면)', '잔디·나무'),
    B('sand', '모래'), B('gravel', '자갈'), B('oak_planks', '참나무 판자', '잔디·나무'), B('oak_log', '참나무 원목 (옆면)', '잔디·나무'), B('oak_log_top', '참나무 원목 (윗면)', '잔디·나무'),
    B('oak_leaves', '참나무 잎', '잔디·나무'), B('glass', '유리'), B('bricks', '벽돌'), B('stone_bricks', '석재 벽돌'), B('obsidian', '흑요석'), B('bedrock', '기반암'),
    B('netherrack', '네더랙', '네더·엔드'), B('end_stone', '엔드 돌', '네더·엔드'), B('glowstone', '발광석'), B('sea_lantern', '바다 랜턴'), B('white_wool', '흰색 양털'),
    B('snow', '눈'), B('ice', '얼음'), B('bookshelf', '책장 (옆면)', '쓰는 블록'), B('crafting_table_top', '제작대 (윗면)', '쓰는 블록'), B('crafting_table_front', '제작대 (앞면)', '쓰는 블록'),
    B('crafting_table_side', '제작대 (옆면)', '쓰는 블록'), B('furnace_front', '화로 (앞면)', '쓰는 블록'), B('furnace_side', '화로 (옆면)', '쓰는 블록'), B('furnace_top', '화로 (윗면)', '쓰는 블록'),
    B('tnt_side', 'TNT (옆면)', '쓰는 블록'), B('tnt_top', 'TNT (윗면)', '쓰는 블록'), B('diamond_ore', '다이아몬드 광석', '광석·광물 블록'), B('iron_ore', '철 광석', '광석·광물 블록'),
    B('gold_ore', '금 광석', '광석·광물 블록'), B('coal_ore', '석탄 광석', '광석·광물 블록'), B('emerald_ore', '에메랄드 광석', '광석·광물 블록'), B('redstone_ore', '레드스톤 광석', '광석·광물 블록'),
    B('diamond_block', '다이아몬드 블록', '광석·광물 블록'), B('gold_block', '금 블록', '광석·광물 블록'), B('iron_block', '철 블록', '광석·광물 블록'), B('emerald_block', '에메랄드 블록', '광석·광물 블록'),
    B('coal_block', '석탄 블록', '광석·광물 블록')
  ];
  const M = (path, k, w, h, guide, g) => ({ v: 'entity:' + path, k, g: g || '몹', path: 'assets/minecraft/textures/entity/' + path + '.png', w, h, guide });
  const MOBS = [
    M('zombie/zombie', '좀비', 64, 64, 'humanoid', '사람 모양 몹'), M('zombie/husk', '허스크', 64, 64, 'humanoid', '사람 모양 몹'), M('zombie/drowned', '드라운드', 64, 64, 'humanoid', '사람 모양 몹'),
    M('piglin/piglin', '피글린', 64, 64, 'humanoid', '사람 모양 몹'), M('skeleton/skeleton', '스켈레톤', 64, 32, 'humanoid32', '사람 모양 몹'), M('skeleton/stray', '스트레이', 64, 32, 'humanoid32', '사람 모양 몹'),
    M('skeleton/wither_skeleton', '위더 스켈레톤', 64, 32, 'humanoid32', '사람 모양 몹'), M('enderman/enderman', '엔더맨', 64, 32, null, '사람 모양 몹'),
    M('creeper/creeper', '크리퍼', 64, 32), M('spider/spider', '거미', 64, 32), M('spider/cave_spider', '동굴 거미', 64, 32), M('slime/slime', '슬라임', 64, 32),
    M('blaze', '블레이즈', 64, 32), M('witch', '마녀', 64, 128), M('phantom', '팬텀', 64, 64), M('iron_golem/iron_golem', '철 골렘', 128, 128),
    M('villager/villager', '주민', 64, 64, null, '동물·주민'), M('pig/pig', '돼지', 64, 32, null, '동물·주민'), M('cow/cow', '소', 64, 32, null, '동물·주민'),
    M('sheep/sheep', '양', 64, 32, null, '동물·주민'), M('chicken', '닭', 64, 32, null, '동물·주민'), M('wolf/wolf', '늑대', 64, 32, null, '동물·주민')
  ];
  const G = (path, k, w, h, since, until) => ({ v: 'gui:' + path, k, g: '화면', path: 'assets/minecraft/textures/gui/' + path + '.png', w, h, since, until });
  const guiCatalog = () => [
    G('container/generic_54', '상자 화면 (큰 상자·메뉴)', 256, 256), G('container/inventory', '내 인벤토리 화면', 256, 256),
    G('container/crafting_table', '제작대 화면', 256, 256), G('container/furnace', '화로 화면', 256, 256),
    G('sprites/hud/hotbar', '핫바', 182, 22, '1.20.2'), G('sprites/hud/hotbar_selection', '핫바 고른 칸', 24, 23, '1.20.2'),
    G('sprites/hud/heart/full', '하트 (가득)', 9, 9, '1.20.2'), G('sprites/hud/heart/container', '하트 (빈 칸)', 9, 9, '1.20.2'),
    G('sprites/hud/food_full', '배고픔 (가득)', 9, 9, '1.20.2'), G('sprites/hud/crosshair', '가운데 조준점', 15, 15, '1.20.2'),
    G('sprites/hud/experience_bar_progress', '경험치 막대 (찬 부분)', 182, 5, '1.20.2'),
    G('widgets', '핫바 · 버튼 (한 장에 모아 둔 그림)', 256, 256, null, '1.20.2'), G('icons', '하트 · 배고픔 · 조준점 (한 장에 모아 둔 그림)', 256, 256, null, '1.20.2')
  ].filter((g) => (!g.since || MC.cmp(MC.version, g.since) >= 0) && (!g.until || MC.cmp(MC.version, g.until) < 0));
  const CATALOG = { item: itemCatalog, block: () => fullBlocks() || BLOCKS, entity: () => MOBS, gui: guiCatalog };

  const guiBgs = () => window.lastGuiBackgrounds || [];
  const anything = () => allEntries().length + pack.overrides.length + guiBgs().length + (window.lastGuiNoHover ? 1 : 0);

  function check() {
    const seen = new Set();
    const names = new Set();
    for (const e of allEntries()) {
      if (!NAME_RE.test(e.name)) return '"' + (e.name || '이름 없음') + '" : 이름은 영문 소문자·숫자·_ 만 쓸 수 있습니다.';
      if (!e.base) return '"' + e.name + '" : 바탕 아이템을 골라주세요.';
      if (!Number.isInteger(e.cmd) || e.cmd < 1) return '"' + e.name + '" : 번호는 1 이상의 정수여야 합니다.';
      if (names.has(e.name)) return '이름 "' + e.name + '" 이 두 번 있습니다.';
      if (seen.has(e.base + ':' + e.cmd)) return '같은 아이템(' + e.base + ')에 번호 ' + e.cmd + ' 가 두 번 있습니다.';
      names.add(e.name); seen.add(e.base + ':' + e.cmd);
    }
    if (!Number.isInteger(pack.packFormat) || pack.packFormat < 1) return 'pack_format 은 1 이상의 숫자여야 합니다.';
    if (!useItemDefs()) {
      const blk = allEntries().find((e) => isBlockItem(e.base));
      if (blk) return '"' + blk.name + '" : 블록(' + blk.base + ')은 마크 1.21.4 부터만 그림을 바꿀 수 있습니다. 막대기·다이아몬드 같은 아이템을 골라주세요.';
    }
    const bad = (u) => { const b = dataUrlBytes(u); return b[0] !== 0x89 || b[1] !== 0x50 || b[2] !== 0x4e || b[3] !== 0x47; };
    for (const e of allEntries()) if (e.texture && bad(e.texture)) return '"' + e.name + '" : PNG 그림이 아닙니다. 그림을 다시 골라주세요.';
    for (const o of pack.overrides) {
      if (!/^assets\/[a-z0-9_.-]+\/[a-z0-9_./-]+\.png$/.test(o.path)) return '"' + o.label + '" : 파일 경로가 이상합니다 (' + o.path + ')';
      if (o.png && bad(o.png)) return '"' + o.label + '" : PNG 그림이 아닙니다.';
    }
    return '';
  }
  function buildFiles() {
    const J = (o) => new TextEncoder().encode(JSON.stringify(o, null, 2) + '\n');
    const files = [{ path: 'pack.mcmeta', data: J({ pack: { pack_format: pack.packFormat, description: pack.name || '리소스팩' } }) }];
    const byBase = {};
    const list = allEntries();
    list.forEach((e) => { (byBase[e.base.toLowerCase()] = byBase[e.base.toLowerCase()] || []).push(e); });
    Object.keys(byBase).forEach((base) => {
      if (useItemDefs()) {
        const fallback = isBlockItem(base) ? 'minecraft:block/' + base : 'minecraft:item/' + base;
        files.push({
          path: 'assets/minecraft/items/' + base + '.json',
          data: J({ model: { type: 'minecraft:range_dispatch', property: 'minecraft:custom_model_data',
            entries: byBase[base].slice().sort((a, b) => a.cmd - b.cmd).map((e) => ({ threshold: e.cmd, model: { type: 'minecraft:model', model: NS + ':item/' + e.name } })),
            fallback: { type: 'minecraft:model', model: fallback } } })
        });
        return;
      }
      files.push({
        path: 'assets/minecraft/models/item/' + base + '.json',
        data: J({ parent: isHandheld(base) ? 'item/handheld' : 'item/generated', textures: { layer0: 'item/' + base },
          overrides: byBase[base].map((e) => ({ predicate: { custom_model_data: e.cmd }, model: NS + ':item/' + e.name })) })
      });
    });
    list.forEach((e) => {
      files.push({ path: 'assets/' + NS + '/models/item/' + e.name + '.json', data: J({ parent: isHandheld(e.base) ? 'item/handheld' : 'item/generated', textures: { layer0: NS + ':item/' + e.name } }) });
      files.push({ path: 'assets/' + NS + '/textures/item/' + e.name + '.png', data: e.texture ? dataUrlBytes(e.texture) : colorPng(e.color || '#6ee7c8') });
    });
    const used = new Set();
    pack.overrides.forEach((o) => { if (o.png && !used.has(o.path)) { used.add(o.path); files.push({ path: o.path, data: dataUrlBytes(o.png) }); } });
    if (window.lastGuiNoHover) {
      ['slot_highlight_back', 'slot_highlight_front'].forEach((n) => files.push({ path: 'assets/minecraft/textures/gui/sprites/container/' + n + '.png', data: dataUrlBytes(clearPng(24, 24)) }));
    }
    const bgs = guiBgs();
    if (bgs.length) {
      const advances = { '': -8, '': -169 };
      for (let i = 0; i < 8; i++) { advances[String.fromCharCode(0xF811 + i)] = 1 << i; advances[String.fromCharCode(0xF821 + i)] = -(1 << i); }
      const providers = [{ type: 'space', advances }];
      bgs.forEach((g) => {
        providers.push({ type: 'bitmap', file: 'pluginmaker:gui/menu_' + g.index + '.png', ascent: 13, height: g.height, chars: [g.char] });
        files.push({ path: 'assets/pluginmaker/textures/gui/menu_' + g.index + '.png', data: dataUrlBytes(g.png) });
      });
      files.push({ path: 'assets/minecraft/font/default.json', data: J({ providers }) });
    }
    return files;
  }
  function clearPng(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c.toDataURL('image/png'); }
  window.packZipBase64 = () => b64(makeZip(buildFiles()));
  window.packFiles = () => buildFiles().map((f) => f.path);
  window.packForBuild = () => {
    syncFormat();
    if (!anything()) return null;
    const err = check();
    if (err) return { error: err };
    return { base64: window.packZipBase64(), count: anything() };
  };

  const overlay = el('div', 'overlay hidden');
  overlay.id = 'pack-modal';
  const box = el('div', 'pack-box');
  overlay.append(box);
  document.body.append(overlay);
  let tab = 'auto';
  const TABS = [['auto', '그린 아이템 · 메뉴 배경'], ['item', '아이템 그림'], ['block', '블록 그림'], ['entity', '몹 그림'], ['gui', '화면(GUI) 그림'], ['path', '직접 경로']];
  const KIND_NAME = { item: '아이템', block: '블록', entity: '몹', gui: '화면', path: '파일' };

  function markDirty() { setDirty(true); }
  function thumb(src) {
    const im = document.createElement('img');
    im.className = 'rp-thumb';
    if (src) im.src = src;
    return im;
  }
  function drawOverride(target, existing) {
    const original = window.MCCAT && window.MCCAT.texture(texOf(target.path));
    window.openPixelEditor(existing ? existing.png : original, (png) => {
      const o = existing || { kind: target.kind, key: target.v, label: target.k, path: target.path, w: target.w, h: target.h, guide: target.guide || null };
      o.png = png;
      if (!existing) {
        pack.overrides = pack.overrides.filter((x) => x.path !== o.path);
        pack.overrides.push(o);
      }
      markDirty();
      render();
    }, { title: target.k || target.label, width: target.w, height: target.h, guide: target.guide || null });
  }

  function render() {
    box.textContent = '';
    const head = el('div', 'pack-head');
    head.append(el('div', 'pack-title', '리소스팩 만들기'));
    const close = el('button', 'ghost', '닫기');
    close.addEventListener('click', () => overlay.classList.add('hidden'));
    head.append(close);
    const intro = el('p', 'rp-intro', '아이템·블록·몹·화면의 그림을 직접 그려서 바꿉니다. 블록에서 그린 커스텀 아이템과 메뉴 배경은 알아서 들어갑니다. "플러그인 만들기"를 하면 resourcepack.zip 도 같이 만들어집니다. 이 zip 을 인터넷에 올리고 server.properties 의 resource-pack 에 주소를 넣거나 "리소스팩 보내기" 블록을 쓰면 모두에게 보입니다.');
    const meta = el('div', 'pack-meta');
    const nm = el('input');
    nm.value = pack.name;
    nm.placeholder = '리소스팩 이름';
    nm.addEventListener('change', () => { pack.name = nm.value.trim() || '내 리소스팩'; markDirty(); });
    meta.append(lbl('이름', nm), el('span', 'pk-hint', '마크 ' + MC.version + ' 형식 (pack_format ' + pack.packFormat + ')'));
    const tabs = el('div', 'rp-tabs');
    TABS.forEach(([id, name]) => {
      const count = id === 'auto' ? drawn().length + guiBgs().length : pack.overrides.filter((o) => o.kind === id).length;
      const b = el('button', 'tpl-tab' + (tab === id ? ' on' : ''), name + (count ? ' ' + count : ''));
      b.addEventListener('click', () => { tab = id; render(); });
      tabs.append(b);
    });
    if (pack.entries.length) {
      const b = el('button', 'tpl-tab' + (tab === 'legacy' ? ' on' : ''), '예전 방식 ' + pack.entries.length);
      b.addEventListener('click', () => { tab = 'legacy'; render(); });
      tabs.append(b);
    }
    const body = el('div', 'rp-list');
    if (tab === 'auto') {
      drawn().forEach((d) => {
        const row = el('div', 'rp-row');
        row.append(thumb(d.texture), el('b', '', d.label), el('span', 'pk-hint', '커스텀 아이템 · ' + d.base + ' · 번호 ' + d.cmd));
        body.append(row);
      });
      guiBgs().forEach((g) => {
        const row = el('div', 'rp-row');
        row.append(thumb(g.png), el('b', '', (g.index + 1) + '번째 메뉴 배경'), el('span', 'pk-hint', '메뉴 디자이너에서 그린 배경 · 마크 1.19.3 이상'));
        body.append(row);
      });
      if (!drawn().length && !guiBgs().length) body.append(el('div', 'pk-empty', '"커스텀 아이템" 디자이너에서 그림을 그리거나, 메뉴 디자이너에서 배경을 그리면 여기에 자동으로 들어옵니다.'));
    } else if (tab === 'legacy') {
      body.append(el('p', 'rp-intro', '예전에 번호로 넣은 아이템입니다. 그대로 들어갑니다. 새로 만들 땐 "커스텀 아이템" 디자이너를 씁니다.'));
      pack.entries.forEach((e, i) => {
        const row = el('div', 'rp-row');
        row.append(thumb(e.texture), el('b', '', e.name), el('span', 'pk-hint', e.base + ' · 번호 ' + e.cmd), el('div', 'spacer'));
        const del = el('button', 'ghost', '삭제');
        del.addEventListener('click', () => { pack.entries.splice(i, 1); markDirty(); render(); });
        row.append(del);
        body.append(row);
      });
    } else {
      const addRow = el('div', 'rp-row');
      if (tab === 'path') {
        const p = el('input', 'dz-text');
        p.placeholder = 'assets/minecraft/textures/item/apple.png';
        const w = el('input', 'dz-num small'); w.type = 'number'; w.value = 16;
        const h = el('input', 'dz-num small'); h.type = 'number'; h.value = 16;
        const go = el('button', 'outline', '그리기');
        go.addEventListener('click', () => {
          const path = p.value.trim().toLowerCase();
          if (!/^assets\/[a-z0-9_.-]+\/[a-z0-9_./-]+\.png$/.test(path)) { toast('assets/... .png 모양의 경로를 써주세요', 'warn'); return; }
          drawOverride({ kind: 'path', v: 'path:' + path, k: path.split('/').pop(), path, w: Math.max(1, Math.min(512, Number(w.value) || 16)), h: Math.max(1, Math.min(512, Number(h.value) || 16)) });
        });
        addRow.append(p, w, el('span', 'pk-hint', '×'), h, go);
      } else {
        const add = el('button', 'outline', '＋ 바꿀 ' + KIND_NAME[tab] + ' 고르기');
        add.addEventListener('click', () => {
          const items = CATALOG[tab]().map((c) => Object.assign({ kind: tab, img: window.MCCAT ? window.MCCAT.texture(texOf(c.path)) : null }, c));
          window.openPicker(add, { title: KIND_NAME[tab], items, value: null }, (v) => {
            const target = items.find((c) => c.v === v);
            if (target) drawOverride(target, pack.overrides.find((o) => o.path === target.path));
          });
        });
        addRow.append(add, el('span', 'pk-hint', tab === 'block' ? '블록은 면마다 그림이 따로 있습니다 (윗면·옆면).' : tab === 'entity' ? '안내선으로 머리·몸·팔 자리를 보여줍니다. 원래 그림이 있으면 그 위에서 고칩니다.' : tab === 'gui' ? '마크 화면 그림 파일 전체를 바꿉니다. 크기가 커서 PNG 를 불러와 고치는 게 편합니다.' : '그린 그림이 원래 아이템 그림 대신 보입니다.'));
      }
      body.append(addRow);
      pack.overrides.filter((o) => o.kind === tab).forEach((o) => {
        const row = el('div', 'rp-row');
        row.append(thumb(o.png), el('b', '', o.label), el('span', 'pk-hint', o.w + '×' + o.h), el('div', 'spacer'));
        const redraw = el('button', 'ghost', '다시 그리기');
        redraw.addEventListener('click', () => drawOverride(o, o));
        const del = el('button', 'ghost', '원래대로');
        del.addEventListener('click', () => { pack.overrides = pack.overrides.filter((x) => x !== o); markDirty(); render(); });
        row.append(redraw, del);
        body.append(row);
      });
    }
    const foot = el('div', 'pack-foot');
    const save = el('button', 'primary', 'zip 파일로 저장');
    save.addEventListener('click', async () => {
      syncFormat();
      if (!anything()) { toast('아직 바꾼 그림이 없습니다', 'warn'); return; }
      const err = check();
      if (err) { notice(err, null); return; }
      const r = await window.api.saveBinary(pack.name || 'resourcepack', window.packZipBase64());
      if (r && r.ok) toast('리소스팩을 저장했습니다');
      else if (r && r.error) notice('저장하지 못했습니다: ' + r.error, null);
    });
    foot.append(el('div', 'spacer'), save);
    box.append(head, intro, meta, tabs, body, foot);
  }
  function lbl(text, node) {
    const w = el('label', 'pk-lbl');
    w.append(el('span', '', text), node);
    return w;
  }

  function syncFormat() { if (pack.auto) pack.packFormat = formatFor(MC.version); }
  function open() { syncFormat(); render(); overlay.classList.remove('hidden'); }
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.classList.add('hidden'); });
  const btn = document.getElementById('btn-pack');
  if (btn) btn.addEventListener('click', open);

  window.packState = () => JSON.parse(JSON.stringify(pack));
  window.packLoad = (p) => {
    pack.name = (p && p.name) || '내 리소스팩';
    pack.packFormat = (p && p.packFormat) || 34;
    pack.auto = !(p && p.auto === false);
    pack.entries = (p && Array.isArray(p.entries) ? p.entries : []).map((e) => ({
      id: e.id || nid(), name: String(e.name || ''), base: String(e.base || ''), cmd: Number(e.cmd) || 1,
      color: e.color || '#6ee7c8', texture: e.texture || null
    }));
    pack.overrides = (p && Array.isArray(p.overrides) ? p.overrides : []).filter((o) => o && typeof o.path === 'string' && typeof o.png === 'string');
  };
  window.packOpen = open;
})();
