(function () {
  const CAT = { ver: null, data: null, loading: null, index: {}, textures: {}, listeners: [] };
  window.MCCAT = CAT;

  CAT.get = (type) => (CAT.data && CAT.ver === (window.MC && MC.version) && CAT.data[type] && CAT.data[type].length ? CAT.data[type] : null);
  CAT.find = (type, v) => {
    const list = CAT.get(type);
    if (!list) return null;
    let ix = CAT.index[type];
    if (!ix) { ix = CAT.index[type] = new Map(); list.forEach((it) => { if (!ix.has(it.v)) ix.set(it.v, it); }); }
    return ix.get(v) || null;
  };
  CAT.onReady = (fn) => CAT.listeners.push(fn);
  CAT.texture = (name) => (CAT.textures[name] ? 'data:image/png;base64,' + CAT.textures[name] : null);

  const loadImg = (b64) => new Promise((resolve) => {
    if (!b64) { resolve(null); return; }
    const im = new Image();
    im.onload = () => resolve(im);
    im.onerror = () => resolve(null);
    im.src = 'data:image/png;base64,' + b64;
  });
  const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); g.imageSmoothingEnabled = false; return [c, g]; };

  const hashColor = (s, salt) => { let h = salt; for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return 'hsl(' + (h % 360) + ',55%,' + (35 + (h >> 9) % 30) + '%)'; };
  const EGG = {
    bat: ['#4c3e30', '#0f0f0f'], bee: ['#edc343', '#43241b'], camel: ['#fcc369', '#cb9337'], dolphin: ['#223b4d', '#f9f9f9'], donkey: ['#534539', '#867566'],
    ender_dragon: ['#1c1c1c', '#e079fa'], endermite: ['#161616', '#6e6e6e'], frog: ['#d07444', '#ffc77c'], horse: ['#c09e7d', '#eee500'], llama: ['#c09e7d', '#995f40'],
    mule: ['#1b0200', '#51331d'], parrot: ['#0da70b', '#ff0000'], phantom: ['#43518a', '#88ff00'], silverfish: ['#6e6e6e', '#303030'], skeleton_horse: ['#68684f', '#e5e5d8'],
    turtle: ['#e7e7e7', '#00afaf'], trader_llama: ['#eaa430', '#456296'], zombie_horse: ['#315234', '#97c284'], armadillo: ['#ad716d', '#824848'], breeze: ['#af94df', '#9166df'],
    sniffer: ['#871e09', '#235302'], creaking: ['#5f5f5f', '#fc7812'], axolotl: ['#fbc1e3', '#a62d74'], cod: ['#c1a76a', '#e5c48b'], salmon: ['#a00f10', '#0e8474'],
    pufferfish: ['#f6b201', '#37c3f2'], tropical_fish: ['#ef6915', '#fff9ef'], tadpole: ['#6d533d', '#160a00'], goat: ['#a5947c', '#55493e'], magma_cube: ['#340000', '#fcfc00'],
    vex: ['#7a90a4', '#e8edf1'], hoglin: ['#c66e55', '#5f6464'], zoglin: ['#c66e55', '#e6e6e6'], ravager: ['#757470', '#5b5049'], warden: ['#0f4649', '#39d6e0'],
    guardian: ['#5a8272', '#f17d30'], elder_guardian: ['#ceccba', '#747693'], zombie: ['#00afaf', '#799c65'], skeleton: ['#c1c1c1', '#494949'], creeper: ['#0da70b', '#000000'],
    spider: ['#342d27', '#a80e0e'], cave_spider: ['#0c424e', '#a80e0e'], enderman: ['#161616', '#000000'], slime: ['#51a03e', '#7ebf6e'], blaze: ['#f6b201', '#fff87e'],
    ghast: ['#f9f9f9', '#bcbcbc'], witch: ['#340000', '#51a03e'], villager: ['#563c33', '#bd8b72'], pig: ['#f0a5a2', '#db635f'], cow: ['#443626', '#a1a1a1'],
    sheep: ['#e7e7e7', '#ffb5b5'], chicken: ['#a1a1a1', '#ff0000'], wolf: ['#d7d3d3', '#ceaf96'], cat: ['#efc88e', '#957256'], fox: ['#d5b69f', '#cc6920'],
    panda: ['#e7e7e7', '#1b1b22'], rabbit: ['#995f40', '#734831'], squid: ['#223b4d', '#708899'], glow_squid: ['#095656', '#85f1bc'], polar_bear: ['#f2f2f2', '#959590'],
    ocelot: ['#efde7d', '#564434'], mooshroom: ['#a00f10', '#b7b7b7'], strider: ['#9c3436', '#4d494d'], shulker: ['#946794', '#4d3852'], allay: ['#00daff', '#00adff'],
    piglin: ['#995f40', '#f9f3a4'], piglin_brute: ['#592a10', '#f9f3a4'], zombified_piglin: ['#ea9393', '#4c7129'], husk: ['#797061', '#e6cc94'], stray: ['#617677', '#dde4e4'],
    drowned: ['#8ff1d7', '#799c65'], wither_skeleton: ['#141414', '#474d4d'], pillager: ['#532f36', '#959b9b'], vindicator: ['#959b9b', '#275e61'], evoker: ['#959b9b', '#1e1c1a'],
    iron_golem: ['#dbcdc2', '#74a332'], snow_golem: ['#d9f2f2', '#81a4a4'], wandering_trader: ['#456296', '#eaa430'], zombie_villager: ['#563c33', '#799c65'], bogged: ['#8a9c72', '#314d1b']
  };
  function tintFor(tex, id) {
    if (/block\/(grass_block_top|short_grass|grass|fern|tall_grass_(top|bottom)|large_fern_(top|bottom)|vine|sugar_cane)$/.test(tex)) return '#79c05a';
    if (/block\/lily_pad$/.test(tex)) return '#208030';
    if (/block\/(oak|jungle|acacia|dark_oak|mangrove)_leaves$/.test(tex)) return '#59ae30';
    if (/block\/spruce_leaves$/.test(tex)) return '#619961';
    if (/block\/birch_leaves$/.test(tex)) return '#80a755';
    if (/item\/leather_(helmet|chestplate|leggings|boots|horse_armor)$/.test(tex)) return '#a06540';
    if (/item\/(potion_overlay|tipped_arrow_head)$/.test(tex)) return '#385dc6';
    const egg = EGG[String(id).replace(/_spawn_egg$/, '')];
    if (/item\/spawn_egg$/.test(tex)) return egg ? egg[0] : hashColor(id, 7);
    if (/item\/spawn_egg_overlay$/.test(tex)) return egg ? egg[1] : hashColor(id, 101);
    return null;
  }
  function face16(img, tint, shade) {
    const [c, g] = canvas(16, 16);
    const s = Math.min(img.width, img.height);
    g.drawImage(img, 0, 0, s, s, 0, 0, 16, 16);
    if (tint) {
      g.globalCompositeOperation = 'multiply'; g.fillStyle = tint; g.fillRect(0, 0, 16, 16);
      g.globalCompositeOperation = 'destination-in'; g.drawImage(img, 0, 0, s, s, 0, 0, 16, 16);
    }
    if (shade) { g.globalCompositeOperation = 'source-atop'; g.fillStyle = 'rgba(0,0,0,' + shade + ')'; g.fillRect(0, 0, 16, 16); }
    g.globalCompositeOperation = 'source-over';
    return c;
  }

  const rad = (d) => (d * Math.PI) / 180;
  function rotAxis(p, axis, deg, origin, rescale) {
    const a = rad(deg), c = Math.cos(a), s = Math.sin(a);
    let [x, y, z] = [p[0] - origin[0], p[1] - origin[1], p[2] - origin[2]];
    if (axis === 'x') [y, z] = [y * c - z * s, y * s + z * c];
    else if (axis === 'y') [x, z] = [x * c + z * s, -x * s + z * c];
    else [x, y] = [x * c - y * s, x * s + y * c];
    if (rescale) {
      const k = 1 / Math.max(0.0001, Math.cos(a));
      if (axis !== 'x') x *= k;
      if (axis !== 'y') y *= k;
      if (axis !== 'z') z *= k;
    }
    return [x + origin[0], y + origin[1], z + origin[2]];
  }
  function makeView(gui) {
    const r = (gui && gui.rotation) || [0, 0, 0], t = (gui && gui.translation) || [0, 0, 0], sc = (gui && gui.scale) || [1, 1, 1];
    return (p, dir) => {
      let v = dir ? p.slice() : [(p[0] - 8) * sc[0], (p[1] - 8) * sc[1], (p[2] - 8) * sc[2]];
      v = rotAxis(v, 'z', r[2], [0, 0, 0]);
      v = rotAxis(v, 'y', r[1], [0, 0, 0]);
      v = rotAxis(v, 'x', r[0], [0, 0, 0]);
      return dir ? v : [v[0] + t[0], v[1] + t[1], v[2] + t[2]];
    };
  }
  const FACE_N = { north: [0, 0, -1], south: [0, 0, 1], east: [1, 0, 0], west: [-1, 0, 0], up: [0, 1, 0], down: [0, -1, 0] };
  const FACE_SHADE = { up: 0, down: 0.5, north: 0.22, south: 0.22, east: 0.4, west: 0.4 };
  function corners(k, f, t) {
    switch (k) {
      case 'north': return [[t[0], t[1], f[2]], [f[0], t[1], f[2]], [f[0], f[1], f[2]], [t[0], f[1], f[2]]];
      case 'south': return [[f[0], t[1], t[2]], [t[0], t[1], t[2]], [t[0], f[1], t[2]], [f[0], f[1], t[2]]];
      case 'east': return [[t[0], t[1], t[2]], [t[0], t[1], f[2]], [t[0], f[1], f[2]], [t[0], f[1], t[2]]];
      case 'west': return [[f[0], t[1], f[2]], [f[0], t[1], t[2]], [f[0], f[1], t[2]], [f[0], f[1], f[2]]];
      case 'up': return [[f[0], t[1], f[2]], [t[0], t[1], f[2]], [t[0], t[1], t[2]], [f[0], t[1], t[2]]];
      default: return [[f[0], f[1], t[2]], [t[0], f[1], t[2]], [t[0], f[1], f[2]], [f[0], f[1], f[2]]];
    }
  }
  function autoUv(k, f, t) {
    switch (k) {
      case 'north': return [16 - t[0], 16 - t[1], 16 - f[0], 16 - f[1]];
      case 'south': return [f[0], 16 - t[1], t[0], 16 - f[1]];
      case 'east': return [16 - t[2], 16 - t[1], 16 - f[2], 16 - f[1]];
      case 'west': return [f[2], 16 - t[1], t[2], 16 - f[1]];
      case 'up': return [f[0], f[2], t[0], t[2]];
      default: return [f[0], 16 - t[2], t[0], 16 - f[2]];
    }
  }
  const faceCache = new Map();
  function faceTex(img, key, tint, shade) {
    const ck = key + '|' + tint + '|' + shade;
    if (faceCache.has(ck)) return faceCache.get(ck);
    const s = Math.min(img.width, img.height);
    const [c, g] = canvas(s, s);
    g.drawImage(img, 0, 0, s, s, 0, 0, s, s);
    if (tint) {
      g.globalCompositeOperation = 'multiply'; g.fillStyle = tint; g.fillRect(0, 0, s, s);
      g.globalCompositeOperation = 'destination-in'; g.drawImage(img, 0, 0, s, s, 0, 0, s, s);
    }
    if (shade) { g.globalCompositeOperation = 'source-atop'; g.fillStyle = 'rgba(0,0,0,' + shade + ')'; g.fillRect(0, 0, s, s); }
    faceCache.set(ck, c);
    return c;
  }
  function renderModel(model, id, imgs) {
    const SIZE = 32, PX = 2;
    const view = makeView(model.gui);
    const quads = [];
    model.elements.forEach((el) => {
      const f = el.from, t = el.to, R = el.rotation;
      const place = (p) => (R ? rotAxis(p, R.axis, R.angle || 0, R.origin || [8, 8, 8], R.rescale) : p);
      Object.keys(el.faces).forEach((k) => {
        const face = el.faces[k];
        const img = imgs[face.texture];
        if (!img || !FACE_N[k]) return;
        let n = FACE_N[k];
        if (R) n = rotAxis(n, R.axis, R.angle || 0, [0, 0, 0]);
        n = view(n, true);
        if (n[2] <= 0.001) return;
        const pts = corners(k, f, t).map((p) => view(place(p)));
        const scr = pts.map((p) => [SIZE / 2 + p[0] * PX, SIZE / 2 - p[1] * PX]);
        const depth = pts.reduce((a, p) => a + p[2], 0) / 4;
        const uv = face.uv || autoUv(k, f, t);
        let uc = [[uv[0], uv[1]], [uv[2], uv[1]], [uv[2], uv[3]], [uv[0], uv[3]]];
        const rot = ((face.rotation || 0) / 90) % 4;
        for (let i = 0; i < rot; i++) uc = [uc[3], uc[0], uc[1], uc[2]];
        const tint = tintFor(face.texture, id) || (face.tint ? '#79c05a' : null);
        quads.push({ scr, depth, uc, tex: faceTex(img, face.texture, tint, el.shade ? FACE_SHADE[k] : 0) });
      });
    });
    if (!quads.length) return null;
    quads.sort((a, b) => a.depth - b.depth);
    const [c, g] = canvas(SIZE, SIZE);
    quads.forEach((q) => {
      const W = q.tex.width / 16;
      const [t0, t1, , t3] = q.uc.map(([u, v]) => [u * W, v * W]);
      const [p0, p1, , p3] = q.scr;
      const a1 = [t1[0] - t0[0], t1[1] - t0[1]], a2 = [t3[0] - t0[0], t3[1] - t0[1]];
      const det = a1[0] * a2[1] - a2[0] * a1[1];
      if (Math.abs(det) < 1e-6) return;
      const d1 = [p1[0] - p0[0], p1[1] - p0[1]], d2 = [p3[0] - p0[0], p3[1] - p0[1]];
      const i00 = a2[1] / det, i01 = -a2[0] / det, i10 = -a1[1] / det, i11 = a1[0] / det;
      const A = d1[0] * i00 + d2[0] * i10, Bm = d1[1] * i00 + d2[1] * i10;
      const C = d1[0] * i01 + d2[0] * i11, D = d1[1] * i01 + d2[1] * i11;
      const E = p0[0] - (A * t0[0] + C * t0[1]), F = p0[1] - (Bm * t0[0] + D * t0[1]);
      const cx = q.scr.reduce((s, p) => s + p[0], 0) / 4, cy = q.scr.reduce((s, p) => s + p[1], 0) / 4;
      g.save();
      g.beginPath();
      q.scr.forEach((p, i) => {
        const dx = p[0] - cx, dy = p[1] - cy, len = Math.hypot(dx, dy) || 1;
        const x = p[0] + (dx / len) * 0.35, y = p[1] + (dy / len) * 0.35;
        if (i) g.lineTo(x, y); else g.moveTo(x, y);
      });
      g.closePath();
      g.clip();
      g.setTransform(A, Bm, C, D, E, F);
      g.drawImage(q.tex, 0, 0);
      g.restore();
    });
    return c.toDataURL();
  }
  function chestModel(tex) {
    const box = (from, to, u, v, w, h, d) => {
      const q = (x1, y1, x2, y2) => [x1 / 4, y1 / 4, x2 / 4, y2 / 4];
      return { from, to, rotation: null, shade: true, faces: {
        up: { texture: tex, uv: q(u + d, v, u + d + w, v + d) },
        north: { texture: tex, uv: q(u + d, v + d, u + d + w, v + d + h) },
        south: { texture: tex, uv: q(u + 2 * d + w, v + d, u + 2 * d + 2 * w, v + d + h) },
        east: { texture: tex, uv: q(u, v + d, u + d, v + d + h) },
        west: { texture: tex, uv: q(u + d + w, v + d, u + 2 * d + w, v + d + h) },
        down: { texture: tex, uv: q(u + d + w, v, u + d + 2 * w, v + d) }
      } };
    };
    return { elements: [box([1, 0, 1], [15, 10, 15], 0, 19, 14, 10, 14), box([1, 9, 1], [15, 14, 15], 0, 0, 14, 5, 14), box([7, 7, 0], [9, 11, 1], 0, 0, 2, 4, 1)],
      gui: { rotation: [30, 45, 0], translation: [0, 0, 0], scale: [0.625, 0.625, 0.625] } };
  }
  function renderBanner(wool, plank) {
    if (!wool) return null;
    const [c, g] = canvas(16, 16);
    if (plank) { g.drawImage(face16(plank, null, 0.25), 0, 0, 2, 16, 7, 0, 2, 16); g.drawImage(face16(plank, null, 0.25), 0, 0, 12, 1, 2, 0, 12, 1); }
    g.drawImage(face16(wool, null, 0), 3, 1, 10, 14, 3, 1, 10, 14);
    return c.toDataURL();
  }

  async function renderIcon(icon, id, imgs) {
    if (!icon) return null;
    if (icon.model) return renderModel(icon.model, id, imgs);
    if (icon.box) return renderModel(chestModel(icon.box.tex), id, imgs);
    if (icon.face) return renderFace(icon.face, imgs);
    if (icon.banner) return renderBanner(imgs[icon.banner], imgs['block/oak_planks']);
    if (icon.flat) {
      const [c, g] = canvas(16, 16);
      let any = false;
      icon.flat.forEach((t) => { const im = imgs[t]; if (im) { g.drawImage(face16(im, tintFor(t, id)), 0, 0); any = true; } });
      return any ? c.toDataURL() : null;
    }
    if (icon.cube) {
      const top = imgs[icon.cube.top], side = imgs[icon.cube.side], front = imgs[icon.cube.front] || side;
      if (!top || !side) return null;
      const [c, g] = canvas(32, 32);
      g.setTransform(1, 0.5, -1, 0.5, 16, 0); g.drawImage(face16(top, tintFor(icon.cube.top, id), 0), 0, 0);
      g.setTransform(1, 0.5, 0, 1, 0, 8); g.drawImage(face16(front, tintFor(icon.cube.front, id), 0.2), 0, 0);
      g.setTransform(1, -0.5, 0, 1, 16, 16); g.drawImage(face16(side, tintFor(icon.cube.side, id), 0.38), 0, 0);
      return c.toDataURL();
    }
    return null;
  }
  function renderFace(f, imgs) {
    const im = f && imgs[f.tex];
    if (!im) return null;
    const [c, g] = canvas(32, 32);
    const k = Math.max(1, Math.floor(32 / Math.max(f.w, f.h)));
    const w = f.w * k, h = f.h * k;
    const ox = Math.floor((32 - w) / 2), oy = Math.floor((32 - h) / 2);
    if (f.parts) f.parts.forEach(([sx, sy, pw, ph, dx, dy]) => g.drawImage(im, sx, sy, pw, ph, ox + dx * k, oy + dy * k, pw * k, ph * k));
    else g.drawImage(im, f.x, f.y, f.w, f.h, ox, oy, w, h);
    return c.toDataURL();
  }
  function renderPlain(im) {
    if (!im) return null;
    const [c, g] = canvas(18, 18);
    const s = Math.min(im.width, im.height);
    g.drawImage(im, 0, 0, s, s, 0, 0, 18, 18);
    return c.toDataURL();
  }

  const slotOf = (type) => {
    const T = window.SLOT_TYPES && window.SLOT_TYPES[type];
    const m = new Map();
    (T ? T.items : []).forEach((it) => { if (!m.has(it.v)) m.set(it.v, it); if (it.old && !m.has(it.old)) m.set(it.old, it); });
    return { list: T ? T.items : [], map: m };
  };
  function ordered(type, rows, restGroup) {
    const S = slotOf(type);
    const byV = new Map(rows.map((r) => [r.v, r]));
    const out = [];
    const used = new Set();
    S.list.forEach((it) => {
      const r = byV.get(it.v);
      if (!r || used.has(r.v)) return;
      used.add(r.v);
      out.push(Object.assign({}, r, { g: it.g || r.g }));
    });
    rows.forEach((r) => { if (!used.has(r.v)) { used.add(r.v); out.push(Object.assign({}, r, { g: typeof restGroup === 'function' ? restGroup(r) : restGroup })); } });
    return out;
  }
  const SOUND_GROUP = { block: '블록 소리', entity: '몹 · 플레이어 소리', item: '아이템 소리', ui: '화면 소리', music: '음악', music_disc: '음반', ambient: '주변 소리', weather: '날씨 소리', event: '이벤트 소리' };

  async function render(raw) {
    const imgs = {};
    await Promise.all(Object.keys(raw.textures || {}).map(async (k) => { imgs[k] = await loadImg(raw.textures[k]); }));
    const material = [];
    const itemImg = {};
    for (const it of raw.items) {
      const img = await renderIcon(it.icon, it.id, imgs);
      const v = it.id.toUpperCase();
      itemImg[it.id] = img;
      const ic = it.icon || {};
      const t = ic.flat ? ic.flat[0] : ic.cube ? ic.cube.side : ic.model ? (Object.values(ic.model.elements[0].faces)[0] || {}).texture || null : null;
      material.push({ v, k: it.name, g: (raw.tabNames && raw.tabNames[it.tab]) || (it.block ? '블록' : '아이템'), tab: it.tab, img, t, block: it.block });
    }
    const entity = raw.entities.map((e) => ({ v: e.id.toUpperCase(), k: e.name, g: '', img: renderFace(e.face, imgs) || (e.egg && itemImg[e.egg]) || null }));
    const effect = raw.effects.map((e) => ({ v: e.id.toUpperCase(), k: e.name, g: '효과', img: renderPlain(imgs[e.tex]) }));
    const enchant = raw.enchants.map((e) => ({ v: e.id, k: e.name, g: '마법' }));
    const sound = raw.sounds.map((s) => {
      const head = s.id.split('.')[0];
      return { v: s.id.replace(/\./g, '_').toUpperCase(), k: s.name || s.id, g: SOUND_GROUP[head] || '그 밖의 소리', id: s.id };
    });
    const S = slotOf('entity');
    const data = {
      material: raw.tabs ? material.slice().sort((a, b) => (raw.tabs.indexOf(a.tab) - raw.tabs.indexOf(b.tab)) || a.v.localeCompare(b.v)) : ordered('material', material, (r) => (r.block ? '그 밖의 블록' : '그 밖의 아이템')),
      entity: ordered('entity', entity.map((e) => { const s = S.map.get(e.v); return s ? Object.assign(e, { v: s.v }) : e; }), '그 밖의 몹'),
      effect: ordered('effect', effect, '효과'),
      enchant: ordered('enchant', enchant, '마법'),
      sound: ordered('sound', sound, (r) => r.g)
    };
    data.block = data.material.filter((it) => it.block);
    return { version: raw.version, lang: raw.lang, data, textures: raw.textures };
  }

  let toastShown = false;
  CAT.load = async function (ver) {
    if (!window.api || !window.api.mcCatalog || !ver) return null;
    if (CAT.ver === ver && CAT.data) return CAT.data;
    if (CAT.loading && CAT.loading.ver === ver) return CAT.loading.p;
    const p = (async () => {
      const slow = setTimeout(() => { toastShown = true; if (window.toast) toast('마크 ' + ver + ' 아이템 · 몹 목록을 준비하고 있습니다…'); }, 900);
      if (window.api.onMcLog) window.api.onMcLog((line) => { if (window.toast) toast(line); });
      try {
        const r = await window.api.mcCatalog(ver);
        if (!r || !r.ok) throw new Error((r && r.error) || '목록을 못 읽었습니다');
        let cat = r.catalog;
        if (!cat && r.raw) {
          cat = await render(r.raw);
          window.api.saveMcCatalog(ver, cat).catch(() => {});
        }
        if (CAT.loading && CAT.loading.ver !== ver) return null;
        CAT.ver = ver;
        CAT.data = cat.data;
        CAT.textures = cat.textures || {};
        CAT.index = {};
        clearTimeout(slow);
        if (toastShown && window.toast) toast('마크 ' + ver + ' 목록 준비 완료 · 아이템 ' + cat.data.material.length + '개, 몹 ' + cat.data.entity.length + '개');
        toastShown = false;
        CAT.listeners.forEach((fn) => { try { fn(ver); } catch (e) {  } });
        return cat.data;
      } catch (err) {
        clearTimeout(slow);
        if (window.toast) toast('마크 ' + ver + ' 목록을 못 가져와서 기본 목록을 씁니다 (' + err.message + ')', 'warn');
        return null;
      } finally {
        if (CAT.loading && CAT.loading.ver === ver) CAT.loading = null;
      }
    })();
    CAT.loading = { ver, p };
    return p;
  };

  if (window.MC) {
    const set = MC.set;
    MC.set = function (v) { set(v); CAT.load(MC.version); };
  }
})();
