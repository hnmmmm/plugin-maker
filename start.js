(function () {
  const api = window.api;
  const startEl = document.getElementById('start');
  const exportEl = document.getElementById('export-modal');
  const chip = document.getElementById('chip-version');

  const ICON = {
    logo: '<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><path d="M12 2.5l8.5 4.75v9.5L12 21.5l-8.5-4.75v-9.5z"/><path d="M3.5 7.25L12 12l8.5-4.75M12 12v9.5"/></svg>'
  };
  const MC_VERSIONS = ['1.21.4', '1.21.1', '1.20.6', '1.20.4', '1.20.1', '1.19.4', '1.18.2', '1.17.1', '1.16.5'];
  const PLATFORMS = [['paper', 'Paper', '추천 · 대부분의 서버'], ['spigot', 'Spigot', '스피곳 서버']];

  const validMc = (v) => /^(1\.\d{1,2}(\.\d{1,2})?|[2-9]\d\.\d{1,2}(\.\d{1,2})?)$/.test(String(v));

  let project = null;

  const newId = () => 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const platName = (p) => (p === 'spigot' ? 'Spigot' : 'Paper');

  function snapshot() {
    return {
      id: project.id,
      name: projectName.value.trim() || '내 플러그인',
      mcVersion: project.mcVersion,
      platform: project.platform,
      pluginName: project.pluginName || '',
      code: editor.value,
      workspace: window.wsState ? window.wsState() : null,
      pack: window.packState ? window.packState() : null
    };
  }

  function updateChip() {
    if (project) { MC.set(project.mcVersion); MC.platform = project.platform; if (window.refreshPanel) window.refreshPanel(); }
    chip.textContent = project ? '마크 ' + project.mcVersion + ' · ' + platName(project.platform) : '버전 고르기';
  }

  async function saveNow(silent) {
    if (!project || !api) { if (!silent) toast('먼저 시작하기에서 프로젝트를 만들어주세요', 'warn'); return; }
    const res = await api.saveProject(snapshot());
    if (res && res.ok) {
      setDirty(false);
      if (!silent) toast('저장했습니다');
    } else if (res && res.error) {
      toast('저장하지 못했습니다: ' + res.error, 'warn');
    }
  }

  setInterval(() => { if (project && dirty) saveNow(true); }, 3000);

  function applyProject(p) {
    project = { id: p.id, mcVersion: p.mcVersion, platform: p.platform, pluginName: p.pluginName || '' };
    editor.value = p.code || '';
    if (window.wsLoad) window.wsLoad(p);
    if (window.packLoad) window.packLoad(p.pack);
    projectName.value = p.name || '내 플러그인';
    refreshEditor();
    setDirty(false);
    updateChip();
    closeStart();
  }

  function logoMark() {
    const wrap = el('div', 'start-logo');
    wrap.innerHTML = ICON.logo;
    return wrap;
  }

  function closeStart() { startEl.classList.add('hidden'); startEl.textContent = ''; }

  function timeAgo(ms) {
    const s = Math.max(1, Math.round((Date.now() - ms) / 1000));
    if (s < 60) return '방금 전';
    if (s < 3600) return Math.round(s / 60) + '분 전';
    if (s < 86400) return Math.round(s / 3600) + '시간 전';
    return Math.round(s / 86400) + '일 전';
  }

  async function openStart(canClose) {
    if (project && dirty) await saveNow(true);
    startEl.textContent = '';
    startEl.classList.remove('hidden');

    const sel = {
      name: project ? projectName.value : '내 플러그인',
      version: project ? project.mcVersion : '1.21.4',
      platform: project ? project.platform : 'paper'
    };

    const card = el('div', 'start-card');
    if (canClose) {
      const x = el('button', 'start-x', '✕');
      x.title = '닫기 (Esc)';
      x.addEventListener('click', closeStart);
      card.appendChild(x);
    }
    card.appendChild(logoMark());
    card.appendChild(el('h1', 'start-title', '어떤 플러그인을 만들까요?'));
    card.appendChild(el('p', 'start-sub', '서버 버전만 고르면 바로 시작할 수 있습니다.'));

    const cols = el('div', 'start-cols');
    const left = el('div', 'start-col');
    const right = el('div', 'start-col');

    left.appendChild(el('div', 'start-h', '① 이름'));
    const nameInput = el('input', 'start-input');
    nameInput.value = sel.name;
    nameInput.maxLength = 40;
    nameInput.spellcheck = false;
    left.appendChild(nameInput);

    left.appendChild(el('div', 'start-h', '② 서버 종류'));
    const platRow = el('div', 'chip-row');
    function drawPlat() {
      platRow.textContent = '';
      PLATFORMS.forEach(([id, label, sub]) => {
        const b = el('button', 'chip' + (sel.platform === id ? ' on' : ''));
        b.appendChild(el('span', 'chip-main', label));
        b.appendChild(el('span', 'chip-sub', sub));
        b.addEventListener('click', () => { sel.platform = id; drawPlat(); });
        platRow.appendChild(b);
      });
    }
    drawPlat();
    left.appendChild(platRow);

    left.appendChild(el('div', 'start-h', '③ 마인크래프트 버전'));
    const verRow = el('div', 'chip-row wrap');
    const custom = el('input', 'start-input small');
    custom.placeholder = '다른 버전 직접 쓰기 (예: 1.21.5)';
    custom.spellcheck = false;
    function drawVer() {
      verRow.textContent = '';
      MC_VERSIONS.forEach((v) => {
        const b = el('button', 'chip small' + (sel.version === v ? ' on' : ''), v);
        b.addEventListener('click', () => { sel.version = v; custom.value = ''; drawVer(); });
        verRow.appendChild(b);
      });
    }
    drawVer();
    custom.addEventListener('input', () => {
      const v = custom.value.trim();
      if (validMc(v)) { sel.version = v; drawVer(); }
    });
    left.appendChild(verRow);
    left.appendChild(custom);

    const go = el('button', 'primary start-go', '시작하기 →');
    go.addEventListener('click', async () => {
      if (!validMc(sel.version)) { toast('버전을 확인해주세요 (예: 1.21.4)', 'warn'); return; }
      if (MC.cmp(sel.version, '1.13') < 0) { toast('1.13보다 낮은 버전은 지원하지 않습니다', 'warn'); return; }
      applyProject({
        id: newId(), name: nameInput.value.trim() || '내 플러그인',
        mcVersion: sel.version, platform: sel.platform, code: ''
      });
      await saveNow(true);
    });
    left.appendChild(go);

    if (project) {
      const apply = el('button', 'start-link', '지금 만들던 프로젝트의 버전만 바꾸기');
      apply.addEventListener('click', () => {
        if (MC.cmp(sel.version, '1.13') < 0) { toast('1.13보다 낮은 버전은 지원하지 않습니다', 'warn'); return; }
        project.mcVersion = sel.version;
        project.platform = sel.platform;
        MC.set(sel.version);
        const conv = MC.convert(editor.value);
        if (conv.count) { editor.value = conv.code; refreshEditor(); }
        updateChip();
        setDirty(true);
        closeStart();
        const gone = MC.unavailable(editor.value);
        toast('버전을 바꿨습니다' + (conv.count ? ' · 코드 ' + conv.count + '곳을 이 버전에 맞게 바꿨습니다' : '') +
          (gone.length ? ' ·  이 버전에 없는 이름이 ' + gone.length + '곳 있습니다' : ''), gone.length ? 'warn' : undefined);
      });
      left.appendChild(apply);
    }

    right.appendChild(el('div', 'start-h', '저번에 하던 거 이어하기'));
    const listBox = el('div', 'recent-list');
    right.appendChild(listBox);

    (async () => {
      const res = api ? await api.listProjects() : { list: [] };
      const list = (res && res.list) || [];
      if (!list.length) {
        listBox.appendChild(el('div', 'recent-empty', '아직 저장된 프로젝트가 없습니다.\n만들면 자동으로 여기에 쌓입니다.'));
        return;
      }
      list.forEach((p) => {
        const row = el('div', 'recent-item');
        const info = el('div', 'recent-info');
        info.appendChild(el('div', 'recent-name', p.name || '이름 없음'));
        info.appendChild(el('div', 'recent-meta', '마크 ' + p.mcVersion + ' · ' + platName(p.platform) + ' · ' + p.lines + '줄 · ' + timeAgo(p.savedAt)));
        row.appendChild(info);
        const del = el('button', 'recent-del', '삭제');
        del.title = '삭제';
        del.addEventListener('click', async (e) => {
          e.stopPropagation();
          if (!confirm('"' + (p.name || '이름 없음') + '" 프로젝트를 지울까요?\n되돌릴 수 없습니다.')) return;
          await api.deleteProject(p.id);
          if (project && project.id === p.id) {
            project = null;
            editor.value = '';
            if (window.wsLoad) window.wsLoad({});
            if (window.packLoad) window.packLoad(null);
            projectName.value = '내 플러그인';
            refreshEditor();
            setDirty(false);
            chip.textContent = '버전 고르기';
            toast('프로젝트를 지웠습니다');
            openStart(false);
            return;
          }
          row.remove();
        });
        row.appendChild(del);
        row.addEventListener('click', async () => {
          const r = await api.loadProject(p.id);
          if (r && r.ok) { applyProject(r.project); toast('불러왔습니다'); }
          else toast('불러오지 못했습니다: ' + ((r && r.error) || ''), 'warn');
        });
        listBox.appendChild(row);
      });
    })();

    cols.appendChild(left);
    cols.appendChild(right);
    card.appendChild(cols);
    startEl.appendChild(card);
    startEl._canClose = !!canClose;
    setTimeout(() => nameInput.select(), 50);
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !startEl.classList.contains('hidden') && startEl._canClose) closeStart();
    if (e.key === 'Escape' && !exportEl.classList.contains('hidden')) closeExport();
  });

  function closeExport() { exportEl.classList.add('hidden'); exportEl.textContent = ''; }

  async function openExport() {
    if (!project) { openStart(false); return; }
    if (!editor.value.trim()) { toast('아직 블록이 없습니다. "~했을 때" 블록부터 놓아주세요', 'warn'); return; }
    const probs = window.wsProblemCount ? window.wsProblemCount() : 0;
    if (probs) toast('노란 세모(⚠)가 붙은 블록 ' + probs + '개는 빼고 만듭니다', 'warn');
    await saveNow(true);

    exportEl.textContent = '';
    exportEl.classList.remove('hidden');

    const ascii = /^[A-Za-z][A-Za-z0-9_]*$/.test(projectName.value.trim()) ? projectName.value.trim() : '';
    const state = { pluginName: project.pluginName || ascii || 'MyPlugin', version: '1.0.0', outDir: '' };
    state.outDir = api ? await api.defaultDir(state.pluginName) : '';

    const card = el('div', 'start-card export-card');
    const x = el('button', 'start-x', '✕');
    x.addEventListener('click', closeExport);
    card.appendChild(x);
    card.appendChild(el('h1', 'start-title', ' 플러그인 만들기'));
    card.appendChild(el('p', 'start-sub', '마크 ' + project.mcVersion + ' · ' + platName(project.platform) + ' 서버용으로 만듭니다.'));

    card.appendChild(el('div', 'start-h', '플러그인 이름 (영어)'));
    const nameIn = el('input', 'start-input');
    nameIn.value = state.pluginName;
    nameIn.maxLength = 30;
    nameIn.spellcheck = false;
    card.appendChild(nameIn);

    card.appendChild(el('div', 'start-h', '버전 번호'));
    const verIn = el('input', 'start-input small');
    verIn.value = state.version;
    verIn.maxLength = 20;
    card.appendChild(verIn);

    card.appendChild(el('div', 'start-h', '저장 위치'));
    const dirRow = el('div', 'dir-row');
    const dirText = el('div', 'dir-text', state.outDir);
    const dirBtn = el('button', 'outline small-btn', '바꾸기');
    dirBtn.addEventListener('click', async () => {
      const r = await api.pickFolder(state.outDir);
      if (r && r.ok) { state.outDir = r.path; dirText.textContent = r.path; }
    });
    dirRow.appendChild(dirText);
    dirRow.appendChild(dirBtn);
    card.appendChild(dirRow);

    const SERVER_KEY = 'pm.serverDir';
    let serverDir = '';
    try { serverDir = localStorage.getItem(SERVER_KEY) || ''; } catch (e) { serverDir = ''; }
    card.appendChild(el('div', 'start-h', '내 서버에 바로 넣기 (선택)'));
    const srvRow = el('div', 'dir-row');
    const srvText = el('div', 'dir-text', serverDir || '고르면 다 만든 .jar 를 서버의 plugins 폴더에 바로 복사합니다');
    const srvBtn = el('button', 'outline small-btn', serverDir ? '바꾸기' : '폴더 고르기');
    const srvClear = el('button', 'outline small-btn' + (serverDir ? '' : ' hidden'), '안 넣기');
    srvBtn.addEventListener('click', async () => {
      const r = await api.pickServer(serverDir);
      if (!r || !r.ok) return;
      serverDir = r.path;
      try { localStorage.setItem(SERVER_KEY, serverDir); } catch (e) {  }
      srvText.textContent = serverDir;
      srvBtn.textContent = '바꾸기';
      srvClear.classList.remove('hidden');
    });
    srvClear.addEventListener('click', () => {
      serverDir = '';
      try { localStorage.removeItem(SERVER_KEY); } catch (e) {  }
      srvText.textContent = '고르면 다 만든 .jar 를 서버의 plugins 폴더에 바로 복사합니다';
      srvBtn.textContent = '폴더 고르기';
      srvClear.classList.add('hidden');
    });
    srvRow.append(srvText, srvBtn, srvClear);
    card.appendChild(srvRow);

    const envLine = el('div', 'env-line', '내 컴퓨터 확인 중...');
    card.appendChild(envLine);
    const log = el('pre', 'export-log hidden');
    card.appendChild(log);
    const result = el('div', 'export-result');
    card.appendChild(result);

    const go = el('button', 'primary start-go', ' 만들기');
    card.appendChild(go);
    exportEl.appendChild(card);

    let env = { mvn: false, javac: false };
    api.exportEnv(project.mcVersion).then((e) => {
      env = e;
      if (e.ready) envLine.textContent = e.system ? ' 내 컴퓨터의 자바와 Maven으로 .jar까지 한 번에 만듭니다.' : ' 빌드 도구가 준비돼 있습니다. .jar까지 한 번에 만듭니다.';
      else {
        const what = [e.needJdk ? '자바(JDK ' + e.jdkMajor + ', 약 190MB)' : '', e.needMaven ? 'Maven(약 9MB)' : ''].filter(Boolean).join('과 ');
        envLine.textContent = ' 처음 한 번만 ' + what + '을(를) 자동으로 받습니다. 아무것도 설치하지 않아도 됩니다. (인터넷 필요 · 몇 분 걸립니다)';
      }
    });

    api.onExportLog((line) => {
      log.classList.remove('hidden');
      log.textContent += line + '\n';
      log.scrollTop = log.scrollHeight;
    });

    go.addEventListener('click', async () => {
      const pn = nameIn.value.trim();
      if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(pn)) { toast('플러그인 이름은 영어/숫자/_ 만 쓸 수 있습니다 (예: MyPlugin)', 'warn'); return; }
      project.pluginName = pn;
      MC.set(project.mcVersion);
      const conv = MC.convert(editor.value);
      if (conv.count) { editor.value = conv.code; refreshEditor(); setDirty(true); }
      const gone = MC.unavailable(editor.value);
      result.textContent = '';
      if (gone.length) {
        result.className = 'export-result bad';
        result.appendChild(document.createTextNode(' 마크 ' + project.mcVersion + '에는 아직 없는 것이 코드에 있습니다. 다른 걸로 바꾸거나 버전을 올려주세요:'));
        const ul = el('ul', 'problem-list');
        gone.forEach((g) => ul.appendChild(el('li', '', g.line + '번째 줄 · ' + g.label + ' (' + g.name + ') — 마크 ' + g.since + '부터 있습니다')));
        result.appendChild(ul);
        return;
      }
      go.disabled = true;
      go.textContent = '만드는 중...';
      result.textContent = '';
      log.textContent = '';

      const packOut = window.packForBuild ? window.packForBuild() : null;
      if (packOut && packOut.error) notice('리소스팩은 빼고 만듭니다: ' + packOut.error);
      const res = await api.exportProject({
        pack: packOut && packOut.base64 ? packOut.base64 : null,
        code: editor.value, pluginName: pn, version: verIn.value.trim() || '1.0.0',
        mcVersion: project.mcVersion, platform: project.platform,
        outDir: state.outDir, build: true, serverDir
      });
      go.disabled = false;
      go.textContent = ' 다시 만들기';
      saveNow(true);

      if (!res || !res.ok) { result.className = 'export-result bad'; result.textContent = (res && res.error) || '실패했습니다'; return; }
      const showList = (head, items, cls) => {
        result.className = 'export-result ' + cls;
        result.textContent = head;
        const ul = el('ul', 'problem-list');
        items.forEach((t) => ul.appendChild(el('li', '', t)));
        result.appendChild(ul);
      };
      if (res.problems && res.problems.length) {
        showList(' 코드 모양을 먼저 고쳐주세요 (아직 만들지 않았습니다):', res.problems, 'bad');
        return;
      }
      const openBtn = el('button', 'outline small-btn', ' 폴더 열기');
      openBtn.addEventListener('click', () => api.openFolder(res.outDir));
      if (res.built) {
        result.className = 'export-result good';
        result.textContent = ' 완성! 이 파일을 서버의 plugins 폴더에 넣으세요:\n' + res.jar + '\n' +
          (res.copied ? '\n서버 plugins 폴더에도 넣었습니다: ' + res.copied + '\n(서버를 다시 켜면 적용됩니다)\n' : '') +
          (res.pack ? '\n리소스팩도 만들었습니다: ' + res.pack + '\n(인터넷에 올리고 server.properties 의 resource-pack 에 주소를 넣거나, "리소스팩 보내기" 블록을 씁니다)\n' : '');
      } else if (res.buildFailed) {
        if (res.errors && res.errors.length) showList(' 만들지 못했습니다. 이런 부분을 확인해주세요:', res.errors, 'bad');
        else { result.className = 'export-result bad'; result.textContent = ' 빌드에 실패했습니다. 위 기록에서 "ERROR" 줄을 확인해주세요.\n'; }
      } else if (res.toolError) {
        result.className = 'export-result bad';
        result.textContent = ' 빌드 도구를 받지 못했습니다: ' + res.toolError + '\n인터넷 연결을 확인하고 "다시 만들기"를 눌러주세요. 받던 건 처음부터 다시 받습니다.\n';
      } else {
        result.className = 'export-result warn';
        result.textContent = ' 프로젝트 폴더만 만들었습니다.\n';
      }
      result.appendChild(openBtn);
    });
  }

  document.getElementById('btn-save').addEventListener('click', () => saveNow(false));
  document.getElementById('btn-open').addEventListener('click', () => openStart(true));
  document.getElementById('btn-build').addEventListener('click', openExport);
  chip.addEventListener('click', () => openStart(true));
  document.addEventListener('keydown', (e) => {
    if (!(e.ctrlKey || e.metaKey)) return;
    const key = e.key.toLowerCase();
    if (key === 's') { e.preventDefault(); saveNow(false); }
    if (key === 'o') { e.preventDefault(); openStart(true); }
  });

  if (!api) toast('프로그램(npm start) 창에서 열어야 저장과 만들기가 됩니다', 'warn');
  openStart(false);
})();
