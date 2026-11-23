
(function (root) {
  const DEFS = root.PM_DEFS || (typeof require !== 'undefined' ? require('./defs.js') : null);
  const BY_ID = DEFS.BY_ID;

  const IND = '    ';
  const NEED_NAME = {
    player: '"그 플레이어"', block: '"그 블록"', mob: '"잡은 몹"', item: '"그 아이템"', msg: '"채팅 내용"',
    slot: '"바꾼 칸 번호"', cancel: '"못 하게 막기"', evmsg: '"알림 메시지"', damage: '"피해"', orig: '"처음 플레이어"', drops: '"떨어지는 아이템"', death: '"죽음"',
    bdrops: '"블록 드롭"', respawn: '"다시 태어날 곳"', ping: '"서버 목록"', login: '"접속 막기"', sign: '"표지판"', chatfmt: '"채팅 모양"',
    target: '"그 대상"', loc: '"그 위치"', args: '"명령어 단어"', cmdsender: '"명령어 친 사람"', explosion: '"폭발"'
  };
  const TOO_LATE = new Set(['cancel', 'evmsg', 'damage']);
  const DEF_KINDS = new Set(['menu', 'itemdef', 'recipe', 'gui', 'citem']);

  function javaString(s) {
    return '"' + String(s == null ? '' : s)
      .replace(/\\/g, '\\\\').replace(/"/g, '\\"')
      .replace(/\r/g, '\\r').replace(/\n/g, '\\n').replace(/\t/g, '\\t') + '"';
  }

  function keyOf(prefix, name) {
    const s = String(name || '');
    let hex = '';
    if (typeof TextEncoder !== 'undefined') {
      new TextEncoder().encode(s).forEach((b) => { hex += b.toString(16).padStart(2, '0'); });
    } else {
      hex = Buffer.from(s, 'utf8').toString('hex');
    }
    return prefix + hex;
  }

  class Skip extends Error {}

  const isOff = (b) => b.enabled === false || (Array.isArray(b.disabledReasons) && b.disabledReasons.length > 0);
  const inputBlock = (b, name) => {
    const inp = b.inputs && b.inputs[name];
    return inp ? inp.block || inp.shadow || null : null;
  };
  const chain = (first) => {
    const out = [];
    for (let b = first; b; b = b.next && b.next.block) out.push(b);
    return out;
  };
  const fieldRaw = (b, name, def) => (b.fields && b.fields[name] !== undefined ? b.fields[name] : def);
  const defOf = (b) => {
    const d = BY_ID[b.type];
    if (d && d.variants) {
      const v = fieldRaw(b, 'KIND', d.variants[0][1]);
      return d.variants.some((x) => x[1] === v) ? BY_ID[v] : BY_ID[d.variants[0][1]];
    }
    return d;
  };
  const LETTERS = 'ABCDEFGHIJKL';
  const countOf = (b, d) => Math.max(d.variadic.min, Math.min(d.variadic.max, Number(b.extraState && b.extraState.count) || d.variadic.def));

  function generate(state, opts) {
    opts = opts || {};
    const tops = ((state && state.blocks && state.blocks.blocks) || []).filter((b) => !isOff(b));
    const varNames = {};
    ((state && state.variables) || []).forEach((v) => { varNames[v.id] = v.name; });
    const problems = [];
    const warn = (id, msg) => problems.push({ id, msg });

    tops.sort((a, b) => (a.y || 0) - (b.y || 0) || (a.x || 0) - (b.x || 0));

    function fieldValue(spec, raw) {
      switch (spec.field) {
        case 'text':
        case 'ctext': return javaString(raw);
        case 'word': {
          const w = String(raw || '').toLowerCase().replace(/[^a-z0-9_-]/g, '');
          return w || String(spec.def);
        }
        case 'number': {
          let n = Number(raw);
          if (!isFinite(n)) n = Number(spec.def) || 0;
          if (spec.min != null) n = Math.max(spec.min, n);
          if (spec.max != null) n = Math.min(spec.max, n);
          return String(Math.round(n * 100) / 100);
        }
        case 'choice': {
          const v = String(raw == null ? '' : raw);
          return (spec.list === 'mccmd' ? /^[a-z][a-z0-9_-]*$/ : /^[A-Za-z0-9_]+$/).test(v) ? v : String(spec.def);
        }
        case 'options': {
          const v = String(raw == null ? '' : raw);
          return spec.options.some((o) => o[1] === v) ? v : spec.def;
        }
        case 'var': {
          const name = raw && typeof raw === 'object' ? (varNames[raw.id] || raw.name || spec.def) : (raw || spec.def);
          return javaString(keyOf('v', name));
        }
        case 'ref': return String(raw == null ? spec.def : raw);
        default: return String(raw);
      }
    }

    const menus = [];
    const items = [];
    tops.forEach((t) => {
      if (t.type === 'pm_menu_def') {
        const name = String(fieldRaw(t, 'NAME', '상점')).trim();
        if (menus.some((m) => m.name === name)) warn(t.id, '"' + name + '" 메뉴가 두 개입니다. 이름을 다르게 해주세요.');
        else menus.push({ name, block: t });
      } else if (t.type === 'pm_item_def') {
        const name = String(fieldRaw(t, 'NAME', '아이템')).trim();
        if (items.some((m) => m.name === name)) warn(t.id, '"' + name + '" 커스텀 아이템이 두 개입니다. 이름을 다르게 해주세요.');
        else items.push({ name, key: keyOf('i', name), block: t });
      } else if (t.type === 'pm_gui') {
        const name = String(fieldRaw(t, 'NAME', '메뉴')).trim();
        if (menus.some((m) => m.name === name)) warn(t.id, '"' + name + '" 메뉴가 두 개입니다. 이름을 다르게 해주세요.');
        else menus.push({ name, block: t, gui: (t.extraState && t.extraState.layout) || { rows: 3, title: '', slots: {} } });
      } else if (t.type === 'pm_citem') {
        const name = String(fieldRaw(t, 'NAME', '아이템')).trim();
        if (items.some((m) => m.name === name)) warn(t.id, '"' + name + '" 커스텀 아이템이 두 개입니다. 이름을 다르게 해주세요.');
        else items.push({ name, key: keyOf('i', name), block: t, citem: (t.extraState && t.extraState.data) || {} });
      }
    });

    const base = {
      menuIndex(name) {
        const i = menus.findIndex((m) => m.name === name);
        if (i < 0) { warn(this.owner, '"' + name + '" 메뉴가 없습니다. "메뉴" 칸에서 메뉴 블록을 먼저 만들어주세요.'); throw new Skip(); }
        return i;
      },
      itemKey(name) {
        const it = items.find((m) => m.name === name);
        if (!it) { warn(this.owner, '"' + name + '" 커스텀 아이템이 없습니다. "커스텀 아이템" 칸에서 먼저 만들어주세요.'); throw new Skip(); }
        return it.key;
      }
    };
    const child = (ctx, extra) => Object.assign(Object.create(base), ctx, extra, { v: Object.assign({}, ctx.v, extra && extra.v) });
    const newCtx = (has, title, extra) => Object.assign(Object.create(base), {
      has, v: { player: 'p', block: 'block', mob: 'mob' }, title, async: false, lambda: false, late: false, ret: 'void'
    }, extra || {});

    function checkNeeds(b, d, ctx) {
      if (d.since && typeof opts.versionOk === 'function' && !opts.versionOk(d.since)) {
        warn(ctx.owner || b.id, '이 블록은 마크 ' + d.since + ' 이상에서만 됩니다. 버전을 올리거나 다른 블록을 써주세요.');
        throw new Skip();
      }
      (d.needs || []).forEach((n) => {
        if (!ctx.has.includes(n)) {
          warn(ctx.owner || b.id, NEED_NAME[n] + ' 블록은 "' + ctx.title + '" 안에서는 쓸 수 없습니다.');
          throw new Skip();
        }
        if (ctx.late && TOO_LATE.has(n)) {
          warn(ctx.owner || b.id, '"~초 뒤에" 안에서는 이미 지나간 일이라 ' + NEED_NAME[n] + ' 블록이 소용없습니다. 기다리기 밖으로 빼주세요.');
          throw new Skip();
        }
      });
    }

    function args(b, d, ctx) {
      const a = {};
      if (d.variadic && d.variadic.kind === 'value') {
        const v = d.variadic;
        const wantsText = v.check === 'String' || (Array.isArray(v.check) && v.check[0] === 'String');
        a.list = LETTERS.slice(0, countOf(b, d)).split('').map((name) => {
          const c = inputBlock(b, name);
          if (!c) { warn(ctx.owner || b.id, '빈칸이 있습니다. 블록을 끼워주세요.'); throw new Skip(); }
          let code = expr(c, ctx);
          const cd = defOf(c);
          if (wantsText && cd && cd.output === 'Number') code = 'n(' + code + ')';
          return code;
        });
        return a;
      }
      Object.keys(d.args || {}).forEach((name) => {
        const spec = d.args[name];
        if (spec.in === 'value') {
          const c = inputBlock(b, name);
          if (!c) { warn(ctx.owner || b.id, '빈칸이 있습니다. 블록을 끼워주세요.'); throw new Skip(); }
          let code = expr(c, ctx);
          const cd = defOf(c);
          const wantsText = spec.check === 'String' || (Array.isArray(spec.check) && spec.check[0] === 'String');
          if (wantsText && cd && cd.output === 'Number') code = 'n(' + code + ')';
          a[name] = code;
        } else {
          a[name] = fieldValue(spec, fieldRaw(b, name, spec.def));
        }
      });
      return a;
    }

    function expr(b, ctx) {
      const d = defOf(b);
      if (!d || !d.java) { warn(ctx.owner || b.id, '여기에는 이 블록을 쓸 수 없습니다.'); throw new Skip(); }
      checkNeeds(b, d, ctx);
      return d.java(args(b, d, ctx), ctx);
    }

    function statements(first, ctx, depth) {
      const lines = [];
      const pad = IND.repeat(depth);
      let syncBuf = [];
      const flush = () => {
        if (!syncBuf.length) return;
        lines.push(pad + 'Bukkit.getScheduler().runTask(this, () -> {', ...syncBuf.map((l) => IND + l), pad + '});');
        syncBuf = [];
      };
      chain(first).forEach((b) => {
        if (isOff(b)) return;
        try {
          const out = statement(b, ctx, depth);
          if (out.sync) syncBuf.push(...out);
          else { flush(); lines.push(...out); }
        } catch (err) { if (!(err instanceof Skip)) throw err; }
      });
      flush();
      return lines;
    }

    function statement(b, ctx, depth) {
      const d = defOf(b);
      const pad = IND.repeat(depth);
      if (!d) { warn(b.id, '모르는 블록입니다'); throw new Skip(); }
      if (d.kind === 'trigger' || DEF_KINDS.has(d.kind)) { warn(b.id, '이 블록은 맨 위에만 놓을 수 있습니다.'); throw new Skip(); }
      if (d.kind === 'value' || d.kind === 'cond' || d.kind === 'menuitem' || d.kind === 'itemprop') throw new Skip();
      ctx.owner = b.id;

      if (d.kind === 'stop') {
        return [pad + (ctx.ret === 'bool' && !ctx.lambda ? 'return true;' : 'return;')];
      }

      if (d.kind === 'control') {
        checkNeeds(b, d, ctx);
        const a = args(b, d, ctx);
        const body = (c) => statements(inputBlock(b, 'DO'), c, depth + 1);
        if (b.type === 'pm_wait') {
          const ticks = Math.round(Number(a.SEC) * 20);
          const inner = body(child(ctx, { lambda: true, late: true, async: false }));
          return [pad + 'Bukkit.getScheduler().runTaskLater(this, () -> {', ...inner, pad + '}, ' + ticks + 'L);'];
        }
        if (b.type === 'pm_repeat') {
          const i = 'i' + depth;
          return [pad + 'for (int ' + i + ' = 0; ' + i + ' < ' + Math.round(Number(a.N)) + '; ' + i + '++) {', ...body(ctx), pad + '}'];
        }
        if (d.variadic && d.variadic.kind === 'ifchain') {
          const n = countOf(b, d);
          const out = [];
          for (let i = 0; i <= n; i++) {
            const c = inputBlock(b, 'COND' + i);
            const inner = statements(inputBlock(b, 'DO' + i), ctx, depth + 1);
            if (!c) { if (inner.length) warn(b.id, (i ? '아니면 만약' : '만약') + ' 칸의 조건이 비어 있습니다.'); continue; }
            let cond;
            try { cond = expr(c, ctx); } catch (err) { if (err instanceof Skip) continue; throw err; }
            out.push(pad + (out.length ? '} else if (' : 'if (') + cond + ') {', ...inner);
          }
          const els = statements(inputBlock(b, 'ELSE'), ctx, depth + 1);
          if (!out.length) return els.length ? [pad + '{', ...els, pad + '}'] : [];
          if (els.length) out.push(pad + '} else {', ...els);
          out.push(pad + '}');
          return out;
        }
        if (d.find === 'target') {
          const tv = 'tp' + depth;
          const inner = body(child(ctx, { has: ctx.has.includes('player') ? ctx.has : ctx.has.concat('player'), v: { player: tv } }));
          return [pad + 'if (' + ctx.v.target + ' instanceof Player) {', pad + IND + 'Player ' + tv + ' = (Player) ' + ctx.v.target + ';', ...inner, pad + '}'];
        }
        if (d.find === 'remembered') {
          const rv = 'rp' + depth;
          const inner = body(child(ctx, { has: ctx.has.includes('player') ? ctx.has : ctx.has.concat('player'), v: { player: rv } }));
          const other = statements(inputBlock(b, 'ELSE'), ctx, depth + 2);
          const out = [pad + '{', pad + IND + 'Player ' + rv + ' = recall(' + a.WHO + ', ' + a.NAME + ');', pad + IND + 'if (' + rv + ' != null) {', ...inner.map((l) => IND + l), pad + IND + '}'];
          if (other.length) { out[out.length - 1] = pad + IND + '} else {'; out.push(...other, pad + IND + '}'); }
          out.push(pad + '}');
          return out;
        }
        if (d.find === 'player') {
          const fv = 'fp' + depth;
          const inner = body(child(ctx, { has: ctx.has.includes('player') ? ctx.has : ctx.has.concat('player'), v: { player: fv } }));
          const other = statements(inputBlock(b, 'ELSE'), ctx, depth + 2);
          const out = [pad + '{', pad + IND + 'Player ' + fv + ' = Bukkit.getPlayerExact(' + a.NAME + ');', pad + IND + 'if (' + fv + ' != null) {',
            ...inner.map((l) => IND + l), pad + IND + '}'];
          if (other.length) { out[out.length - 1] = pad + IND + '} else {'; out.push(...other, pad + IND + '}'); }
          out.push(pad + '}');
          return out;
        }
        if (d.branches) {
          const names = d.variadic ? LETTERS.slice(0, countOf(b, d)).split('') : d.branches;
          const filled = names.map((n) => statements(inputBlock(b, n), ctx, depth + 2)).filter((x) => x.length);
          if (!filled.length) return [];
          const out = [pad + 'switch ((int) (Math.random() * ' + filled.length + ')) {'];
          filled.forEach((lines, i) => out.push(pad + IND + 'case ' + i + ': {', ...lines, pad + IND + IND + 'break;', pad + IND + '}'));
          out.push(pad + '}');
          return out;
        }
        if (d.loop === 'player') {
          const pv = 'pl' + depth;
          const inner = body(child(ctx, { has: ctx.has.includes('player') ? ctx.has : ctx.has.concat('player'), v: { player: pv } }));
          return [pad + 'for (Player ' + pv + ' : Bukkit.getOnlinePlayers()) {', ...inner, pad + '}'];
        }
        const out = [pad + 'if (' + a.COND + ') {', ...body(ctx)];
        if (d.elseBranch) out.push(pad + '} else {', ...statements(inputBlock(b, 'ELSE'), ctx, depth + 1));
        out.push(pad + '}');
        return out;
      }

      checkNeeds(b, d, ctx);
      const code = d.java(args(b, d, ctx), ctx);
      const out = code.split('\n').map((l) => pad + l);
      if (d.sync && ctx.async) out.sync = true;
      return out;
    }

    const enableBody = [];
    const guiClicks = [];
    const guiBackgrounds = [];
    let guiNoHover = false;
    const methods = [];
    const commands = new Map();
    const methodNames = new Set();
    let blockCount = 0;

    let recipeNo = 0;
    function recipeLines(t) {
      const d = BY_ID[t.type];
      const f = (n) => fieldValue(d.args[n], fieldRaw(t, n, d.args[n].def));
      const no = recipeNo++;
      let result;
      if (t.type === 'pm_recipe_custom') {
        const ctx = newCtx([], '제작법');
        ctx.owner = t.id;
        try { result = 'item_' + ctx.itemKey(f('ITEM')) + '()'; } catch (err) { if (err instanceof Skip) return; throw err; }
      } else if (t.type === 'pm_recipe') {
        result = 'new ItemStack(Material.' + f('RESULT') + ', ' + Math.round(Number(f('N'))) + ')';
      }
      const r = 'rc' + no;
      if (t.type === 'pm_furnace') {
        enableBody.push(IND + 'try {',
          IND + IND + 'Bukkit.addRecipe(new FurnaceRecipe(new NamespacedKey(this, "furnace_' + no + '"), new ItemStack(Material.' + f('OUT') + '), Material.' + f('IN') + ', 0.7f, 200));',
          IND + '} catch (Exception ex) { getLogger().warning("화로 굽기를 넣지 못했습니다: " + ex.getMessage()); }');
        return;
      }
      const grid = ['A', 'B', 'C'].map((row) => [1, 2, 3].map((c) => f(row + c)));
      const used = (m) => m && m !== 'AIR';
      let rows = [0, 1, 2].filter((y) => grid[y].some(used));
      let cols = [0, 1, 2].filter((x) => grid.some((row) => used(row[x])));
      if (!rows.length) { warn(t.id, '제작법 칸이 모두 비어 있습니다.'); return; }
      rows = [rows[0], rows[rows.length - 1]]; cols = [cols[0], cols[cols.length - 1]];
      const letters = {};
      let next = 0;
      const shape = [];
      for (let y = rows[0]; y <= rows[1]; y++) {
        let line = '';
        for (let x = cols[0]; x <= cols[1]; x++) {
          const m = grid[y][x];
          if (!used(m)) { line += ' '; continue; }
          if (!letters[m]) letters[m] = 'abcdefghi'[next++];
          line += letters[m];
        }
        shape.push(javaString(line));
      }
      enableBody.push(IND + 'try {',
        IND + IND + 'ShapedRecipe ' + r + ' = new ShapedRecipe(new NamespacedKey(this, "recipe_' + no + '"), ' + result + ');',
        IND + IND + r + '.shape(' + shape.join(', ') + ');',
        ...Object.keys(letters).map((m) => IND + IND + r + ".setIngredient('" + letters[m] + "', Material." + m + ');'),
        IND + IND + 'Bukkit.addRecipe(' + r + ');',
        IND + '} catch (Exception ex) { getLogger().warning("제작법을 넣지 못했습니다: " + ex.getMessage()); }');
    }

    tops.forEach((top) => {
      blockCount++;
      const d = defOf(top);
      if (!d) return;
      if (d.kind === 'recipe') { recipeLines(top); return; }
      if (DEF_KINDS.has(d.kind)) return;
      if (d.kind !== 'trigger') {
        if (d.kind === 'menuitem') warn(top.id, '"메뉴" 블록 안에 넣어야 합니다.');
        else if (d.kind === 'itemprop') warn(top.id, '"커스텀 아이템" 블록 안에 넣어야 합니다.');
        else if (d.kind !== 'value' && d.kind !== 'cond') warn(top.id, '"~했을 때" 블록 아래에 붙여야 실행됩니다.');
        return;
      }
      const has = (d.provides || []).concat((d.provides || []).includes('player') ? ['orig'] : []);
      const ctx = newCtx(has, d.text.replace(/\{\w+\}/g, '…'), { async: !!d.async });
      Object.assign(ctx.v, d.vars);
      let a;
      try { a = args(top, d, ctx); } catch (err) { if (err instanceof Skip) return; throw err; }

      if (d.special === 'enable') {
        enableBody.push(...statements(inputBlock(top, 'DO'), ctx, 1));
        return;
      }
      if (d.special === 'timer') {
        const ticks = Math.max(1, Math.round(Number(a.SEC) * 20));
        ctx.title = a.SEC + '초마다';
        ctx.lambda = true;
        const body = statements(inputBlock(top, 'DO'), ctx, 2);
        enableBody.push(IND + 'Bukkit.getScheduler().runTaskTimer(this, () -> {', ...body, IND + '}, ' + ticks + 'L, ' + ticks + 'L);');
        return;
      }
      if (d.special === 'guiclick') { guiClicks.push(top); return; }
      if (d.special === 'command') {
        const name = a.NAME;
        ctx.title = '/' + name + ' 명령어를 쳤을 때';
        ctx.ret = 'bool';
        if (commands.has(name)) warn(top.id, '/' + name + ' 명령어 블록이 두 개입니다. 둘 다 실행됩니다.');
        const body = statements(inputBlock(top, 'DO'), ctx, 2);
        commands.set(name, (commands.get(name) || []).concat(body));
        return;
      }

      let mname = d.method;
      for (let i = 2; methodNames.has(mname); i++) mname = d.method + i;
      methodNames.add(mname);
      const body = statements(inputBlock(top, 'DO'), ctx, 1);
      methods.push([
        '@EventHandler',
        'public void ' + mname + '(' + d.event + ' e) {',
        ...d.setup.map((l) => IND + l),
        ...body,
        '}'
      ].join('\n'));
    });

    const menuParts = [];
    const clickCases = [];
    const MAT_RE = /^[A-Z][A-Z0-9_]*$/;
    const lit = (v) => 'c(' + javaString(v || '') + ')';
    function guiMenu(m, idx) {
      const L = m.gui;
      const t = m.block;
      if (L.noHover) {
        if (typeof opts.versionOk === 'function' && !opts.versionOk('1.21.2')) warn(t.id, '마우스 올린 칸이 밝아지지 않게 하는 건 마크 1.21.2 이상에서만 됩니다.');
        else guiNoHover = true;
      }
      const rows = Math.max(1, Math.min(6, Math.round(Number(L.rows)) || 3));
      const size = rows * 9;
      let title = L.titleHide ? '""' : lit(L.title);
      const shift = (n) => { n = Math.round(Number(n) || 0); let out = ''; const base = n < 0 ? 0xF821 : 0xF811; n = Math.min(255, Math.abs(n)); for (let i = 0; i < 8; i++) if (n & (1 << i)) out += '\\u' + (base + i).toString(16); return out; };
      if (L.bg && String(L.bg).indexOf('data:image/png;base64,') === 0) {
        if (typeof opts.versionOk === 'function' && !opts.versionOk('1.19.3')) warn(t.id, '직접 그린 메뉴 배경은 마크 1.19.3 이상에서만 보입니다. 지금 버전에서는 원래 상자 모양으로 보입니다.');
        else {
          const ch = (0xE100 + idx).toString(16);
          guiBackgrounds.push({ index: idx, png: L.bg, height: 17 + rows * 18, char: String.fromCharCode(0xE100 + idx) });
          title = '"\\u00a7f\\uf801\\u' + ch + '\\uf802' + shift(L.titleX) + '\\u00a78" + ' + title;
        }
      }
      const lines = ['// 메뉴 "' + m.name.replace(/[\r\n]/g, ' ') + '"', 'private void openMenu_' + idx + '(Player p) {',
        IND + 'Inventory inv = Bukkit.createInventory(new MenuHolder(' + idx + '), ' + size + ', ' + title + ');'];
      const ctx0 = newCtx(['player', 'orig'], '메뉴 칸을 눌렀을 때');
      ctx0.owner = t.id;
      const stackOf = (sl) => {
        const n = Math.max(1, Math.min(64, Math.round(Number(sl.amount)) || 1));
        if (sl.custom) {
          try { return '{ItemStack}item_' + ctx0.itemKey(sl.custom) + '()|' + n; } catch (err) { if (err instanceof Skip) return null; throw err; }
        }
        const mat = MAT_RE.test(String(sl.mat || '')) ? sl.mat : 'STONE';
        return 'new ItemStack(Material.' + mat + ', ' + n + ')';
      };
      const asStack = (code) => {
        if (!code) return null;
        if (code.indexOf('{ItemStack}') === 0) { const [call, n] = code.slice(11).split('|'); return 'amount(' + call + ', ' + n + ')'; }
        return code;
      };
      Object.keys(L.slots || {}).map(Number).sort((a, b) => a - b).forEach((slot) => {
        if (!(slot >= 1 && slot <= size)) return;
        const sl = L.slots[slot];
        const st = asStack(stackOf(sl));
        if (!st) return;
        const lore = (sl.lore || []).filter((x) => x != null).map(lit);
        lines.push(IND + 'inv.setItem(' + (slot - 1) + ', guiItem(' + st + ', ' + (sl.name ? lit(sl.name) : 'null') + ', Arrays.asList(' + lore.join(', ') + ')));');
        const A = sl.action || {};
        const body = [];
        const P2 = IND + IND;
        if (A.type === 'close') body.push(P2 + 'Bukkit.getScheduler().runTask(this, () -> p.closeInventory());');
        else if (A.type === 'menu') {
          try { body.push(P2 + 'Bukkit.getScheduler().runTask(this, () -> openMenu_' + ctx0.menuIndex(String(A.menu || '')) + '(p));'); } catch (err) { if (!(err instanceof Skip)) throw err; }
        } else if (A.type === 'cmd') body.push(P2 + 'p.performCommand(' + javaString(String(A.cmd || '').replace(/^\//, '')) + ');');
        else if (A.type === 'console') body.push(P2 + 'Bukkit.dispatchCommand(Bukkit.getConsoleSender(), ' + javaString(String(A.cmd || '').replace(/^\//, '')) + '.replace("{이름}", p.getName()));');
        else if (A.type === 'msg') body.push(P2 + 'p.sendMessage(' + lit(A.msg) + ');');
        else if (A.type === 'give') body.push(P2 + 'p.getInventory().addItem(' + st + ');');
        else if (A.type === 'buy') {
          const price = Math.max(0, Number(A.price) || 0);
          const key = javaString(keyOf('v', String(A.var || '돈').trim() || '돈'));
          body.push(P2 + 'if (getValue(p, ' + key + ') >= ' + price + ') {',
            P2 + IND + 'setValue(p, ' + key + ', getValue(p, ' + key + ') - ' + price + ');',
            P2 + IND + 'p.getInventory().addItem(' + st + ');',
            P2 + IND + 'p.sendMessage(c("&a샀습니다! &7(-' + price + ')"));',
            P2 + '} else {',
            P2 + IND + 'p.sendMessage(c("&c돈이 부족합니다 &7(' + price + ' 필요)"));',
            P2 + '}');
        } else if (A.type === 'tp') body.push(P2 + 'p.teleport(loadSLoc(' + javaString(String(A.loc || '스폰')) + '));');
        if (body.length && A.close && A.type !== 'close' && A.type !== 'menu') body.push(P2 + 'Bukkit.getScheduler().runTask(this, () -> p.closeInventory());');
        if (body.length) clickCases.push(IND + 'if (menu == ' + idx + ' && slot == ' + slot + ') {', ...body, IND + '}');
      });
      if (L.fill && MAT_RE.test(L.fill)) lines.push(IND + 'for (int s = 0; s < inv.getSize(); s++) if (inv.getItem(s) == null) inv.setItem(s, guiItem(new ItemStack(Material.' + L.fill + '), " ", Arrays.asList()));');
      lines.push(IND + 'p.openInventory(inv);', '}');
      return lines.join('\n');
    }
    menus.forEach((m, idx) => {
      if (m.gui) { menuParts.push(guiMenu(m, idx)); return; }
      const t = m.block;
      const rows = Math.max(1, Math.min(6, Math.round(Number(fieldRaw(t, 'ROWS', 3))) || 3));
      const size = rows * 9;
      const lines = [
        '// 메뉴 "' + m.name.replace(/[\r\n]/g, ' ') + '"',
        'private void openMenu_' + idx + '(Player p) {',
        IND + 'Inventory inv = Bukkit.createInventory(new MenuHolder(' + idx + '), ' + size + ', c(' + javaString(fieldRaw(t, 'TITLE', '')) + '));'
      ];
      let fill = null;
      const used = new Set();
      chain(inputBlock(t, 'DO')).forEach((b) => {
        if (isOff(b)) return;
        if (b.type === 'pm_menu_fill') { fill = fieldValue(BY_ID.pm_menu_fill.args.MAT, fieldRaw(b, 'MAT', 'GRAY_STAINED_GLASS_PANE')); return; }
        if (b.type !== 'pm_menu_button') return;
        const bd = BY_ID.pm_menu_button;
        const slot = Math.round(Number(fieldValue(bd.args.SLOT, fieldRaw(b, 'SLOT', 1))));
        if (slot > size) { warn(b.id, slot + '번 칸은 없습니다. 이 메뉴는 ' + rows + '줄이라 ' + size + '번 칸까지 있습니다.'); return; }
        if (used.has(slot)) { warn(b.id, slot + '번 칸이 두 번 나옵니다. 위에 있는 것만 씁니다.'); return; }
        used.add(slot);
        const mat = fieldValue(bd.args.MAT, fieldRaw(b, 'MAT', 'DIAMOND'));
        lines.push(IND + 'inv.setItem(' + (slot - 1) + ', menuItem(Material.' + mat + ', c(' + javaString(fieldRaw(b, 'LABEL', '')) + '), c(' + javaString(fieldRaw(b, 'DESC', '')) + ')));');
        const ctx = newCtx(['player', 'orig'], '메뉴 칸을 눌렀을 때');
        const body = statements(inputBlock(b, 'DO'), ctx, 2);
        clickCases.push(IND + 'if (menu == ' + idx + ' && slot == ' + slot + ') {', ...body, IND + '}');
      });
      if (fill) lines.push(IND + 'for (int s = 0; s < inv.getSize(); s++) if (inv.getItem(s) == null) inv.setItem(s, menuItem(Material.' + fill + ', " ", ""));');
      lines.push(IND + 'p.openInventory(inv);', '}');
      menuParts.push(lines.join('\n'));
    });
    guiClicks.forEach((top) => {
      const d = BY_ID[top.type];
      const ctx = newCtx(['player', 'orig'], '메뉴 칸을 눌렀을 때');
      ctx.owner = top.id;
      let idx;
      try { idx = ctx.menuIndex(fieldValue(d.args.MENU, fieldRaw(top, 'MENU', d.args.MENU.def))); } catch (err) { if (err instanceof Skip) return; throw err; }
      const slot = Math.round(Number(fieldValue(d.args.SLOT, fieldRaw(top, 'SLOT', 1))));
      const body = statements(inputBlock(top, 'DO'), ctx, 2);
      clickCases.push(IND + 'if (menu == ' + idx + ' && slot == ' + slot + ') {', ...body, IND + '}');
    });
    if (menus.length) {
      menuParts.push([
        '@EventHandler',
        'public void onMenuClick(InventoryClickEvent e) {',
        IND + 'if (!(e.getInventory().getHolder() instanceof MenuHolder)) return;',
        IND + 'e.setCancelled(true);   // 메뉴 안 아이템은 못 꺼냅니다',
        IND + 'if (!(e.getWhoClicked() instanceof Player)) return;',
        IND + 'if (e.getRawSlot() < 0 || e.getRawSlot() >= e.getInventory().getSize()) return;',
        IND + 'Player p = (Player) e.getWhoClicked();',
        IND + 'int menu = ((MenuHolder) e.getInventory().getHolder()).id;',
        IND + 'int slot = e.getRawSlot() + 1;',
        ...clickCases,
        '}',
        '',
        '@EventHandler',
        'public void onMenuDrag(InventoryDragEvent e) {',
        IND + 'if (e.getInventory().getHolder() instanceof MenuHolder) e.setCancelled(true);',
        '}',
        '',
        'private ItemStack menuItem(Material m, String name, String desc) {',
        IND + 'ItemStack it = new ItemStack(m);',
        IND + 'ItemMeta meta = it.getItemMeta();',
        IND + 'if (meta != null) {',
        IND + IND + 'meta.setDisplayName(name);',
        IND + IND + 'if (!desc.isEmpty()) meta.setLore(Arrays.asList(desc));',
        IND + IND + 'it.setItemMeta(meta);',
        IND + '}',
        IND + 'return it;',
        '}',
        '',
        '// 메뉴 칸에 놓을 아이템 (이름·설명이 비어 있으면 원래대로)',
        'private ItemStack guiItem(ItemStack it, String name, List<String> lore) {',
        IND + 'ItemMeta meta = it.getItemMeta();',
        IND + 'if (meta != null) {',
        IND + IND + 'if (name != null) meta.setDisplayName(name);',
        IND + IND + 'if (!lore.isEmpty()) meta.setLore(lore);',
        IND + IND + 'it.setItemMeta(meta);',
        IND + '}',
        IND + 'return it;',
        '}',
        '',
        'private ItemStack amount(ItemStack it, int n) { it.setAmount(n); return it; }',
        '',
        '// 우리 플러그인이 연 메뉴인지 알아보는 표시입니다',
        'public static class MenuHolder implements InventoryHolder {',
        IND + 'final int id;',
        IND + 'MenuHolder(int id) { this.id = id; }',
        IND + '@Override public Inventory getInventory() { return null; }',
        '}'
      ].join('\n'));
    }

    const textures = [];
    const usedCmd = new Set();
    const autoCmd = (key) => {
      let h = 5381;
      for (let i = 0; i < key.length; i++) h = ((h * 33) ^ key.charCodeAt(i)) >>> 0;
      let n = 100000 + (h % 800000);
      while (usedCmd.has(n)) n++;
      usedCmd.add(n);
      return n;
    };
    const itemParts = items.map((it) => {
      const t = it.block;
      let baseMat = 'STICK';
      let display = it.name;
      const lore = [];
      const extra = [];
      let glow = false;
      let enchanted = false;
      let png = null;
      let model = null;
      if (it.citem) {
        const D = it.citem;
        if (/^[A-Z][A-Z0-9_]*$/.test(String(D.base || ''))) baseMat = D.base;
        if (D.name != null && D.name !== '') display = D.name;
        (D.lore || []).forEach((l) => lore.push('c(' + javaString(l) + ')'));
        glow = !!D.glow;
        (D.enchants || []).forEach((en) => {
          const k = String(en.e || '').toLowerCase();
          if (!/^[a-z_]+$/.test(k)) return;
          enchanted = true;
          extra.push('{ Enchantment en = Enchantment.getByKey(NamespacedKey.minecraft("' + k + '")); if (en != null) meta.addEnchant(en, ' + Math.max(1, Math.min(255, Math.round(Number(en.lv)) || 1)) + ', true); }');
        });
        if (D.unbreakable) extra.push('meta.setUnbreakable(true);');
        if (D.model != null && D.model !== '' && isFinite(Number(D.model))) model = Math.round(Number(D.model));
        if (typeof D.texture === 'string' && D.texture.indexOf('data:image/png;base64,') === 0) png = D.texture;
      }
      if (!it.citem) chain(inputBlock(t, 'DO')).forEach((b) => {
        if (isOff(b)) return;
        const bd = BY_ID[b.type];
        if (!bd) return;
        const f = (n) => fieldValue(bd.args[n], fieldRaw(b, n, bd.args[n].def));
        if (b.type === 'pm_ip_base') baseMat = f('MAT');
        else if (b.type === 'pm_ip_name') display = fieldRaw(b, 'TEXT', '');
        else if (b.type === 'pm_ip_lore') lore.push('c(' + f('TEXT') + ')');
        else if (b.type === 'pm_ip_glow') glow = true;
        else if (b.type === 'pm_ip_enchant') {
          enchanted = true;
          extra.push('{ Enchantment en = Enchantment.getByKey(NamespacedKey.minecraft("' + f('ENCH').toLowerCase() + '")); if (en != null) meta.addEnchant(en, ' + Math.round(f('LV')) + ', true); }');
        } else if (b.type === 'pm_ip_unbreak') extra.push('meta.setUnbreakable(true);');
        else if (b.type === 'pm_ip_model') model = Math.round(f('N'));
        else if (b.type === 'pm_ip_texture') {
          const v = b.fields && b.fields.IMG;
          if (typeof v === 'string' && v.indexOf("data:image/png;base64,") === 0) png = v;
        }
      });
      if (png) {
        const cmd = model != null ? model : autoCmd(it.key);
        if (model != null) usedCmd.add(model);
        textures.push({ name: it.name, key: it.key, base: baseMat, cmd, png });
        model = cmd;
      }
      if (model != null) extra.push('meta.setCustomModelData(' + model + ');');
      if (glow && !enchanted) {
        extra.push('{ Enchantment g = Enchantment.getByKey(NamespacedKey.minecraft("unbreaking")); if (g != null) meta.addEnchant(g, 1, true); }');
        extra.push('meta.addItemFlags(ItemFlag.HIDE_ENCHANTS);');
      }
      return [
        '// 커스텀 아이템 "' + it.name.replace(/[\r\n]/g, ' ') + '"',
        'private ItemStack item_' + it.key + '() {',
        IND + 'ItemStack it = new ItemStack(Material.' + baseMat + ');',
        IND + 'ItemMeta meta = it.getItemMeta();',
        IND + 'if (meta != null) {',
        IND + IND + 'meta.setDisplayName(c(' + javaString(display) + '));',
        ...(lore.length ? [IND + IND + 'meta.setLore(Arrays.asList(' + lore.join(', ') + '));'] : []),
        ...extra.map((l) => IND + IND + l),
        IND + IND + 'meta.getPersistentDataContainer().set(new NamespacedKey(this, "pm_item"), org.bukkit.persistence.PersistentDataType.STRING, "' + it.key + '");',
        IND + IND + 'it.setItemMeta(meta);',
        IND + '}',
        IND + 'return it;',
        '}'
      ].join('\n');
    });

    const parts = [];
    if (enableBody.length) parts.push(['@Override', 'public void onEnable() {', ...enableBody, '}'].join('\n'));
    parts.push(...methods);
    if (commands.size) {
      const lines = ['@Override', 'public boolean onCommand(CommandSender sender, Command cmd, String label, String[] args) {'];
      commands.forEach((body, name) => {
        lines.push(
          IND + 'if (cmd.getName().equalsIgnoreCase(' + javaString(name) + ')) {',
          IND + IND + 'if (!(sender instanceof Player)) {',
          IND + IND + IND + 'sender.sendMessage("게임 안에서만 쓸 수 있습니다!");',
          IND + IND + IND + 'return true;',
          IND + IND + '}',
          IND + IND + 'Player p = (Player) sender;',
          ...body,
          IND + IND + 'return true;',
          IND + '}'
        );
      });
      lines.push(IND + 'return false;', '}');
      parts.push(lines.join('\n'));
    }
    parts.push(...menuParts, ...itemParts);

    let code = parts.join('\n\n');
    const helpers = [];
    const enableExtra = [];
    if (/\bn\(/.test(code)) {
      helpers.push([
        '// 숫자를 글자로 (100.0 → "100")',
        'private String n(double v) {',
        IND + 'if (v == Math.floor(v) && !Double.isInfinite(v)) return String.valueOf((long) v);',
        IND + 'return String.valueOf(Math.round(v * 100) / 100.0);',
        '}'
      ].join('\n'));
    }
    if (/(^|[^.\w])(getValue|setValue|topName)\(/m.test(code)) {
      helpers.push([
        '// 플레이어마다 저장되는 값 (서버를 껐다 켜도 남습니다)',
        'private double getValue(Player p, String key) {',
        IND + 'Double v = p.getPersistentDataContainer().get(new NamespacedKey(this, key), org.bukkit.persistence.PersistentDataType.DOUBLE);',
        IND + 'return v == null ? 0 : v;',
        '}',
        '',
        'private void setValue(Player p, String key, double value) {',
        IND + 'p.getPersistentDataContainer().set(new NamespacedKey(this, key), org.bukkit.persistence.PersistentDataType.DOUBLE, value);',
        '}'
      ].join('\n'));
    }
    if (/\b(getServerValue|setServerValue)\(/.test(code)) {
      helpers.push([
        '// 서버 전체에 하나 있는 값 (plugins/플러그인이름/config.yml 에 저장됩니다)',
        'private double getServerValue(String key) {',
        IND + 'return getConfig().getDouble("values." + key, 0);',
        '}',
        '',
        'private void setServerValue(String key, double value) {',
        IND + 'getConfig().set("values." + key, value);',
        IND + 'saveConfig();',
        '}'
      ].join('\n'));
    }
    if (/\bshowSidebar\(/.test(code)) {
      helpers.push([
        '// 화면 오른쪽 점수판',
        'private void showSidebar(Player p, String title, String line1, String line2) {',
        IND + 'Scoreboard sb = Bukkit.getScoreboardManager().getNewScoreboard();',
        IND + 'Objective o = sb.registerNewObjective("pm_side", "dummy", title);',
        IND + 'o.setDisplaySlot(DisplaySlot.SIDEBAR);',
        IND + 'if (!line1.isEmpty()) o.getScore(line1).setScore(2);',
        IND + 'if (!line2.isEmpty()) o.getScore(line2.equals(line1) ? line2 + " " : line2).setScore(1);',
        IND + 'p.setScoreboard(sb);',
        '}'
      ].join('\n'));
    }
    if (/\blookAt\(/.test(code)) {
      helpers.push([
        '// 플레이어가 바라보는 블록 위 (없으면 그 사람 자리)',
        'private Location lookAt(Player p) {',
        IND + 'Block b = p.getTargetBlockExact(60);',
        IND + 'return b != null ? b.getLocation().add(0.5, 1, 0.5) : p.getLocation();',
        '}'
      ].join('\n'));
    }
    if (/\bcool(Ready|Start|Left)\(/.test(code)) {
      helpers.push([
        '// 쿨타임 (플레이어마다 이름별로 기억합니다. 서버를 끄면 초기화됩니다)',
        'private final Map<String, Long> cooldowns = new HashMap<>();',
        '',
        'private boolean coolReady(Player p, String name) {',
        IND + 'Long until = cooldowns.get(p.getUniqueId() + ":" + name);',
        IND + 'return until == null || System.currentTimeMillis() >= until;',
        '}',
        '',
        'private void coolStart(Player p, String name, double seconds) {',
        IND + 'cooldowns.put(p.getUniqueId() + ":" + name, System.currentTimeMillis() + (long) (seconds * 1000));',
        '}',
        '',
        'private double coolLeft(Player p, String name) {',
        IND + 'Long until = cooldowns.get(p.getUniqueId() + ":" + name);',
        IND + 'if (until == null) return 0;',
        IND + 'return Math.max(0, Math.ceil((until - System.currentTimeMillis()) / 100.0) / 10.0);',
        '}'
      ].join('\n'));
    }
    if (/\b(showBar|hideBar)\(/.test(code)) {
      helpers.push([
        '// 화면 위 보스바 (플레이어마다 하나)',
        'private final Map<UUID, BossBar> bars = new HashMap<>();',
        '',
        'private void showBar(Player p, String title, BarColor color, double progress) {',
        IND + 'BossBar bar = bars.get(p.getUniqueId());',
        IND + 'if (bar == null) {',
        IND + IND + 'bar = Bukkit.createBossBar(title, color, BarStyle.SOLID);',
        IND + IND + 'bars.put(p.getUniqueId(), bar);',
        IND + '}',
        IND + 'bar.setTitle(title);',
        IND + 'bar.setColor(color);',
        IND + 'bar.setProgress(Math.max(0, Math.min(1, progress)));',
        IND + 'bar.addPlayer(p);',
        IND + 'bar.setVisible(true);',
        '}',
        '',
        'private void hideBar(Player p) {',
        IND + 'BossBar bar = bars.remove(p.getUniqueId());',
        IND + 'if (bar != null) bar.removeAll();',
        '}'
      ].join('\n'));
    }
    if (/\bfirework\(/.test(code)) {
      helpers.push([
        '// 폭죽 (터져도 아무도 안 다칩니다)',
        'private void firework(Location loc, Color color, FireworkEffect.Type type) {',
        IND + 'Firework fw = loc.getWorld().spawn(loc, Firework.class);',
        IND + 'FireworkMeta meta = fw.getFireworkMeta();',
        IND + 'meta.addEffect(FireworkEffect.builder().with(type).withColor(color).withFlicker().build());',
        IND + 'meta.setPower(0);',
        IND + 'fw.setFireworkMeta(meta);',
        IND + 'fw.setMetadata("pm_safe", new org.bukkit.metadata.FixedMetadataValue(this, true));',
        IND + 'Bukkit.getScheduler().runTaskLater(this, fw::detonate, 2L);',
        '}',
        '',
        '@EventHandler',
        'public void onSafeFirework(EntityDamageByEntityEvent e) {',
        IND + 'if (e.getDamager() instanceof Firework && e.getDamager().hasMetadata("pm_safe")) e.setCancelled(true);',
        '}'
      ].join('\n'));
    }
    if (/\b(arg|argNum|argRest)\(/.test(code)) {
      helpers.push([
        '// 명령어 뒤에 쓴 단어 (없으면 빈 글자 / 숫자가 아니면 0)',
        'private String arg(String[] a, int i) {',
        IND + 'return i >= 0 && i < a.length ? a[i] : "";',
        '}',
        '',
        'private double argNum(String[] a, int i) {',
        IND + 'try { return Double.parseDouble(arg(a, i)); } catch (NumberFormatException ex) { return 0; }',
        '}',
        '',
        'private String argRest(String[] a, int i) {',
        IND + 'if (i < 0 || i >= a.length) return "";',
        IND + 'return String.join(" ", Arrays.copyOfRange(a, i, a.length));',
        '}'
      ].join('\n'));
    }
    if (/\bisItem\(/.test(code)) {
      helpers.push([
        '// 이 아이템이 우리가 만든 커스텀 아이템인지 알아봅니다',
        'private boolean isItem(ItemStack it, String key) {',
        IND + 'if (it == null || !it.hasItemMeta()) return false;',
        IND + 'String v = it.getItemMeta().getPersistentDataContainer().get(new NamespacedKey(this, "pm_item"), org.bukkit.persistence.PersistentDataType.STRING);',
        IND + 'return key.equals(v);',
        '}'
      ].join('\n'));
    }
    if (/\b(savePLoc|loadPLoc|hasPLoc|delPLoc|saveSLoc|loadSLoc|hasSLoc|delSLoc|slocList|setText|getText|setFlag|getFlag)\(/.test(code)) {
      helpers.push([
        "// 한글 이름도 쓸 수 있게 이름을 영어 열쇠로 바꿉니다",
        "private NamespacedKey nk(String prefix, String name) {",
        "    StringBuilder sb = new StringBuilder(prefix);",
        "    for (byte b : name.getBytes(java.nio.charset.StandardCharsets.UTF_8)) sb.append(String.format(\"%02x\", b));",
        "    return new NamespacedKey(this, sb.toString());",
        "}"
      ].join('\n'));
    }
    if (/\b(savePLoc|loadPLoc|hasPLoc|delPLoc|saveSLoc|loadSLoc|hasSLoc|delSLoc|slocList)\(/.test(code)) {
      helpers.push([
        "// 위치 ↔ 글자 (월드,x,y,z,방향)",
        "private String locStr(Location l) {",
        "    return l.getWorld().getName() + \",\" + l.getX() + \",\" + l.getY() + \",\" + l.getZ() + \",\" + l.getYaw() + \",\" + l.getPitch();",
        "}",
        "",
        "private Location strLoc(String s) {",
        "    if (s == null) return null;",
        "    String[] a = s.split(\",\");",
        "    if (a.length < 6) return null;",
        "    World w = Bukkit.getWorld(a[0]);",
        "    if (w == null) return null;",
        "    try {",
        "        return new Location(w, Double.parseDouble(a[1]), Double.parseDouble(a[2]), Double.parseDouble(a[3]), Float.parseFloat(a[4]), Float.parseFloat(a[5]));",
        "    } catch (NumberFormatException ex) { return null; }",
        "}",
        "",
        "// 플레이어마다 저장하는 위치 (집, 죽은 곳...)",
        "private void savePLoc(Player p, String name, Location l) { p.getPersistentDataContainer().set(nk(\"l\", name), org.bukkit.persistence.PersistentDataType.STRING, locStr(l)); }",
        "private boolean hasPLoc(Player p, String name) { return strLoc(p.getPersistentDataContainer().get(nk(\"l\", name), org.bukkit.persistence.PersistentDataType.STRING)) != null; }",
        "private void delPLoc(Player p, String name) { p.getPersistentDataContainer().remove(nk(\"l\", name)); }",
        "private Location loadPLoc(Player p, String name) {",
        "    Location l = strLoc(p.getPersistentDataContainer().get(nk(\"l\", name), org.bukkit.persistence.PersistentDataType.STRING));",
        "    return l != null ? l : p.getWorld().getSpawnLocation();",
        "}",
        "",
        "// 서버 전체 위치 (스폰, 워프) - config.yml 의 locations 에 저장",
        "private String slocPath(String name) { return \"locations.\" + nk(\"s\", name).getKey(); }",
        "private void saveSLoc(String name, Location l) { getConfig().set(slocPath(name) + \".name\", name); getConfig().set(slocPath(name) + \".loc\", locStr(l)); saveConfig(); }",
        "private boolean hasSLoc(String name) { return strLoc(getConfig().getString(slocPath(name) + \".loc\")) != null; }",
        "private void delSLoc(String name) { getConfig().set(slocPath(name), null); saveConfig(); }",
        "private Location loadSLoc(String name) {",
        "    Location l = strLoc(getConfig().getString(slocPath(name) + \".loc\"));",
        "    return l != null ? l : Bukkit.getWorlds().get(0).getSpawnLocation();",
        "}",
        "private String slocList() {",
        "    ConfigurationSection sec = getConfig().getConfigurationSection(\"locations\");",
        "    if (sec == null) return \"\";",
        "    List<String> names = new ArrayList<>();",
        "    for (String k : sec.getKeys(false)) names.add(sec.getString(k + \".name\", k));",
        "    return String.join(\", \", names);",
        "}"
      ].join('\n'));
    }
    if (/\b(setText|getText)\(/.test(code)) {
      helpers.push([
        "// 플레이어마다 저장하는 글 (닉네임, 칭호...)",
        "private void setText(Player p, String name, String value) { p.getPersistentDataContainer().set(nk(\"t\", name), org.bukkit.persistence.PersistentDataType.STRING, value); }",
        "private String getText(Player p, String name) {",
        "    String v = p.getPersistentDataContainer().get(nk(\"t\", name), org.bukkit.persistence.PersistentDataType.STRING);",
        "    return v == null ? \"\" : v;",
        "}"
      ].join('\n'));
    }
    if (/\b(setFlag|getFlag)\(/.test(code)) {
      helpers.push([
        "// 플레이어마다 저장하는 켜짐/꺼짐 상태",
        "private void setFlag(Player p, String name, boolean on) { p.getPersistentDataContainer().set(nk(\"f\", name), org.bukkit.persistence.PersistentDataType.BYTE, (byte) (on ? 1 : 0)); }",
        "private boolean getFlag(Player p, String name) {",
        "    Byte v = p.getPersistentDataContainer().get(nk(\"f\", name), org.bukkit.persistence.PersistentDataType.BYTE);",
        "    return v != null && v == 1;",
        "}"
      ].join('\n'));
    }
    if (/\b(remember|recall|forget)\(/.test(code)) {
      helpers.push([
        "// 다른 플레이어 잠깐 기억하기 (서버를 끄면 잊습니다)",
        "private final Map<String, UUID> remembered = new HashMap<>();",
        "private void remember(Player p, String name, Player other) { remembered.put(p.getUniqueId() + \":\" + name, other.getUniqueId()); }",
        "private Player recall(Player p, String name) {",
        "    UUID id = remembered.get(p.getUniqueId() + \":\" + name);",
        "    return id == null ? null : Bukkit.getPlayer(id);",
        "}",
        "private void forget(Player p, String name) { remembered.remove(p.getUniqueId() + \":\" + name); }"
      ].join('\n'));
    }
    if (/\bvein\(/.test(code)) {
      helpers.push([
        "// 붙어 있는 같은 블록을 한꺼번에 부숩니다 (나무 베기 · 광물 캐기)",
        "private void vein(Block start, int max, ItemStack tool) {",
        "    Material type = start.getType();",
        "    java.util.ArrayDeque<Block> queue = new java.util.ArrayDeque<>();",
        "    Set<Block> seen = new HashSet<>();",
        "    queue.add(start);",
        "    seen.add(start);",
        "    int broken = 0;",
        "    while (!queue.isEmpty() && broken < max) {",
        "        Block b = queue.poll();",
        "        for (int dx = -1; dx <= 1; dx++) for (int dy = -1; dy <= 1; dy++) for (int dz = -1; dz <= 1; dz++) {",
        "            Block n = b.getRelative(dx, dy, dz);",
        "            if (n.getType() == type && seen.add(n)) queue.add(n);",
        "        }",
        "        if (b != start) { b.breakNaturally(tool); broken++; }",
        "    }",
        "}"
      ].join('\n'));
    }
    if (/\bdeathChest\(/.test(code)) {
      helpers.push([
        "// 죽은 자리에 상자를 놓고 떨어질 아이템을 넣습니다 (안 들어간 건 그냥 떨어집니다)",
        "private void deathChest(Player p, List<ItemStack> drops) {",
        "    if (drops.isEmpty()) return;",
        "    Block b = p.getLocation().getBlock();",
        "    b.setType(Material.CHEST);",
        "    if (!(b.getState() instanceof Chest)) return;",
        "    Chest chest = (Chest) b.getState();",
        "    List<ItemStack> left = new ArrayList<>();",
        "    for (ItemStack it : drops) if (it != null) left.addAll(chest.getBlockInventory().addItem(it).values());",
        "    drops.clear();",
        "    drops.addAll(left);",
        "    p.sendMessage(ChatColor.GOLD + \"아이템을 죽은 자리 상자에 넣어뒀습니다: \" + b.getX() + \", \" + b.getY() + \", \" + b.getZ());",
        "}"
      ].join('\n'));
    }
    if (/\bsit\(/.test(code)) {
      enableExtra.push("    // 앉은 사람이 일어나면 의자(안 보이는 갑옷 거치대)를 치웁니다",
        "    Bukkit.getScheduler().runTaskTimer(this, () -> {",
        "        for (World w : Bukkit.getWorlds()) for (ArmorStand a : w.getEntitiesByClass(ArmorStand.class))",
        "            if (a.getScoreboardTags().contains(\"pm_seat\") && a.getPassengers().isEmpty()) a.remove();",
        "    }, 20L, 20L);");
      helpers.push([
        "// 그 자리에 앉히기",
        "private void sit(Player p) {",
        "    if (p.isInsideVehicle()) return;",
        "    ArmorStand seat = p.getWorld().spawn(p.getLocation().clone().add(0, -1.7, 0), ArmorStand.class);",
        "    seat.setVisible(false);",
        "    seat.setGravity(false);",
        "    seat.setInvulnerable(true);",
        "    seat.addScoreboardTag(\"pm_seat\");",
        "    seat.addPassenger(p);",
        "}"
      ].join('\n'));
    }
    if (/\brtp\(/.test(code)) {
      helpers.push([
        "// 주변 아무 안전한 곳으로 순간이동 (물·용암·나뭇잎 위는 피합니다)",
        "private void rtp(Player p, int range) {",
        "    World w = p.getWorld();",
        "    Location c = p.getLocation();",
        "    for (int i = 0; i < 20; i++) {",
        "        int x = c.getBlockX() + (int) (Math.random() * range * 2) - range;",
        "        int z = c.getBlockZ() + (int) (Math.random() * range * 2) - range;",
        "        Block top = w.getHighestBlockAt(x, z);",
        "        Material m = top.getType();",
        "        if (m == Material.WATER || m == Material.LAVA || m == Material.CACTUS || m.name().contains(\"LEAVES\") || m.name().contains(\"MAGMA\")) continue;",
        "        p.teleport(top.getLocation().add(0.5, 1, 0.5));",
        "        return;",
        "    }",
        "    p.sendMessage(ChatColor.RED + \"안전한 곳을 찾지 못했습니다. 다시 해주세요.\");",
        "}"
      ].join('\n'));
    }
    if (/\bhead\(/.test(code)) {
      helpers.push([
        "// 플레이어 머리 아이템",
        "private ItemStack head(OfflinePlayer owner) {",
        "    ItemStack it = new ItemStack(Material.PLAYER_HEAD);",
        "    SkullMeta m = (SkullMeta) it.getItemMeta();",
        "    if (m != null) { m.setOwningPlayer(owner); it.setItemMeta(m); }",
        "    return it;",
        "}"
      ].join('\n'));
    }
    if (/\bnamed\(/.test(code)) {
      helpers.push([
        "// 이름 붙인 아이템",
        "private ItemStack named(Material m, int n, String name) {",
        "    ItemStack it = new ItemStack(m, n);",
        "    ItemMeta meta = it.getItemMeta();",
        "    if (meta != null) { meta.setDisplayName(name); it.setItemMeta(meta); }",
        "    return it;",
        "}"
      ].join('\n'));
    }
    if (/\b(hologram|npc|clearTagged)\(/.test(code)) {
      helpers.push([
        "// 떠 있는 글 (안 보이는 갑옷 거치대에 이름표)",
        "private void hologram(Location l, String text) {",
        "    ArmorStand a = l.getWorld().spawn(l, ArmorStand.class);",
        "    a.setVisible(false);",
        "    a.setGravity(false);",
        "    a.setMarker(true);",
        "    a.setInvulnerable(true);",
        "    a.setCustomName(text);",
        "    a.setCustomNameVisible(true);",
        "    a.addScoreboardTag(\"pm_holo\");",
        "}",
        "",
        "// 움직이지 않는 몹 (NPC)",
        "private void npc(Location l, EntityType type, String name) {",
        "    Entity en = l.getWorld().spawnEntity(l, type);",
        "    en.setCustomName(name);",
        "    en.setCustomNameVisible(true);",
        "    en.setInvulnerable(true);",
        "    en.setSilent(true);",
        "    en.addScoreboardTag(\"pm_npc\");",
        "    if (en instanceof LivingEntity) { ((LivingEntity) en).setAI(false); ((LivingEntity) en).setRemoveWhenFarAway(false); }",
        "}",
        "",
        "// 이 플러그인이 만든 것(표시가 붙은 것)만 지웁니다",
        "private void clearTagged(Location l, double r, String tag) {",
        "    for (Entity en : l.getWorld().getNearbyEntities(l, r, r, r)) if (en.getScoreboardTags().contains(tag)) en.remove();",
        "}"
      ].join('\n'));
    }
    if (/\bclearItems\(/.test(code)) {
      helpers.push([
        "// 땅에 떨어진 아이템 모두 치우기",
        "private int clearItems() {",
        "    int n = 0;",
        "    for (World w : Bukkit.getWorlds()) for (Item it : w.getEntitiesByClass(Item.class)) { it.remove(); n++; }",
        "    return n;",
        "}"
      ].join('\n'));
    }
    if (/\bsignLine\(/.test(code)) {
      helpers.push([
        "// 표지판 한 줄 (표지판이 아니면 빈 글자)",
        "private String signLine(Block b, int i) {",
        "    if (b == null || !(b.getState() instanceof Sign)) return \"\";",
        "    String s = ((Sign) b.getState()).getLine(i);",
        "    return s == null ? \"\" : ChatColor.stripColor(s);",
        "}"
      ].join('\n'));
    }
    if (/\bchatFormat\(/.test(code)) {
      helpers.push([
        "// {이름} {내용} 을 채팅 모양 기호로 바꿉니다",
        "private String chatFormat(String f) {",
        "    return f.replace(\"%\", \"%%\").replace(\"{이름}\", \"%1$s\").replace(\"{내용}\", \"%2$s\");",
        "}"
      ].join('\n'));
    }
    if (/\btopName\(/.test(code)) {
      helpers.push([
        "// 접속자 중 저장값이 제일 큰 사람",
        "private String topName(String key) {",
        "    Player best = null;",
        "    double bv = 0;",
        "    for (Player o : Bukkit.getOnlinePlayers()) {",
        "        double v = getValue(o, key);",
        "        if (best == null || v > bv) { best = o; bv = v; }",
        "    }",
        "    return best == null ? \"\" : best.getName();",
        "}"
      ].join('\n'));
    }
    if (helpers.length) code += '\n\n' + helpers.join('\n\n');
    if (enableExtra.length) {
      const head = 'public void onEnable() {';
      if (code.includes(head)) code = code.replace(head, head + '\n' + enableExtra.join('\n'));
      else code = ['@Override', head, ...enableExtra, '}'].join('\n') + '\n\n' + code;
    }
    if (/\bc\(/.test(code)) {
      code += '\n\n' + [
        '// &a 같은 색 코드를 진짜 색으로 바꿔줍니다',
        'private String c(String text) {',
        IND + "return ChatColor.translateAlternateColorCodes('&', text);",
        '}'
      ].join('\n');
    }
    if (code && typeof opts.convert === 'function') code = opts.convert(code);
    code = code.split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n').replace(/[ \t]+\/\/ [^"\n]*$/gm, '');
    return { code: code ? code + '\n' : '', problems, blockCount, commands: [...commands.keys()], textures, guiBackgrounds, guiNoHover };
  }

  const api = { generate, javaString, keyOf };
  root.PMGen = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
