/* NoteWave – animação de abertura (splash).
   Aparece UMA vez por visita (guardado em sessionStorage): se o usuário sair da home e voltar,
   ela não repete. Fechando a aba/navegador e entrando de novo, ela volta a aparecer.
   Clique, Enter, Espaço ou Esc pulam a animação. Respeita "reduzir movimento" do sistema. */
   (() => {
    const MANUAL = !!window.__NW_MANUAL;               // modo de teste/gravação (não usar no site)
    const KEY = 'notewave:splash-visto';
    if (!MANUAL) {
      try { if (sessionStorage.getItem(KEY)) return; sessionStorage.setItem(KEY, '1'); } catch (e) {}
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    }
    const BASE = ((document.currentScript && document.currentScript.src) || '').replace(/js\/[^\/]*$/, '');
    const IMG = { a: { u: BASE + 'imagem/splash-notinha-a.png', w: 542, h: 600 },
                  b: { u: BASE + 'imagem/splash-notinha-b.png', w: 495, h: 560 } };
    const T_END = 11.2;                                 // segundos até começar a sumir
  
    const cl = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x)), lp = (a, b, x) => a + (b - a) * x, pr = (t, a, b) => cl((t - a) / (b - a));
    const bez = (a, b, c, d) => x => { let t = x; for (let i = 0; i < 8; i++) { const e = 3*a*t*(1-t)**2 + 3*c*t*t*(1-t) + t**3 - x, f = 3*a*(1-t)**2 + 6*(c-a)*t*(1-t) + 3*(1-c)*t*t; if (Math.abs(f) < 1e-6) break; t -= e / f } return 3*b*t*(1-t)**2 + 3*d*t*t*(1-t) + t**3 };
    const eIn = bez(.55, 0, .2, 1.18), eIO = bez(.6, 0, .25, 1), eO = bez(.2, .6, .3, 1);
  
    document.documentElement.classList.add('nw-lock');
    const root = document.createElement('div'); root.id = 'nw-splash'; root.setAttribute('aria-hidden', 'true');
    root.innerHTML = `<div class="nw-st">
      <i class="nw-ray" style="left:14%;rotate:14deg"></i><i class="nw-ray" style="left:46%;rotate:-6deg"></i><i class="nw-ray" style="left:76%;rotate:18deg"></i>
      <svg class="nw-wv" viewBox="0 0 5760 460"></svg><svg class="nw-wv" viewBox="0 0 5760 460"></svg><svg class="nw-wv" viewBox="0 0 5760 460"></svg>
      <canvas class="nw-cv"></canvas><div class="nw-veil"></div><div class="nw-pool"></div><div class="nw-tx"></div><canvas class="nw-cw"></canvas>
      <svg class="nw-sp" viewBox="-60 -60 120 120"><path d="M0-56C4-14 14-4 56 0 14 4 4 14 0 56-4 14-14 4-56 0-14-4-4-14 0-56Z" fill="#fff"/></svg>
      <div class="nw-m"><img class="nw-ia" alt=""><img class="nw-ib" alt="" style="opacity:0"></div></div>`;
    (document.body || document.documentElement).appendChild(root);
    const q = s => root.querySelector(s), st = q('.nw-st'), veil = q('.nw-veil'), pool = q('.nw-pool'), tx = q('.nw-tx'), sp = q('.nw-sp'), M = q('.nw-m'), ia = q('.nw-ia'), ib = q('.nw-ib');
    const [w1, w2, w3] = root.querySelectorAll('.nw-wv'), rays = root.querySelectorAll('.nw-ray');
    const cvE = q('.nw-cv'), cwE = q('.nw-cw'), cx = cvE.getContext('2d'), cw = cwE.getContext('2d');
  
    function wavePath(el, amp, len, y, fill, stroke) {
      let d = ''; for (let x = 0; x <= 5760; x += 20) { const yy = y + Math.sin(x/len*6.283)*amp + Math.sin(x/len*12.566 + 1)*amp*.25; d += (x ? 'L' : 'M') + x + ' ' + yy }
      el.innerHTML = `<path d="${d}V460H0Z" fill="${fill}"/><path d="${d}" fill="none" stroke="${stroke}" stroke-width="3"/>`;
    }
    wavePath(w1, 26, 960, 150, '#0b3a73cc', '#8fdcff88'); wavePath(w2, 34, 1920, 215, '#08295acc', '#6cc7ff77'); wavePath(w3, 22, 640, 290, '#041a3fe6', '#9be0ffaa');
  
    // ---- layout (coordenadas lógicas; o palco se ajusta a qualquer tela) ----
    let W = 1560, H = 880, CX = 780, cy = 465, BY = 730, FX = 0, TX = 0, TW = 0, L = [], P = [];
    function lay() {
      const k = Math.min(innerWidth / 1560, innerHeight / 880);
      W = innerWidth / k; H = innerHeight / k;
      st.style.width = W + 'px'; st.style.height = H + 'px'; st.style.transform = `scale(${k})`;
      cvE.width = cwE.width = Math.ceil(W); cvE.height = cwE.height = Math.ceil(H);
      CX = W / 2; cy = H / 2 + 25; BY = cy + 265;
      if (TW) { const mw = IMG.b.w * .9, tot = mw + 70 + TW, left = (W - tot) / 2; FX = left + mw / 2; TX = left + mw + 70;
        tx.style.left = TX + 'px'; tx.style.top = cy + 'px'; L.forEach(o => o.c = TX + o.e.offsetLeft + o.e.offsetWidth / 2) }
      const n = Math.min(160, Math.round(90 * W * H / (1920 * 1080)));
      if (P.length !== n) P = Array.from({ length: n }, () => ({ x: Math.random() * W, y: Math.random() * H, r: 1 + Math.random() * 3.2, v: 10 + Math.random() * 28, f: Math.random() * 6.3 }));
    }
    function build() {
      tx.innerHTML = ''; 'NoteWave'.split('').forEach((c, i) => { const s = document.createElement('span'); s.textContent = c; s.className = i < 4 ? 'n' : 'w'; tx.appendChild(s) });
      tx.style.left = '0px'; tx.style.visibility = 'hidden'; TW = tx.offsetWidth; tx.style.visibility = 'visible';
      L = [...tx.children].map(e => ({ e, c: 0 })); lay();
    }
    ia.src = IMG.a.u; ib.src = IMG.b.u;
    for (const [i, o] of [[ia, IMG.a], [ib, IMG.b]]) { i.style.width = o.w + 'px'; i.style.height = o.h + 'px' }
  
    let D = [], lt = 0;
    function frame(t) {
      veil.style.opacity = 1 - eO(pr(t, .2, 2.6));
      rays.forEach((r, i) => { r.style.opacity = .55 + .3 * Math.sin(t * .8 + i * 2); r.style.translate = Math.sin(t * .4 + i) * 40 + 'px 0' });
      const ri = (1 - eO(pr(t, .4, 3.2))) * 220;
      w1.style.transform = `translate(${-(t*70) % 1920}px,${ri*.7 + Math.sin(t*1.1)*8}px)`;
      w2.style.transform = `translate(${-1920 + (t*45) % 1920}px,${ri*.85 + Math.sin(t*.9 + 1)*10}px)`;
      w3.style.transform = `translate(${-(t*110) % 1920}px,${ri + Math.sin(t*1.3 + 2)*9}px)`;
      // mascote
      let x, y = 0, rot = 0, sx = 1, sy = 1; const pa = pr(t, 1.7, 3.5);
      if (t < 4.9) { x = lp(W + 380, CX, eIn(pa)); rot = -8 * (1 - eO(pa)); y = -Math.abs(Math.sin(pa * Math.PI * 3)) * 26 * (1 - pa) }
      else x = lp(CX, FX, eIO(pr(t, 4.9, 5.8)));
      if (t > 3.4 && t < 4.6) { const d = t - 3.4, k = Math.exp(-d * 5) * Math.sin(d * 18); sx = 1 + .07 * k; sy = 1 - .07 * k }
      if (t > 3.5) y += Math.sin(t * 3) * 7;
      if (t > 4 && t < 5) { const d = t - 4; rot = 5 * Math.sin(d * 8) * Math.exp(-d * 2.5) }
      const pb = pr(t, 3.95, 4.15); ib.style.opacity = pb; ia.style.opacity = 1 - pb; if (pb > 0 && pb < 1) { sx *= 1.05; sy *= .95 }
      M.style.transformOrigin = '0 0'; M.style.transform = `translate(${x}px,${BY + y}px) rotate(${rot}deg) scale(${sx},${sy})`;
      pool.style.left = x + 'px'; pool.style.top = (BY - 250) + 'px'; pool.style.opacity = .6 + .4 * pr(t, 2, 3.5);
      // brilho
      const b = Math.sin(Math.PI * pr(t, 5.5, 6.2)); sp.style.left = (TX - 30) + 'px'; sp.style.top = cy - 25 + 'px'; sp.style.opacity = b; sp.style.transform = `scale(${.3 + b * .9}) rotate(${t * 90}deg)`;
      // onda do mar que revela o nome
      const wp = pr(t, 5.9, 8.2), wx = lp(FX + 30, TX + TW + 340, eIO(wp)), gp = pr(t, 8.6, 9.8), gx = lp(TX - 150, TX + TW + 150, gp);
      const ex = yv => wx + 38 * Math.sin(yv / 55 - t * 6) + 22 * Math.sin(yv / 23 + t * 9) + 75 * Math.max(0, Math.cos(cl((yv - cy) / 230, -1, 1) * 1.571));
      const y0 = cy - 109, ya = cy - 225, yb = cy + 225;
      if (t < 8.4) { let s = 'polygon(-600px -80px'; for (let yy = -80; yy <= 290; yy += 8) s += `,${ex(y0 + yy) - TX}px ${yy}px`; tx.style.clipPath = s + ',-600px 290px)' } else tx.style.clipPath = 'none';
      cw.clearRect(0, 0, W, H);
      const dt = t < lt ? 0 : Math.min(t - lt, .05); if (t < lt) D.length = 0; lt = t;
      if (wp > 0 && wp < 1) for (let i = 0; i < 5; i++) { const yv = cy - 185 + Math.random() * 380; D.push({ x: ex(yv), y: yv, vx: 120 + Math.random() * 320, vy: -60 - Math.random() * 320, r: 2 + Math.random() * 5, l: 1 }) }
      const fa = 1 - pr(t, 8, 8.9);
      if (wp > 0 && fa > 0) {
        const g = cw.createLinearGradient(wx - 460, 0, wx + 90, 0); g.addColorStop(0, 'rgba(60,160,255,0)'); g.addColorStop(.75, 'rgba(110,205,255,.28)'); g.addColorStop(1, 'rgba(220,245,255,.5)');
        cw.globalAlpha = fa; cw.filter = 'blur(18px)'; cw.beginPath(); cw.moveTo(wx - 460, ya); for (let yy = ya; yy <= yb; yy += 8) cw.lineTo(ex(yy), yy); cw.lineTo(wx - 460, yb); cw.closePath(); cw.fillStyle = g; cw.fill(); cw.filter = 'none';
        cw.beginPath(); for (let yy = ya; yy <= yb; yy += 6) yy > ya ? cw.lineTo(ex(yy), yy) : cw.moveTo(ex(yy), yy);
        cw.strokeStyle = 'rgba(150,220,255,.35)'; cw.lineWidth = 26; cw.filter = 'blur(6px)'; cw.stroke(); cw.filter = 'none';
        cw.strokeStyle = '#fff'; cw.lineWidth = 7; cw.shadowColor = '#7fd0ff'; cw.shadowBlur = 22; cw.stroke(); cw.shadowBlur = 0;
        for (let i = 0; i < 28; i++) { const yy = ya + ((i * 47 + t * 120) % 450); cw.beginPath(); cw.arc(ex(yy) - ((i * 13) % 60), yy, 5 + (i * 7 % 9), 0, 6.283); cw.fillStyle = `rgba(235,248,255,${.35 + .4 * ((i * 5) % 3) / 3})`; cw.fill() }
        cw.globalAlpha = 1;
      }
      for (let i = D.length; i--;) { const d = D[i]; d.l -= dt * 1.1; if (d.l <= 0) { D.splice(i, 1); continue } d.vy += 900 * dt; d.x += d.vx * dt; d.y += d.vy * dt; cw.beginPath(); cw.arc(d.x, d.y, d.r * Math.sqrt(d.l), 0, 6.283); cw.fillStyle = `rgba(190,235,255,${d.l * .9})`; cw.fill() }
      L.forEach(o => { const g2 = Math.exp(-(((gx - o.c) / 110) ** 2)) * Math.sin(Math.PI * gp); o.e.style.filter = `brightness(${1 + g2 * .8}) drop-shadow(0 0 ${10 + g2 * 30}px rgba(110,200,255,${.4 + g2 * .5}))` });
      // partículas
      cx.clearRect(0, 0, W, H); const pa2 = (1 - eIO(pr(t, 9, 10.4))) * pr(t, .8, 2.6);
      P.forEach(p => { const yy = (p.y - p.v * t + H * 9) % H, xx = p.x + Math.sin(t * .6 + p.f) * 30, a = (.25 + .35 * Math.sin(t * 1.3 + p.f) ** 2) * pa2; cx.fillStyle = `rgba(150,215,255,${a})`; cx.beginPath(); cx.arc(xx, yy, p.r, 0, 6.283); cx.fill() });
    }
  
    const ready = Promise.all([
      new Promise(r => { const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'https://fonts.googleapis.com/css2?family=Poppins:wght@700&display=swap'; l.onerror = r; document.head.appendChild(l);
        Promise.race([document.fonts.load('700 170px Poppins'), new Promise(z => setTimeout(z, 1500))]).catch(() => {}).then(r) }),
      ...[IMG.a.u, IMG.b.u].map(u => new Promise(r => { const i = new Image(); i.onload = i.onerror = r; i.src = u }))
    ]);
  
    if (MANUAL) { window.__nw = { frame, ready: ready.then(() => { build(); frame(0) }) }; return }
  
    let raf, done = false;
    function finish() {
      if (done) return; done = true; cancelAnimationFrame(raf);
      removeEventListener('keydown', onKey); removeEventListener('resize', lay);
      root.classList.add('nw-out');
      setTimeout(() => { root.remove(); document.documentElement.classList.remove('nw-lock'); document.dispatchEvent(new Event('notewave:splash-fim')) }, 950);
    }
    const onKey = e => { if (['Escape', 'Enter', ' '].includes(e.key)) finish() };
    root.addEventListener('click', finish); addEventListener('keydown', onKey); addEventListener('resize', lay);
    setTimeout(finish, 16000);                          // segurança: nunca prende o usuário na animação
    ready.then(() => {
      if (done) return; build(); const t0 = performance.now();
      (function loop() { const t = (performance.now() - t0) / 1000; frame(Math.min(t, 12)); if (t >= T_END) finish(); else raf = requestAnimationFrame(loop) })();
    });
  })();