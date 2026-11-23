(function () {
  const B = window.Blockly;
  const { DEFS, BY_ID, CATEGORIES } = window.PM_DEFS;

  const BODY = '#1c1c1c';
  const BODY_LINE = '#2e2e2e';
  const PILL = '#242424';
  const PILL_LINE = '#383838';
  const SLOT = '#0c0c0c';
  const EDGE = {};
  const catColor = {};
  CATEGORIES.forEach((c) => { catColor[c.id] = c.color; });
  DEFS.forEach((d) => { EDGE[d.id] = catColor[d.cat]; });

  const blockStyles = {
    pm_block: { colourPrimary: BODY, colourSecondary: SLOT, colourTertiary: BODY_LINE },
    pm_pill: { colourPrimary: PILL, colourSecondary: SLOT, colourTertiary: PILL_LINE }
  };
  const darker = (hex, k) => '#' + [1, 3, 5].map((i) => Math.round(parseInt(hex.slice(i, i + 2), 16) * k).toString(16).padStart(2, '0')).join('');
  CATEGORIES.forEach((c) => {
    const deep = c.deep || c.color;
    blockStyles['pm_cat_' + c.id] = { colourPrimary: deep, colourSecondary: SLOT, colourTertiary: darker(deep, 0.72) };
  });
  const categoryStyles = {};
  CATEGORIES.forEach((c) => { categoryStyles['pm_' + c.id + '_cat'] = { colour: c.color }; });

  const theme = B.Theme.defineTheme('pm_dark', {
    base: B.Themes.Classic,
    blockStyles,
    categoryStyles,
    componentStyles: {
      workspaceBackgroundColour: '#0c0c0c',
      toolboxBackgroundColour: '#0f0f0f',
      toolboxForegroundColour: '#ececec',
      flyoutBackgroundColour: '#151515',
      flyoutForegroundColour: '#999999',
      flyoutOpacity: 1,
      scrollbarColour: '#2e2e2e',
      scrollbarOpacity: 0.9,
      insertionMarkerColour: '#6ee7c8',
      insertionMarkerOpacity: 0.3,
      cursorColour: '#6ee7c8',
      selectedGlowColour: '#6ee7c8',
      selectedGlowSize: 1.5
    },
    fontStyle: { family: "'Pretendard', 'Segoe UI', 'Malgun Gothic', sans-serif", weight: '600', size: 12 },
    startHats: true
  });

  class PMConstants extends B.zelos.ConstantProvider {
    constructor() {
      super();
      this.FIELD_BORDER_RECT_COLOUR = SLOT;
      this.SELECTED_GLOW_SIZE = 0.5;
    }
  }
  class PMPath extends B.zelos.PathObject {
    constructor(root, style, constants) {
      super(root, style, constants);
      this.svgEdge = B.utils.dom.createSvgElement('path', { class: 'pmEdge', 'clip-path': 'url(#pm-edge-clip)' }, root);
    }
    setPath(d) {
      super.setPath(d);
      this.svgEdge.setAttribute('d', d);
    }
    applyColour(block) {
      super.applyColour(block);
      this.svgEdge.setAttribute('fill', EDGE[block.type] || 'transparent');
      this.svgEdge.style.display = block.isShadow() ? 'none' : '';
    }
  }
  class PMRenderer extends B.zelos.Renderer {
    makeConstants_() { return new PMConstants(); }
    makePathObject(root, style) { return new PMPath(root, style, this.getConstants()); }
  }
  B.blockRendering.register('pm', PMRenderer);

  const CHOICE_TITLE = { material: '아이템·블록', block: '블록 (설치되는 것만)', mccmd: '마크 명령어', sound: '소리', effect: '효과', entity: '몹', particle: '파티클', enchant: '마법', damagecause: '다친 이유', gamerule: '게임 규칙' };
  class FieldChoice extends B.FieldDropdown {
    constructor(type, def) {
      super(function () {
        const seen = new Set();
        const opts = [];
        window.choiceItems(type).forEach((it) => {
          if (seen.has(it.v)) return;
          seen.add(it.v);
          opts.push([it.k, it.v]);
        });
        if (!seen.has('AIR') && def === 'AIR') { seen.add('AIR'); opts.unshift(['(빈칸)', 'AIR']); }
        [def, this && this.pending_, this && typeof this.getValue === 'function' ? this.getValue() : null].forEach((v) => {
          if (v && !seen.has(v)) { seen.add(v); opts.unshift([v === 'AIR' ? '(빈칸)' : v, v]); }
        });
        return opts;
      });
      this.choiceType_ = type;
      this.def_ = def;
      this.setValue(def);
    }
    showEditor_(e) {
      const type = this.choiceType_;
      const items = window.choiceItems(type);
      if (items.length <= 12) { super.showEditor_(e); return; }
      const extra = this.def_ === 'AIR' ? [{ v: 'AIR', k: '(빈칸)', g: '' }] : [];
      window.openPicker(this.borderRect_ || this.getSvgRoot(), { title: CHOICE_TITLE[type] || '고르기', items, value: this.getValue(), extra }, (v) => this.setValue(v));
    }
    doClassValidation_(v) {
      if (typeof v !== 'string' || !/^[A-Za-z0-9_-]+$/.test(v)) return null;
      this.pending_ = v;
      try { this.getOptions(false); } catch (e) {  }
      return v;
    }
    static fromJson(o) { return new FieldChoice(o.choice, o.value); }
  }
  B.fieldRegistry.register('field_pm_choice', FieldChoice);
  if (window.MCCAT) window.MCCAT.onReady(() => {
    const ws = [B.getMainWorkspace()];
    const fly = ws[0] && ws[0].getFlyout && ws[0].getFlyout();
    if (fly && fly.getWorkspace) ws.push(fly.getWorkspace());
    ws.forEach((w) => w && w.getAllBlocks(false).forEach((b) => b.inputList.forEach((inp) => inp.fieldRow.forEach((f) => {
      if (!(f instanceof FieldChoice)) return;
      try { f.getOptions(false); f.doValueUpdate_(f.getValue()); f.forceRerender(); } catch (e) {  }
    }))));
  });

  {
    const make = B.FieldNumber.prototype.widgetCreate_;
    B.FieldNumber.prototype.widgetCreate_ = function () {
      const input = make.call(this);
      if (input && input.setAttribute) input.setAttribute('inputmode', 'decimal');
      return input;
    };
  }

  class FieldRef extends B.FieldDropdown {
    constructor(defType, def) {
      super(function () {
        const main = B.getMainWorkspace();
        const names = [];
        if (main) {
          main.getTopBlocks(false).forEach((b) => {
            if (!(Array.isArray(defType) ? defType.includes(b.type) : b.type === defType)) return;
            const n = String(b.getFieldValue('NAME') || '').trim();
            if (n && !names.includes(n)) names.push(n);
          });
        }
        [this && this.pending_, this && typeof this.getValue === 'function' ? this.getValue() : null].forEach((v) => {
          if (v && !names.includes(v)) names.unshift(v);
        });
        if (!names.length) names.push(def);
        return names.map((n) => [n, n]);
      });
      this.setValue(def);
    }
    doClassValidation_(v) {
      if (typeof v !== 'string' || !v.trim()) return null;
      this.pending_ = v;
      try { this.getOptions(false); } catch (e) {  }
      return v;
    }
    static fromJson(o) { return new FieldRef(o.ref, o.value); }
  }
  B.fieldRegistry.register('field_pm_ref', FieldRef);

  class FieldColorText extends B.FieldTextInput {
    getDisplayText_() {
      let t = window.RichText.strip(this.getValue() || '');
      if (this.maxDisplayLength && t.length > this.maxDisplayLength) t = t.substring(0, this.maxDisplayLength - 2) + '…';
      return t.replace(/\s/g, B.Field.NBSP) || B.Field.NBSP;
    }
    render_() {
      const t = this.textElement_;
      if (t && this.textContent_) { while (t.firstChild) t.removeChild(t.firstChild); t.appendChild(this.textContent_); }
      super.render_();
      if (t && this.textContent_ && window.RichText.styled(window.RichText.parse(this.getValue() || ''))) {
        t.removeChild(this.textContent_);
        window.RichText.renderSvg(t, this.getValue() || '');
      }
    }
    showEditor_() {
      const blk = this.getSourceBlock();
      if (!blk || blk.isInFlyout) return;
      window.RichText.open('글자 쓰기 · 색과 굵기를 고릅니다', this.getValue() || '', (v) => this.setValue(v));
    }
    static fromJson(o) { return new FieldColorText(o.text); }
  }
  B.fieldRegistry.register('field_pm_ctext', FieldColorText);

  function customItemsNow() {
    const main = B.getMainWorkspace();
    const out = [];
    if (!main) return out;
    main.getTopBlocks(false).forEach((b) => {
      const n = String(b.getFieldValue('NAME') || '').trim();
      if (!n) return;
      if (b.type === 'pm_citem') out.push({ name: n, texture: (b.data_ && b.data_.texture) || null, base: (b.data_ && b.data_.base) || 'STICK' });
      if (b.type === 'pm_item_def') out.push({ name: n, texture: null, base: 'STICK' });
    });
    return out;
  }
  function menuNamesNow() {
    const main = B.getMainWorkspace();
    return main ? main.getTopBlocks(false).filter((b) => b.type === 'pm_gui' || b.type === 'pm_menu_def').map((b) => String(b.getFieldValue('NAME') || '').trim()).filter(Boolean) : [];
  }
  function applyDesign(block, key, value) {
    const old = JSON.stringify(block.saveExtraState());
    block[key] = value;
    block.refreshThumb_();
    B.Events.fire(new (B.Events.get(B.Events.BLOCK_CHANGE))(block, 'mutation', null, old, JSON.stringify(block.saveExtraState())));
  }
  function openDesign(block) {
    if (!block || block.isInFlyout) return;
    const name = String(block.getFieldValue('NAME') || '').trim();
    if (block.type === 'pm_gui') {
      window.openGuiDesigner(block.layout_, {
        name, customItems: customItemsNow(), menus: menuNamesNow(),
        onMakeBlock: (slot) => {
          const ws2 = block.workspace;
          const st = { type: 'pm_gui_click', fields: { MENU: name, SLOT: slot } };
          const xy = block.getRelativeToSurfaceXY();
          const nb = B.serialization.blocks.append(Object.assign(st, { x: xy.x + block.getHeightWidth().width + 40, y: xy.y }), ws2);
          ws2.centerOnBlock(nb.id);
          toast(slot + '번 칸을 눌렀을 때 블록을 만들었습니다. 안에 하고 싶은 일을 넣습니다');
        }
      }, (L) => applyDesign(block, 'layout_', L));
    } else if (block.type === 'pm_citem') {
      window.openItemDesigner(block.data_, { name }, (D) => applyDesign(block, 'data_', D));
    }
  }
  class FieldDesign extends B.FieldImage {
    constructor(kind) {
      super(kind === 'gui' ? window.guiThumb(window.defaultGuiLayout()) : window.itemThumb(null), kind === 'gui' ? 47 : 30, kind === 'gui' ? 32 : 30, '눌러서 꾸미기', (f) => openDesign(f.getSourceBlock()));
    }
    static fromJson(o) { return new FieldDesign(o.design); }
  }
  B.fieldRegistry.register('field_pm_design', FieldDesign);

  const TEX_PLACEHOLDER = (() => {
    const c = document.createElement('canvas');
    c.width = 16; c.height = 16;
    const k = c.getContext('2d');
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { k.fillStyle = (x + y) % 2 ? '#2e2e2e' : '#222222'; k.fillRect(x, y, 1, 1); }
    k.fillStyle = '#6ee7c8';
    k.fillRect(7, 3, 2, 10); k.fillRect(3, 7, 10, 2);
    return c.toDataURL('image/png');
  })();
  class FieldTexture extends B.FieldImage {
    constructor(value) {
      super(value || TEX_PLACEHOLDER, 30, 30, '그림', (f) => f.openPainter());
      this.SERIALIZABLE = true;
    }
    openPainter() {
      const blk = this.getSourceBlock();
      if (!blk || blk.isInFlyout) return;
      const def = blk.getSurroundParent();
      const title = def && def.type === 'pm_item_def' ? def.getFieldValue('NAME') : '';
      const v = this.getValue();
      window.openPixelEditor(v, (png) => this.setValue(png), { title, isPlaceholder: v === TEX_PLACEHOLDER });
    }
    saveState() { const v = this.getValue(); return v === TEX_PLACEHOLDER ? null : v; }
    loadState(v) { if (typeof v === 'string' && /^data:image\/png;base64,/.test(v)) this.setValue(v); }
    static fromJson(o) { return new FieldTexture(o.value); }
  }
  B.fieldRegistry.register('field_pm_texture', FieldTexture);

  const TRIGGERS = DEFS.filter((d) => d.kind === 'trigger');
  const NEED_LABEL = { player: '그 플레이어', block: '그 블록', mob: '잡은 몹', item: '그 아이템', msg: '채팅 내용', cancel: '막기', evmsg: '알림 메시지', damage: '피해', target: '그 대상', loc: '그 위치', args: '명령어 단어', cmdsender: '명령어 친 사람', explosion: '폭발',
    orig: '처음 플레이어', drops: '떨어지는 아이템', death: '죽음', bdrops: '블록 드롭', respawn: '다시 태어날 곳', ping: '서버 목록', login: '접속', sign: '표지판', chatfmt: '채팅 모양' };
  const TOO_LATE = new Set(['cancel', 'evmsg', 'damage']);
  const short = (t) => t.replace(/^\/\{\w+\} /, '/명령어 ').replace(/\{\w+\}/g, 'N');

  function staticNeeds(d, seen) {
    seen = seen || new Set();
    if (seen.has(d.id)) return new Set();
    seen.add(d.id);
    const out = new Set(d.needs || []);
    Object.values(d.args || {}).forEach((s) => {
      if (s.shadow && BY_ID[s.shadow.type]) staticNeeds(BY_ID[s.shadow.type], seen).forEach((n) => out.add(n));
    });
    return out;
  }
  function placesText(needs) {
    if (!needs.size) return '';
    const ok = TRIGGERS.filter((t) => [...needs].every((n) => (t.provides || []).includes(n)));
    const no = TRIGGERS.filter((t) => !ok.includes(t));
    if (needs.size === 1 && needs.has('player')) {
      return '쓸 수 있는 곳: 플레이어가 있는 "~했을 때" 전부와 메뉴 칸.\n' +
        no.map((t) => '"' + short(t.text) + '"').join(', ') + ' 에서는 "모든 플레이어 한 명씩" 안에 넣어야 합니다.';
    }
    if (!ok.length) return '';
    return '쓸 수 있는 곳: ' + ok.map((t) => '"' + short(t.text) + '"').join(', ');
  }
  const PLACES = {};
  DEFS.forEach((d) => { PLACES[d.id] = placesText(staticNeeds(d)); });

  function argJson(name, spec) {
    if (spec.in === 'value') return { type: 'input_value', name, check: spec.check };
    switch (spec.field) {
      case 'number':
        return { type: 'field_number', name, value: spec.def, min: spec.min, max: spec.max, precision: spec.step || 1 };
      case 'choice':
        return { type: 'field_pm_choice', name, choice: spec.list, value: spec.def };
      case 'options':
        return { type: 'field_dropdown', name, options: spec.options };
      case 'var':
        return { type: 'field_variable', name, variable: spec.def, variableTypes: [spec.vtype], defaultType: spec.vtype };
      case 'ref':
        return { type: 'field_pm_ref', name, ref: spec.ref, value: spec.def };
      case 'texture':
        return { type: 'field_pm_texture', name, value: null };
      case 'ctext':
        return { type: 'field_pm_ctext', name, text: spec.def == null ? '' : String(spec.def) };
      case 'design':
        return { type: 'field_pm_design', name, design: spec.design };
      case 'variant':
        return { type: 'field_dropdown', name, options: spec.options };
      default:
        return { type: 'field_input', name, text: spec.def == null ? '' : String(spec.def) };
    }
  }

  const STMT = 'Statement';
  function blockJson(d) {
    const tip = [d.tip || '', d.since ? '마크 ' + d.since + ' 이상에서만 됩니다.' : '', PLACES[d.id]].filter(Boolean).join('\n\n');
    const j = { type: d.id, style: d.kind === 'value' ? 'pm_pill' : 'pm_block', tooltip: tip, inputsInline: true };
    let n = 0;
    String(d.text).split('\n').forEach((line) => {
      const args = [];
      j['message' + n] = line.replace(/\{(\w+)\}/g, (_, name) => {
        args.push(argJson(name, d.args[name]));
        return '%' + args.length;
      });
      j['args' + n] = args;
      n++;
    });
    if (n > 1) j.inputsInline = false;
    const stmt = (name, check, label) => {
      j['message' + n] = (label ? label + ' ' : '') + '%1';
      j['args' + n] = [{ type: 'input_statement', name, check }];
      n++;
    };
    const plain = (label) => { j['message' + n] = label; j['args' + n] = []; n++; };
    switch (d.kind) {
      case 'trigger': stmt('DO', STMT); break;
      case 'menu': stmt('DO', 'MenuItem'); break;
      case 'itemdef': stmt('DO', 'ItemProp'); break;
      case 'recipe': case 'gui': case 'citem': break;
      case 'control':
        if (d.branches) {
          d.branches.forEach((name, i) => { if (i) plain('또는'); stmt(name, STMT); });
        } else {
          stmt('DO', STMT);
          if (d.elseBranch) { plain(d.elseLabel || '아니면'); stmt('ELSE', STMT); }
        }
        j.previousStatement = STMT; j.nextStatement = STMT;
        break;
      case 'action': j.previousStatement = STMT; j.nextStatement = STMT; break;
      case 'stop': j.previousStatement = STMT; break;
      case 'menuitem':
        if (d.branch) stmt('DO', STMT, '누르면');
        j.previousStatement = 'MenuItem'; j.nextStatement = 'MenuItem';
        break;
      case 'itemprop': j.previousStatement = 'ItemProp'; j.nextStatement = 'ItemProp'; break;
      case 'cond': j.output = 'Boolean'; break;
      default: j.output = d.output;
    }
    return j;
  }

  const defOfBlock = (b) => {
    const d = BY_ID[b.type];
    if (d && d.variants) { const v = b.getFieldValue && b.getFieldValue('KIND'); return BY_ID[v] || BY_ID[d.variants[0][1]]; }
    return d;
  };
  window.pmDefOfBlock = defOfBlock;
  const ICON = (sym) => 'data:image/svg+xml;base64,' + btoa('<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><circle cx="10" cy="10" r="9" fill="#151515" stroke="#6ee7c8" stroke-width="1.5"/><path d="' + (sym === '+' ? 'M10 5.5v9M5.5 10h9' : 'M5.5 10h9') + '" stroke="#6ee7c8" stroke-width="2" stroke-linecap="round"/></svg>');
  const LETTERS = 'ABCDEFGHIJKL';
  function makeVariadic(block, d) {
    const v = d.variadic;
    block.count_ = v.def;
    const change = (field, delta) => {
      const blk = field.getSourceBlock();
      if (!blk || blk.isInFlyout) return;
      const n = Math.max(v.min, Math.min(v.max, blk.count_ + delta));
      if (n === blk.count_) return;
      const old = JSON.stringify(blk.saveExtraState());
      blk.count_ = n;
      blk.updateShape_();
      B.Events.fire(new (B.Events.get(B.Events.BLOCK_CHANGE))(blk, 'mutation', null, old, JSON.stringify(blk.saveExtraState())));
    };
    const names = () => {
      if (v.kind === 'ifchain') { const out = []; for (let i = 0; i <= block.count_; i++) out.push('COND' + i, 'DO' + i); return out.concat('ELSE'); }
      return LETTERS.slice(0, block.count_).split('');
    };
    const unplugAndRemove = (name) => {
      const inp = block.getInput(name);
      if (!inp) return;
      const t = inp.connection && inp.connection.targetBlock();
      if (t && !t.isShadow()) t.unplug();
      block.removeInput(name);
    };
    block.updateShape_ = function () {
      const want = names();
      this.inputList.map((i) => i.name).filter((nm) => nm && nm !== 'HEAD' && nm !== 'BTN' && !/^(SEP_|THEN_)/.test(nm) && !want.includes(nm)).forEach(unplugAndRemove);
      want.forEach((nm, i) => {
        if (this.getInput(nm)) return;
        if (v.kind === 'statement') {
          if (i > 0) this.appendDummyInput('SEP_' + nm).appendField(v.sep);
          this.appendStatementInput(nm).setCheck('Statement');
        } else if (v.kind === 'ifchain') {
          if (nm === 'ELSE') { this.appendDummyInput('SEP_ELSE').appendField('아니면'); this.appendStatementInput('ELSE').setCheck('Statement'); }
          else if (nm.startsWith('COND')) this.appendValueInput(nm).setCheck('Boolean').appendField(nm === 'COND0' ? '만약' : '아니면 만약');
          else { this.appendDummyInput('THEN_' + nm).appendField('이라면'); this.appendStatementInput(nm).setCheck('Statement'); }
        } else {
          const inp = this.appendValueInput(nm).setCheck(v.check);
          if (i > 0) inp.appendField(v.sep);
          if (v.shadow) {
            const sh = this.workspace.newBlock(v.shadow.type);
            if (v.shadow.fields) Object.keys(v.shadow.fields).forEach((f) => sh.setFieldValue(v.shadow.fields[f], f));
            sh.setShadow(true);
            if (this.rendered) { sh.initSvg(); sh.render(); }
            inp.connection.connect(sh.outputConnection);
          }
        }
      });
      this.inputList.filter((i) => i.name && i.name.startsWith('SEP_') && !want.includes(i.name.slice(4))).map((i) => i.name).forEach((nm) => this.removeInput(nm));
      this.inputList.filter((i) => i.name && i.name.startsWith('THEN_') && !want.includes(i.name.slice(5))).map((i) => i.name).forEach((nm) => this.removeInput(nm));
      if (v.kind === 'ifchain') { this.moveInputBefore('SEP_ELSE', null); this.moveInputBefore('ELSE', null); }
      if (this.getInput('BTN')) this.removeInput('BTN');
      const btn = this.appendDummyInput('BTN');
      if (v.kind === 'statement' || v.kind === 'ifchain') btn.appendField(v.kind === 'ifchain' ? '아니면 만약 칸' : '칸');
      btn.appendField(new B.FieldImage(ICON('+'), 18, 18, '더하기', (f) => change(f, 1)));
      btn.appendField(new B.FieldImage(ICON('-'), 18, 18, '빼기', (f) => change(f, -1)));
      if (v.kind !== 'statement' && v.kind !== 'ifchain') {
      } else {
        if (v.kind === 'statement') this.moveInputBefore('BTN', want[0]);
      }
    };
    block.saveExtraState = function () { return { count: this.count_ }; };
    block.loadExtraState = function (st) { this.count_ = Math.max(v.min, Math.min(v.max, Number(st && st.count) || v.def)); this.updateShape_(); };
    block.updateShape_();
  }

  DEFS.forEach((d) => {
    const json = blockJson(d);
    B.Blocks[d.id] = {
      init() {
        if (d.variadic) {
          this.jsonInit(Object.assign({}, json, d.variadic.head != null ? { message0: d.variadic.head, args0: [] } : { message0: '', args0: [] }, { message1: undefined, args1: undefined, message2: undefined, args2: undefined, message3: undefined, args3: undefined, message4: undefined, args4: undefined }));
          makeVariadic(this, d);
          return;
        }
        this.jsonInit(json);
        if (d.kind === 'gui' || d.kind === 'citem') {
          const key = d.kind === 'gui' ? 'layout_' : 'data_';
          this[key] = d.kind === 'gui' ? window.defaultGuiLayout() : window.defaultItemData();
          this.refreshThumb_ = function () {
            const f = this.getField('EDIT');
            if (f) f.setValue(d.kind === 'gui' ? window.guiThumb(this.layout_) : window.itemThumb(this.data_));
          };
          this.saveExtraState = function () { return d.kind === 'gui' ? { layout: this.layout_ } : { data: this.data_ }; };
          this.loadExtraState = function (st) {
            if (d.kind === 'gui' && st && st.layout) this.layout_ = Object.assign(window.defaultGuiLayout(), st.layout);
            if (d.kind === 'citem' && st && st.data) this.data_ = Object.assign(window.defaultItemData(), st.data);
            this.refreshThumb_();
          };
        }
        if (d.variants) {
          this.setTooltip(() => { const v = BY_ID[this.getFieldValue('KIND')]; return v ? [v.tip || '', v.since ? '마크 ' + v.since + ' 이상에서만 됩니다.' : '', PLACES[v.id]].filter(Boolean).join('\n\n') : ''; });
        }
        Object.keys(d.args || {}).forEach((name) => {
          if (d.args[name].field === 'word') {
            this.getField(name).setValidator((v) => String(v).toLowerCase().replace(/[^a-z0-9_-]/g, '') || null);
          }
        });
      }
    };
  });

  function needsOf(block) {
    const out = new Set();
    const walk = (b, hasPlayer) => {
      const d = defOfBlock(b);
      if (d && d.needs) d.needs.forEach((n) => { if (!(n === 'player' && hasPlayer)) out.add(n); });
      const inner = hasPlayer || !!(d && (d.loop === 'player' || d.find));
      const next = b.getNextBlock();
      b.getChildren(false).forEach((c) => walk(c, c === next ? hasPlayer : inner));
    };
    walk(block, false);
    return out;
  }
  function ctxAt(conn) {
    const b = conn.getSourceBlock();
    const has = new Set();
    let late = false;
    let title = '';
    let isFindInner = false;
    const apply = (blk, viaInput) => {
      const d = BY_ID[blk.type];
      isFindInner = viaInput === 'DO';
      if (!d) return;
      if (d.loop === 'player') has.add('player');
      if ((d.find === 'player' || d.find === 'remembered' || d.find === 'target') && isFindInner) has.add('player');
      if (blk.type === 'pm_wait') late = true;
      if (blk.type === 'pm_menu_button') { has.add('player'); has.add('orig'); title = title || '메뉴 칸'; }
    };
    const isStatementInput = conn.type === B.ConnectionType.NEXT_STATEMENT && conn !== b.nextConnection;
    const inputNameOf = (parent, childBlock) => {
      const inp = parent.inputList.find((i) => i.connection && i.connection.targetBlock() && childBlock.getRootBlock && isInside(i.connection.targetBlock(), childBlock));
      return inp ? inp.name : null;
    };
    const isInside = (top, blk) => { for (let x = blk; x; x = x.getParent()) if (x === top) return true; return false; };
    if (isStatementInput) apply(b, b.inputList.find((i) => i.connection === conn) ? b.inputList.find((i) => i.connection === conn).name : null);
    let prev = b;
    for (let p = b.getSurroundParent(); p; p = p.getSurroundParent()) { apply(p, inputNameOf(p, prev)); prev = p; }
    const root = b.getRootBlock();
    const rd = defOfBlock(root);
    if (!rd) return null;
    if (rd.kind === 'trigger') {
      (rd.provides || []).forEach((n) => has.add(n));
      if ((rd.provides || []).includes('player')) has.add('orig');
      title = title || short(rd.text);
    }
    else if (rd.kind !== 'menu') return null;
    return { has, late, title: title || '여기' };
  }
  function whyNot(dragged, conn) {
    const ctx = ctxAt(conn);
    if (!ctx) return null;
    for (const n of needsOf(dragged)) {
      if (!ctx.has.has(n)) return '"' + ctx.title + '" 안에는 "' + NEED_LABEL[n] + '"이(가) 없습니다';
      if (ctx.late && TOO_LATE.has(n)) return '"~초 뒤에" 안에서는 "' + NEED_LABEL[n] + '"이(가) 소용없습니다';
    }
    return null;
  }
  class PMChecker extends B.ConnectionChecker {
    doDragChecks(a, b, distance) {
      if (!super.doDragChecks(a, b, distance)) return false;
      return !whyNot(a.getSourceBlock(), b);
    }
  }
  B.registry.register(B.registry.Type.CONNECTION_CHECKER, 'pm_checker', PMChecker, true);

  function paletteInputs(d) {
    const inputs = {};
    Object.keys(d.args || {}).forEach((name) => {
      const spec = d.args[name];
      const preset = d.preset && d.preset[name];
      if (spec.shadow || preset) inputs[name] = Object.assign({}, spec.shadow ? { shadow: spec.shadow } : {}, preset || {});
    });
    return inputs;
  }
  const ADVANCED = /^pm_(ploc|sloc|ptext|pflag|loc_|t_|sign|block_sign|holo|npc|spawner|recipe|furnace|cool_left|arg_rest|arg_count|math|round|now_sec|today|orig_player|as_target|find_player|if_chain|contains|text_eq|block_name|hand_name|item_cd|bexp|drop_exp|no_bdrops|clear_drops|damage_mult|cause_is|has_ench|console|mc_cmd|player_cmd|resourcepack|gamerule|difficulty|login_deny|motd|maxplayers|chat_format|tab_hf|set_evmsg|hide_evmsg|remember|forget|remembered|top_name|vein|cmd_sender|new_slot|tp_loc|g_world|set_chat|gvar|g_who_str|g_who_num_val|block_is_sign|t_is|mob_is|world_is|under_is)/;
  let easy = true;
  try { easy = localStorage.getItem('pm.level') !== 'all'; } catch (e) {  }
  const shown = (d) => !(easy && ADVANCED.test(d.id));
  function paletteFor(catId, varFields) {
    const out = [];
    const labels = (window.PM_DEFS.GROUP_LABELS || {})[catId] || {};
    let lastGroup = null;
    DEFS.filter((d) => d.cat === catId && !d.hidden && shown(d) && (!d.since || window.MC.cmp(window.MC.version, d.since) >= 0)).forEach((d) => {
      const g = String(d.group);
      if (g !== lastGroup && labels[g]) out.push({ kind: 'label', text: labels[g] });
      lastGroup = g;
      const entry = { kind: 'block', type: d.id, inputs: paletteInputs(d) };
      if (varFields) {
        const f = {};
        Object.keys(d.args || {}).forEach((n) => { if (d.args[n].field === 'var' && varFields[d.args[n].vtype]) f[n] = varFields[d.args[n].vtype]; });
        if (Object.keys(f).length) entry.fields = f;
      }
      out.push(entry);
    });
    return out;
  }
  {
    const ICONS = {
      event: 'M13 2 3 14h9l-1 8 10-12h-9l1-8z',
      flow: 'M6 3v12M18 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM18 9a9 9 0 0 1-9 9',
      cond: 'M12 2 22 12 12 22 2 12zM12 8v4M12 16h.01',
      message: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
      player: 'M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
      world: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM2 12h20M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20z',
      data: 'M3 5c0 1.7 4 3 9 3s9-1.3 9-3-4-3-9-3-9 1.3-9 3zM3 5v14c0 1.7 4 3 9 3s9-1.3 9-3V5M3 12c0 1.7 4 3 9 3s9-1.3 9-3',
      gui: 'M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z',
      item: 'M6 3h12l4 6-10 13L2 9zM2 9h20M11 3 8 9l4 13 4-13-3-6',
      value: 'M21 8 12 3 3 8v8l9 5 9-5zM3 8l9 5 9-5M12 13v8'
    };
    const css = CATEGORIES.map((c) => {
      const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="' + (ICONS[c.id] || ICONS.value) + '"/></svg>';
      return '#ws-card .pm-ic-' + c.id + '{background-color:#7a7a7a;-webkit-mask-image:url("data:image/svg+xml;base64,' + btoa(svg) + '");mask-image:url("data:image/svg+xml;base64,' + btoa(svg) + '");}';
    }).join('\n') + '\n' + CATEGORIES.map((c) => '#ws-card .blocklyToolboxSelected .pm-ic-' + c.id + ', #ws-card .blocklyToolboxCategory:hover .pm-ic-' + c.id + '{background-color:' + c.color + ';}').join('\n');
    const st = document.createElement('style');
    st.textContent = css;
    document.head.append(st);
  }
  const makeToolbox = () => ({
    kind: 'categoryToolbox',
    contents: CATEGORIES.map((c) => (c.id === 'data'
      ? { kind: 'category', name: c.name, categorystyle: 'pm_' + c.id + '_cat', cssconfig: { icon: 'blocklyToolboxCategoryIcon pm-ic pm-ic-' + c.id }, custom: 'PM_DATA' }
      : { kind: 'category', name: c.name, categorystyle: 'pm_' + c.id + '_cat', cssconfig: { icon: 'blocklyToolboxCategoryIcon pm-ic pm-ic-' + c.id }, contents: (c.id === 'gui' ? [{ kind: 'button', text: '＋ 새 메뉴 만들기 (디자이너 열기)', callbackkey: 'pmNewGui' }] : c.id === 'item' ? [{ kind: 'button', text: '＋ 새 커스텀 아이템 만들기 (디자이너 열기)', callbackkey: 'pmNewItem' }] : []).concat(paletteFor(c.id)) }))
  });
  const toolbox = makeToolbox();

  const host = document.getElementById('blockly');
  const ws = B.inject(host, {
    toolbox,
    theme,
    renderer: 'pm',
    media: 'node_modules/blockly/media/',
    sounds: false,
    trashcan: false,
    grid: { spacing: 20, length: 1, colour: '#3a3a3a', snap: false },
    zoom: { controls: false, wheel: true, startScale: 0.9, maxScale: 2, minScale: 0.4, scaleSpeed: 1.15 },
    move: { scrollbars: true, drag: true, wheel: false },
    plugins: { connectionChecker: 'pm_checker' }
  });

  {
    const defs = ws.getParentSvg().querySelector('defs');
    const clip = B.utils.dom.createSvgElement('clipPath', { id: 'pm-edge-clip', clipPathUnits: 'userSpaceOnUse' }, defs);
    B.utils.dom.createSvgElement('rect', { x: -50, y: -50, width: 55, height: 100000 }, clip);
  }

  B.dialog.setPrompt((message, def, cb) => askText(message, def, cb));

  const VAR_HELP = {
    PMValue: { button: '＋ 새 저장값 만들기 (예: 돈, 킬 수)', ask: '새 저장값 이름을 써주세요 (예: 돈, 킬 수, 포인트)' },
    PMGlobal: { button: '＋ 새 서버 값 만들기 (예: 전체 방문자)', ask: '새 서버 값 이름을 써주세요 (예: 전체 방문자, 이벤트 점수)' }
  };
  function newVar(w, type) {
    askText(VAR_HELP[type].ask, '', (name) => {
      name = String(name || '').trim();
      if (!name) return;
      if (w.getVariableMap().getVariable(name, type)) { toast('"' + name + '" 은(는) 이미 있습니다', 'warn'); return; }
      w.getVariableMap().createVariable(name, type);
      w.getToolbox().refreshSelection();
      toast('"' + name + '" 을(를) 만들었습니다. 블록의 이름 칸에서 고를 수 있습니다');
    });
  }
  function newDesignBlock(type, base) {
    const names = ws.getTopBlocks(false).filter((b) => b.type === type).map((b) => b.getFieldValue('NAME'));
    let n = 1;
    while (names.includes(base + ' ' + n)) n++;
    const m = ws.getMetricsManager().getViewMetrics(true);
    const blk = B.serialization.blocks.append({ type, x: m.left + 60, y: m.top + 60, fields: { NAME: base + ' ' + n } }, ws);
    ws.getFlyout && ws.getFlyout() && ws.getFlyout().hide && ws.getToolbox().clearSelection();
    setTimeout(() => openDesign(blk), 50);
  }
  ws.registerButtonCallback('pmNewGui', () => newDesignBlock('pm_gui', '메뉴'));
  ws.registerButtonCallback('pmNewItem', () => newDesignBlock('pm_citem', '아이템'));
  ws.registerButtonCallback('pmNewVar', (btn) => newVar(btn.getTargetWorkspace(), 'PMValue'));
  ws.registerButtonCallback('pmNewGVar', (btn) => newVar(btn.getTargetWorkspace(), 'PMGlobal'));
  ws.registerToolboxCategoryCallback('PM_DATA', (w) => {
    const pick = (type, def) => {
      const list = w.getVariableMap().getVariablesOfType(type);
      return list.length ? { id: list[list.length - 1].getId() } : { name: def, type };
    };
    const fields = { PMValue: pick('PMValue', '돈'), PMGlobal: pick('PMGlobal', '전체 점수') };
    const items = paletteFor('data', fields);
    const serverAt = items.findIndex((e) => e.kind === 'label' && e.text === window.PM_DEFS.GROUP_LABELS.data.server);
    const out = [{ kind: 'button', text: VAR_HELP.PMValue.button, callbackkey: 'pmNewVar' }].concat(items);
    if (serverAt >= 0) out.splice(serverAt + 2, 0, { kind: 'button', text: VAR_HELP.PMGlobal.button, callbackkey: 'pmNewGVar' });
    return out;
  });
  ws.getToolbox().refreshSelection();

  const dragHint = el('div', 'drag-hint hidden');
  document.getElementById('ws-card').append(dragHint);
  let spotLayer = null;
  function clearSpots() {
    if (spotLayer) { spotLayer.remove(); spotLayer = null; }
    dragHint.classList.add('hidden');
  }
  function showSpots(dragged) {
    clearSpots();
    const own = dragged.outputConnection || dragged.previousConnection;
    if (!own) return;
    const isValue = !!dragged.outputConnection;
    spotLayer = B.utils.dom.createSvgElement('g', { class: 'pmSpots' }, ws.getCanvas());
    const inDragged = new Set(dragged.getDescendants(false));
    let count = 0;
    let blockedWhy = null;
    ws.getAllBlocks(false).forEach((b) => {
      if (inDragged.has(b) || b.isShadow()) return;
      b.getConnections_(false).forEach((c) => {
        if (isValue) {
          if (c.type !== B.ConnectionType.INPUT_VALUE) return;
          const t = c.targetBlock();
          if (t && !t.isShadow()) return;
        } else if (c.type !== B.ConnectionType.NEXT_STATEMENT) return;
        if (!ws.connectionChecker.canConnect(own, c, false)) return;
        const why = whyNot(dragged, c);
        if (why) { blockedWhy = blockedWhy || why; return; }
        count++;
        const x = c.x, y = c.y;
        if (isValue) {
          B.utils.dom.createSvgElement('rect', { class: 'pmSpot', x: x - 2, y: y - 2, width: 28, height: 26, rx: 12 }, spotLayer);
        } else {
          B.utils.dom.createSvgElement('rect', { class: 'pmSpot pmSpotLine', x: x + 6, y: y - 3, width: 60, height: 6, rx: 3 }, spotLayer);
        }
      });
    });
    const d = defOfBlock(dragged);
    const needs = needsOf(dragged);
    let msg;
    if (count) msg = '초록색 표시가 이 블록을 넣을 수 있는 곳입니다';
    else if (blockedWhy) msg = '여기엔 못 넣습니다: ' + blockedWhy;
    else if (ws.getTopBlocks(false).length <= 1) msg = '먼저 "~했을 때" 블록을 놓고 그 안에 넣어주세요';
    else msg = '지금 화면에는 이 블록이 들어갈 자리가 없습니다';
    if (count && blockedWhy) msg += '\n못 넣는 곳도 있습니다 · ' + blockedWhy;
    else if (needs.size && d && PLACES[d.id]) msg += '\n' + PLACES[d.id].split('\n')[0];
    dragHint.textContent = msg;
    dragHint.classList.toggle('bad', !count);
    dragHint.classList.remove('hidden');
  }
  ws.addChangeListener((ev) => {
    if (ev.type !== B.Events.BLOCK_DRAG) return;
    if (ev.isStart) {
      const b = ws.getBlockById(ev.blockId);
      if (b) showSpots(b);
    } else clearSpots();
  });

  const LUCIDE = {
    undo: 'M3 7v6h6M21 17a9 9 0 0 0-15-6.7L3 13', redo: 'M21 7v6h-6M3 17a9 9 0 0 1 15-6.7L21 13',
    plus: 'M12 5v14M5 12h14', minus: 'M5 12h14',
    fit: 'M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3',
    trash: 'M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6'
  };
  const svgIcon = (d) => '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="' + d + '"/></svg>';
  const dock = el('div', 'ws-dock');
  const dockBtn = (icon, title, run) => {
    const b = el('button', 'ws-dock-btn');
    b.innerHTML = svgIcon(LUCIDE[icon]);
    b.title = title;
    b.addEventListener('click', run);
    dock.append(b);
    return b;
  };
  dockBtn('undo', '되돌리기 (Ctrl+Z)', () => ws.undo(false));
  dockBtn('redo', '다시하기 (Ctrl+Y)', () => ws.undo(true));
  dock.append(el('div', 'ws-dock-sep'));
  dockBtn('plus', '확대', () => ws.zoomCenter(1));
  dockBtn('minus', '축소', () => ws.zoomCenter(-1));
  dockBtn('fit', '블록이 다 보이게 맞추기', () => { if (ws.getTopBlocks(false).length) ws.zoomToFit(); else ws.scrollCenter(); });
  dock.append(el('div', 'ws-dock-sep'));
  const trashBtn = dockBtn('trash', '블록을 여기로 끌어다 놓으면 지워집니다 (Ctrl+Z 로 되돌립니다)', () => toast('블록을 휴지통으로 끌어다 놓으면 지워집니다. 실수했으면 Ctrl+Z'));
  trashBtn.classList.add('trash');
  document.getElementById('ws-card').append(dock);
  try {
    class DockTrash extends B.DeleteArea {
      constructor() { super(); this.id = 'pmDockTrash'; }
      getClientRect() { const r = trashBtn.getBoundingClientRect(); return new B.utils.Rect(r.top - 6, r.bottom + 6, r.left - 6, r.right + 6); }
      onDragEnter() { trashBtn.classList.add('over'); }
      onDragExit() { trashBtn.classList.remove('over'); }
      onDrop() { trashBtn.classList.remove('over'); }
    }
    ws.getComponentManager().addComponent({ component: new DockTrash(), weight: 1, capabilities: [B.ComponentManager.Capability.DELETE_AREA, B.ComponentManager.Capability.DRAG_TARGET] });
  } catch (e) {  }

  const searchBox = el('input', 'tb-search');
  searchBox.placeholder = '블록 검색';
  searchBox.spellcheck = false;
  document.getElementById('ws-card').append(searchBox);
  const norm = (t) => String(t || '').replace(/\{\w+\}/g, ' ').toLowerCase();
  function searchBlocks(q) {
    q = q.trim().toLowerCase();
    const out = [];
    DEFS.forEach((d) => {
      if (out.length >= 40) return;
      if (d.variants) {
        d.variants.forEach(([label, v]) => {
          const vd = BY_ID[v];
          if (out.length < 40 && (norm(d.text + ' ' + label).includes(q) || norm(vd && vd.tip).includes(q))) out.push({ kind: 'block', type: d.id, fields: { KIND: v }, inputs: paletteInputs(d) });
        });
        return;
      }
      if (d.hidden || (d.since && window.MC.cmp(window.MC.version, d.since) < 0)) return;
      if (norm(d.text).includes(q) || norm(d.tip).includes(q)) out.push({ kind: 'block', type: d.id, inputs: paletteInputs(d) });
    });
    return out;
  }
  let searchTimer = 0;
  searchBox.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      const q = searchBox.value;
      const tb = ws.getToolbox();
      if (!q.trim()) { tb.clearSelection(); tb.getFlyout().hide(); return; }
      const found = searchBlocks(q);
      tb.clearSelection();
      tb.getFlyout().show(found.length ? found : [{ kind: 'label', text: '"' + q.trim() + '" 블록이 없습니다' }]);
    }, 120);
  });
  searchBox.addEventListener('keydown', (e) => { if (e.key === 'Escape') { searchBox.value = ''; searchBox.dispatchEvent(new Event('input')); searchBox.blur(); } });

  const wsCard = document.getElementById('ws-card');
  const codeCard = document.getElementById('code-card');
  const codeView = document.getElementById('code-view');
  const emptyHint = document.getElementById('ws-empty');
  const modeBlock = document.getElementById('btn-mode-block');
  const modeCode = document.getElementById('btn-mode-code');

  let legacy = false;
  let lastProblems = [];
  const shownWarn = new Map();

  const KEYWORDS = new Set(['public', 'private', 'protected', 'void', 'new', 'return', 'if', 'else', 'true', 'false', 'null',
    'class', 'extends', 'implements', 'static', 'final', 'boolean', 'int', 'double', 'instanceof', 'this']);
  function highlight(code) {
    const re = /(\/\/[^\n]*)|("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)')|(@[A-Za-z_]\w*)|(\b\d+(?:\.\d+)?[fFdDlL]?\b)|([A-Za-z_]\w*)/g;
    let out = '';
    let last = 0;
    let m;
    while ((m = re.exec(code)) !== null) {
      const t = m[0];
      out += esc(code.slice(last, m.index));
      let cls = '';
      if (m[1]) cls = 'tk-c';
      else if (m[2]) cls = 'tk-s';
      else if (m[3]) cls = 'tk-a';
      else if (m[4]) cls = 'tk-n';
      else if (KEYWORDS.has(t)) cls = 'tk-k';
      else if (/^[A-Z]/.test(t)) cls = 'tk-t';
      else if (code[m.index + t.length] === '(') cls = 'tk-f';
      out += cls ? '<span class="' + cls + '">' + esc(t) + '</span>' : esc(t);
      last = m.index + t.length;
    }
    return out + esc(code.slice(last));
  }
  window.refreshCodeView = () => {
    if (codeCard.classList.contains('hidden')) return;
    codeView.innerHTML = editor.value.trim()
      ? highlight(editor.value)
      : '<span class="tk-c">// 아직 블록이 없습니다. "~했을 때" 블록부터 놓아보세요.</span>';
  };

  function regen() {
    const state = B.serialization.workspaces.save(ws);
    const r = window.PMGen.generate(state, { convert: (c) => window.MC.convert(c).code, versionOk: (v) => window.MC.cmp(window.MC.version, v) >= 0 });
    if (legacy && r.blockCount > 0) {
      legacy = false;
      notice('블록을 놓아서 이제부터는 블록으로 코드를 만듭니다. 예전 코드는 "불러오기"에서 다시 열면 남아 있습니다 (저장하기 전까지).');
    }
    if (!legacy) editor.value = r.code;
    lastProblems = r.problems;
    window.lastTextures = r.textures || [];
    window.lastGuiBackgrounds = r.guiBackgrounds || [];
    window.lastGuiNoHover = !!r.guiNoHover;

    const msgs = new Map();
    r.problems.forEach((p) => msgs.set(p.id, msgs.has(p.id) ? msgs.get(p.id) + '\n' + p.msg : p.msg));
    B.Events.disable();
    try {
      ws.getAllBlocks(false).forEach((b) => {
        const want = msgs.get(b.id) || null;
        if ((shownWarn.get(b.id) || null) === want) return;
        b.setWarningText(want);
        if (want) shownWarn.set(b.id, want); else shownWarn.delete(b.id);
      });
    } finally { B.Events.enable(); }

    if (emptyHint) emptyHint.classList.toggle('hidden', ws.getTopBlocks(false).length > 0 || legacy);
    if (legacy) statusText.textContent = '예전 방식(코드) 프로젝트입니다 · 블록을 놓으면 블록 방식으로 바뀝니다';
    else if (r.problems.length) statusText.textContent = '고칠 곳 ' + r.problems.length + '개 · 노란 세모(⚠)가 붙은 블록의 세모를 눌러보세요. 그 블록은 빼고 만들어집니다';
    else statusText.textContent = r.blockCount ? '문제 없습니다' : '';
    statusText.classList.toggle('warn', !legacy && r.problems.length > 0);
    window.refreshCodeView();
  }

  let timer = 0;
  const schedule = () => { clearTimeout(timer); timer = setTimeout(regen, 120); };
  ws.addChangeListener((ev) => {
    if (ev.isUiEvent) return;
    setDirty(true);
    schedule();
  });

  function slideSwitch(box) {
    let thumb = box.querySelector('.seg-thumb');
    if (!thumb) { thumb = document.createElement('span'); thumb.className = 'seg-thumb'; box.prepend(thumb); }
    const on = box.querySelector('.mode-btn.on');
    if (!on) return;
    thumb.style.width = on.offsetWidth + 'px';
    thumb.style.transform = 'translateX(' + (on.offsetLeft - 3) + 'px)';
  }
  const levelBox = document.getElementById('level-switch');
  function setLevel(v, quiet) {
    easy = v !== 'all';
    try { localStorage.setItem('pm.level', easy ? 'easy' : 'all'); } catch (e) {  }
    levelBox.querySelectorAll('.mode-btn').forEach((b) => b.classList.toggle('on', (b.dataset.v === 'all') !== easy));
    slideSwitch(levelBox);
    try { ws.updateToolbox(makeToolbox()); ws.getToolbox().refreshSelection(); } catch (e) {  }
    if (!quiet) toast(easy ? '간단 모드: 간단한 블록만 보입니다' : '전체 모드: 모든 블록이 보입니다');
  }
  if (levelBox) {
    levelBox.querySelectorAll('.mode-btn').forEach((b) => b.addEventListener('click', () => setLevel(b.dataset.v)));
    setLevel(easy ? 'easy' : 'all', true);
  }
  requestAnimationFrame(() => { document.querySelectorAll('.mode').forEach(slideSwitch); });
  window.addEventListener('resize', () => document.querySelectorAll('.mode').forEach(slideSwitch));
  function setMode(mode) {
    const code = mode === 'code';
    wsCard.classList.toggle('hidden', code);
    codeCard.classList.toggle('hidden', !code);
    modeBlock.classList.toggle('on', !code);
    modeCode.classList.toggle('on', code);
    slideSwitch(modeBlock.parentElement);
    if (code) window.refreshCodeView();
    else B.svgResize(ws);
  }
  modeBlock.addEventListener('click', () => setMode('block'));
  modeCode.addEventListener('click', () => setMode('code'));

  function showTopLeft() {
    if (!ws.getTopBlocks(false).length) return;
    const c = ws.getMetricsManager().getContentMetrics();
    ws.scroll(40 - c.left, 40 - c.top);
  }

  function addTemplate(t) {
    let json = JSON.stringify(t.blocks);
    (t.variables || []).forEach((v) => {
      const have = ws.getVariableMap().getVariable(v.name, v.type);
      if (have) json = json.split('"' + v.id + '"').join('"' + have.getId() + '"');
      else if (!ws.getVariableMap().getVariableById(v.id)) ws.getVariableMap().createVariable(v.name, v.type, v.id);
    });
    const list = JSON.parse(json);
    const tops = ws.getTopBlocks(false);
    let x = 40;
    let y = 40;
    if (tops.length) {
      const box = ws.getBlocksBoundingBox();
      x = box.right / ws.scale + 80;
      y = box.top / ws.scale;
    }
    B.Events.setGroup(true);
    try {
      list.forEach((st) => {
        const blkNew = B.serialization.blocks.append(Object.assign({}, st, { x, y }), ws);
        y += blkNew.getHeightWidth().height + 40;
      });
    } finally { B.Events.setGroup(false); }
    const first = ws.getTopBlocks(true).find((b2) => b2.type === list[0].type);
    if (tops.length && first) ws.centerOnBlock(first.id); else showTopLeft();
    toast('"' + t.title + '" 예제를 넣었습니다. 칸을 눌러서 글자나 숫자를 바꿔보세요');
  }

  function openTemplates() {
    const wrap = el('div', 'ask-overlay');
    const box = el('div', 'tpl-box');
    const head = el('div', 'tpl-head');
    const all = window.PM_TEMPLATES || [];
    head.append(el('h3', '', '예제로 시작하기 · ' + all.length + '개'),
      el('p', '', '유명한 플러그인의 대표 기능을 블록으로 따라 만든 예제입니다. 고르면 지금 블록 옆에 더해집니다. 칸을 바꿔서 내 것으로 만듭니다.'));
    const tools = el('div', 'tpl-tools');
    const search = el('input', 'tpl-search');
    search.placeholder = '찾기 (예: 집, 상점, 워프, 나무)';
    search.spellcheck = false;
    const tabs = el('div', 'tpl-tabs');
    const cats = ['전체'].concat([...new Set(all.map((t) => t.cat || '기타'))]);
    let cat = '전체';
    cats.forEach((c) => {
      const n = c === '전체' ? all.length : all.filter((t) => (t.cat || '기타') === c).length;
      const b = el('button', 'tpl-tab' + (c === cat ? ' on' : ''), c + ' ' + n);
      b.addEventListener('click', () => { cat = c; [...tabs.children].forEach((x) => x.classList.toggle('on', x === b)); draw(); });
      tabs.append(b);
    });
    tools.append(search, tabs);
    const grid = el('div', 'tpl-grid');
    const draw = () => {
      const q = search.value.trim().toLowerCase();
      grid.textContent = '';
      const list = all.filter((t) => (cat === '전체' || (t.cat || '기타') === cat) &&
        (!q || (t.title + ' ' + t.desc + ' ' + (t.like || '') + ' ' + (t.cat || '')).toLowerCase().includes(q)));
      if (!list.length) grid.append(el('div', 'tpl-empty', '찾는 예제가 없습니다. 다른 말로 찾아보세요.'));
      list.forEach((t) => {
        const card = el('button', 'tpl-card');
        const top = el('div', 'tpl-card-top');
        top.append(el('b', '', t.title));
        if (t.like) top.append(el('em', 'tpl-like', t.like + ' 스타일'));
        card.append(top, el('span', '', t.desc));
        card.addEventListener('click', () => { wrap.remove(); addTemplate(t); });
        grid.append(card);
      });
    };
    search.addEventListener('input', draw);
    draw();
    const close = el('button', 'top-btn tpl-close', '닫기');
    close.addEventListener('click', () => wrap.remove());
    box.append(head, tools, grid, close);
    wrap.append(box);
    wrap.addEventListener('mousedown', (e) => { if (e.target === wrap) wrap.remove(); });
    document.body.append(wrap);
    setTimeout(() => search.focus(), 0);
  }
  { const ex = document.getElementById('btn-example'); if (ex) ex.addEventListener('click', openTemplates); }
  const topTpl = document.getElementById('btn-templates');
  if (topTpl) topTpl.addEventListener('click', openTemplates);

  window.wsState = () => B.serialization.workspaces.save(ws);
  window.wsProblemCount = () => lastProblems.length;
  window.wsLoad = (p) => {
    B.Events.disable();
    try {
      ws.clear();
      shownWarn.clear();
      if (p && p.workspace) B.serialization.workspaces.load(p.workspace, ws);
    } finally { B.Events.enable(); }
    legacy = !(p && p.workspace) && !!String((p && p.code) || '').trim();
    if (legacy) {
      editor.value = p.code;
      notice('예전 방식(코드)으로 만든 프로젝트입니다. 코드를 블록으로 바꿀 수는 없어서, 코드는 그대로 두고 만들기도 그대로 됩니다. "코드 보기"에서 확인할 수 있습니다.');
    }
    showTopLeft();
    regen();
    setMode('block');
  };
  window.refreshPanel = () => {
    try { ws.updateToolbox(makeToolbox()); ws.getToolbox().refreshSelection(); } catch (e) {  }
    regen();
  };

  window.addEventListener('resize', () => B.svgResize(ws));
  regen();
})();
