(function () {
  const logo = document.querySelector('#topbar .brand');
  if (!logo) return;
  let count = 0;
  let last = 0;
  let running = false;

  const FRIEND = '<svg viewBox="0 0 728 511" xmlns="http://www.w3.org/2000/svg">' +
    '<rect x="8" y="5" width="712" height="501" rx="30" fill="#ffffff" stroke="#1a1a1a" stroke-width="6"/>' +
    '<circle cx="281" cy="153" r="85" fill="#000"/>' +
    '<circle cx="546" cy="152" r="87" fill="#000"/>' +
    '<rect x="240" y="324" width="368" height="48" rx="24" fill="#000"/>' +
    '</svg>';

  function shout() {
    const t = document.createElement('div');
    t.className = 'goja-shout';
    t.textContent = 'HARDER GOJA!';
    document.body.append(t);
    setTimeout(() => t.remove(), 2600);
  }

  function scatter(n, spanX, top, spanY, W, H, pad) {
    const spots = [];
    for (let tries = 0; spots.length < n && tries < 20000; tries++) {
      const x = Math.random() * (spanX - W);
      const y = top + Math.random() * (spanY - H);
      const hit = spots.some((s) => Math.abs(s.x - x) < W + pad && Math.abs(s.y - y) < H + pad);
      if (!hit) spots.push({ x, y });
    }
    return spots;
  }

  function parade() {
    const layer = document.createElement('div');
    layer.className = 'goja-layer';
    document.body.append(layer);
    const W = 54;
    const H = Math.round(W * 511 / 728);
    const N = 30;
    const speed = 260;
    const top = window.innerHeight * 0.1;
    const spanY = window.innerHeight * 0.8;
    const spanX = Math.max(1100, window.innerWidth * 1.1);
    const spots = scatter(N, spanX, top, spanY, W, H, 14);
    const travel = window.innerWidth + spanX + W + 40;
    const dur = travel / speed;
    spots.forEach((s, i) => {
      const f = document.createElement('div');
      f.className = 'goja-friend';
      f.innerHTML = FRIEND;
      f.style.width = W + 'px';
      f.style.height = H + 'px';
      f.style.top = Math.round(s.y) + 'px';
      f.style.left = Math.round(-W - 20 - s.x) + 'px';
      f.style.setProperty('--travel', travel + 'px');
      f.style.animationDuration = dur + 's, ' + (0.36 + Math.random() * 0.14).toFixed(2) + 's';
      f.style.animationDelay = '0s, ' + (Math.random() * 0.4).toFixed(2) + 's';
      layer.append(f);
    });
    setTimeout(() => { layer.remove(); running = false; }, dur * 1000 + 300);
  }

  logo.addEventListener('click', () => {
    const now = Date.now();
    count = now - last < 650 ? count + 1 : 1;
    last = now;
    if (count >= 12 && !running) {
      count = 0;
      running = true;
      shout();
      parade();
    }
  });
})();
