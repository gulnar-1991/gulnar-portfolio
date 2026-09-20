/* Gulnar Rzayeva – portfolio
   Plain JavaScript, no libraries. */
(() => {
  const root = document.documentElement;
  root.classList.add('js');

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  /* ------------------------------------------------------
     1. Nav colour follows the section under it
  ------------------------------------------------------ */
  const nav = $('.nav');
  const themed = $$('[data-nav]');
  function updateNavTheme() {
    const y = nav.offsetHeight / 2;
    let theme = 'light';
    for (const s of themed) {
      const r = s.getBoundingClientRect();
      if (r.top <= y && r.bottom > y) { theme = s.dataset.nav; break; }
    }
    if (nav.dataset.theme !== theme) nav.dataset.theme = theme;
  }

  /* ------------------------------------------------------
     2. Statement: words light up as you scroll
  ------------------------------------------------------ */
  const stmt = $('#statementText');
  let words = [];
  if (stmt) {
    words = stmt.textContent.trim().split(/\s+/).map(t => {
      const s = document.createElement('span');
      s.className = 'w';
      s.textContent = t;
      return s;
    });
    stmt.textContent = '';
    words.forEach((w, i) => {
      stmt.append(w);
      if (i < words.length - 1) stmt.append(' ');
    });
  }
  function updateStatement() {
    if (!stmt) return;
    if (reduce) { words.forEach(w => w.classList.add('on')); return; }
    const r = stmt.getBoundingClientRect();
    const vh = innerHeight;
    const p = clamp((vh * 0.88 - r.top) / (r.height + vh * 0.28), 0, 1);
    const n = Math.round(p * words.length);
    words.forEach((w, i) => w.classList.toggle('on', i < n));
  }

  /* ------------------------------------------------------
     3. Work: cards stack as you scroll
  ------------------------------------------------------ */
  const panels = $$('.project');
  function updateStack() {
    if (reduce) return;
    const vh = innerHeight;
    panels.forEach((panel, i) => {
      const next = panels[i + 1];
      if (!next) return;
      const p = clamp(1 - next.getBoundingClientRect().top / vh, 0, 1);
      panel.firstElementChild.style.setProperty('--p', p.toFixed(3));
    });
  }

  /* ------------------------------------------------------
     4. "View" cursor over project images
  ------------------------------------------------------ */
  const cursor = $('#cursor');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (cursor && finePointer && !reduce) {
    let tx = -200, ty = -200, cx = -200, cy = -200, cs = 0, ts = 0, running = false;
    const loop = () => {
      cx += (tx - cx) * 0.2;
      cy += (ty - cy) * 0.2;
      cs += (ts - cs) * 0.18;
      cursor.style.transform = `translate3d(${cx}px, ${cy}px, 0) scale(${cs.toFixed(3)})`;
      if (Math.abs(tx - cx) > .1 || Math.abs(ty - cy) > .1 || Math.abs(ts - cs) > .005) requestAnimationFrame(loop);
      else running = false;
    };
    const kick = () => { if (!running) { running = true; requestAnimationFrame(loop); } };
    $$('.project__media[data-cursor]').forEach(el => {
      el.addEventListener('pointerenter', e => {
        tx = cx = e.clientX; ty = cy = e.clientY;
        ts = 1; cursor.classList.add('is-on'); kick();
      });
      el.addEventListener('pointermove', e => { tx = e.clientX; ty = e.clientY; kick(); });
      el.addEventListener('pointerleave', () => { ts = 0; kick(); setTimeout(() => { if (ts === 0) cursor.classList.remove('is-on'); }, 250); });
    });
  }

  /* ------------------------------------------------------
     5. About photo tilts toward the pointer
  ------------------------------------------------------ */
  const photo = $('#aboutPhoto');
  if (photo && finePointer && !reduce) {
    photo.addEventListener('pointermove', e => {
      const r = photo.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      photo.style.setProperty('--ry', (x * 12).toFixed(2) + 'deg');
      photo.style.setProperty('--rx', (-y * 10).toFixed(2) + 'deg');
    });
    photo.addEventListener('pointerleave', () => {
      photo.style.setProperty('--ry', '0deg');
      photo.style.setProperty('--rx', '0deg');
    });
  }

  /* ------------------------------------------------------
     6. Contact button: fill grows from where the pointer enters
  ------------------------------------------------------ */
  const cta = $('#cta');
  if (cta) {
    const setOrigin = e => {
      const r = cta.getBoundingClientRect();
      cta.style.setProperty('--x', (e.clientX - r.left) + 'px');
      cta.style.setProperty('--y', (e.clientY - r.top) + 'px');
    };
    cta.addEventListener('pointerenter', setOrigin);
    cta.addEventListener('pointerleave', setOrigin);
  }

  /* ------------------------------------------------------
     7. Hero badge on a lanyard (small Verlet rope simulation)
  ------------------------------------------------------ */
  const hero = $('#hero');
  const stage = $('.hero__stage');
  const badge = $('#badge');
  const strapPath = $('#strapPath');
  const hint = $('#hint');

  const sim = {
    active: false, visible: true,
    W: 0, H: 0, bw: 280, N: 7,
    segLen: 30, rodLen: 400,
    ax: 0, ay: 0,
    x: [], y: [], px: [], py: [], w: [],   // chain points 0..N, then B at N+1
    drag: null, ry: 0, vxSmooth: 0
  };

  function setupBadge(keepState) {
    const W = stage.clientWidth, H = stage.clientHeight;
    const small = W < 760;
    const bw = clamp(W * (small ? 0.44 : 0.2), 168, 290);
    stage.style.setProperty('--bw', bw + 'px');

    sim.W = W; sim.H = H; sim.bw = bw;
    sim.ax = W * (small ? 0.68 : 0.49);
    sim.ay = -bw * 0.3;
    sim.rodLen = badge.offsetHeight || bw * 1.45;
    // strap length: badge should rest just above the headline
    const title = $('.hero__title');
    const titleTop = title.getBoundingClientRect().top - stage.getBoundingClientRect().top;
    const strap = clamp(titleTop - sim.ay - sim.rodLen + bw * 0.1, bw * 0.3, bw * 0.95);
    sim.segLen = strap / sim.N;

    if (keepState) return;

    const a0 = reduce ? 0 : 1.05;   // start swung out to the right, then falls
    const total = sim.N + 2;
    sim.x = new Array(total); sim.y = new Array(total);
    sim.px = new Array(total); sim.py = new Array(total);
    sim.w = new Array(total);
    for (let i = 0; i <= sim.N; i++) {
      sim.x[i] = sim.ax + Math.sin(a0) * sim.segLen * i;
      sim.y[i] = sim.ay + Math.cos(a0) * sim.segLen * i;
      sim.w[i] = i === 0 ? 0 : 1;
    }
    sim.w[sim.N] = 0.6;                     // clip end is a little heavy
    const a1 = a0 + (reduce ? 0 : 0.25);
    sim.x[sim.N + 1] = sim.x[sim.N] + Math.sin(a1) * sim.rodLen;
    sim.y[sim.N + 1] = sim.y[sim.N] + Math.cos(a1) * sim.rodLen;
    sim.w[sim.N + 1] = 0.3;                 // badge bottom is the heaviest
    for (let i = 0; i < total; i++) { sim.px[i] = sim.x[i]; sim.py[i] = sim.y[i]; }
  }

  function solve(a, b, len) {
    const dx = sim.x[b] - sim.x[a], dy = sim.y[b] - sim.y[a];
    const d = Math.hypot(dx, dy) || 0.0001;
    const diff = (d - len) / d;
    const wa = sim.w[a], wb = sim.w[b], ws = wa + wb;
    if (ws === 0) return;
    sim.x[a] += dx * diff * (wa / ws); sim.y[a] += dy * diff * (wa / ws);
    sim.x[b] -= dx * diff * (wb / ws); sim.y[b] -= dy * diff * (wb / ws);
  }

  function stepBadge() {
    const N = sim.N, total = N + 2;
    const g = sim.bw * 0.0026;                 // gravity per step, scales with badge size
    const damp = 0.988;

    for (let i = 1; i < total; i++) {
      const vx = (sim.x[i] - sim.px[i]) * damp;
      const vy = (sim.y[i] - sim.py[i]) * damp;
      sim.px[i] = sim.x[i]; sim.py[i] = sim.y[i];
      sim.x[i] += clamp(vx, -60, 60);
      sim.y[i] += clamp(vy, -60, 60) + g;
    }

    // pointer pulls the grabbed spot on the badge
    if (sim.drag) {
      const t = sim.drag.t;
      const gx = sim.x[N] + (sim.x[N + 1] - sim.x[N]) * t;
      const gy = sim.y[N] + (sim.y[N + 1] - sim.y[N]) * t;
      const dx = sim.drag.x - gx, dy = sim.drag.y - gy;
      const s = 0.55;
      sim.x[N] += dx * (1 - t) * s;     sim.y[N] += dy * (1 - t) * s;
      sim.x[N + 1] += dx * t * s;       sim.y[N + 1] += dy * t * s;
    }

    for (let k = 0; k < 16; k++) {
      sim.x[0] = sim.ax; sim.y[0] = sim.ay;
      for (let i = 0; i < N; i++) solve(i, i + 1, sim.segLen);
      solve(N, N + 1, sim.rodLen);
    }
    sim.x[0] = sim.ax; sim.y[0] = sim.ay;
  }

  function renderBadge() {
    const N = sim.N;
    const cx = sim.x[N], cy = sim.y[N];
    const bx = sim.x[N + 1], by = sim.y[N + 1];
    const theta = Math.atan2(-(bx - cx), by - cy);

    // 3D feel: lean the badge with its sideways speed
    const vx = cx - sim.px[N];
    sim.vxSmooth += (vx - sim.vxSmooth) * 0.15;
    const ryTarget = clamp(sim.vxSmooth * 4.2, -32, 32);
    sim.ry += (ryTarget - sim.ry) * 0.2;

    badge.style.transform =
      `translate3d(${(cx - sim.bw / 2).toFixed(2)}px, ${cy.toFixed(2)}px, 0) rotate(${theta.toFixed(4)}rad) perspective(900px) rotateY(${sim.ry.toFixed(2)}deg)`;

    const shine = 50 - theta * 90 - sim.ry * 1.6;
    badge.style.setProperty('--sx', clamp(shine, -30, 130).toFixed(1) + '%');

    // strap: smooth curve through the chain
    let d = `M ${sim.x[0].toFixed(1)} ${sim.y[0].toFixed(1)}`;
    for (let i = 1; i < N; i++) {
      const mx = (sim.x[i] + sim.x[i + 1]) / 2, my = (sim.y[i] + sim.y[i + 1]) / 2;
      d += ` Q ${sim.x[i].toFixed(1)} ${sim.y[i].toFixed(1)} ${mx.toFixed(1)} ${my.toFixed(1)}`;
    }
    d += ` L ${cx.toFixed(1)} ${cy.toFixed(1)}`;
    strapPath.setAttribute('d', d);
  }

  let last = 0, acc = 0;
  function frame(t) {
    if (!sim.active) return;
    requestAnimationFrame(frame);
    if (!sim.visible) { last = t; return; }
    acc += Math.min(t - last, 50); last = t;
    const dt = 1000 / 60;
    while (acc >= dt) { stepBadge(); acc -= dt; }
    renderBadge();
  }

  function startBadge() {
    setupBadge(false);
    badge.classList.add('is-ready');
    sim.active = true;
    last = performance.now();
    requestAnimationFrame(frame);
  }

  function pointerToStage(e) {
    const r = stage.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  if (badge && stage && strapPath) {
    badge.addEventListener('pointerdown', e => {
      badge.setPointerCapture(e.pointerId);
      const p = pointerToStage(e);
      const N = sim.N;
      const cx = sim.x[N], cy = sim.y[N];
      const rx = sim.x[N + 1] - cx, ry = sim.y[N + 1] - cy;
      const len = Math.hypot(rx, ry) || 1;
      const t = clamp(((p.x - cx) * rx + (p.y - cy) * ry) / (len * len), 0, 1);
      sim.drag = { x: p.x, y: p.y, t };
      badge.classList.add('is-dragging');
      hint && hint.classList.add('is-gone');
      e.preventDefault();
    });
    badge.addEventListener('pointermove', e => {
      if (!sim.drag) return;
      const p = pointerToStage(e);
      sim.drag.x = p.x; sim.drag.y = p.y;
    });
    const release = () => { sim.drag = null; badge.classList.remove('is-dragging'); };
    badge.addEventListener('pointerup', release);
    badge.addEventListener('pointercancel', release);
    badge.addEventListener('lostpointercapture', release);

    new IntersectionObserver(([en]) => { sim.visible = en.isIntersecting; }, { threshold: 0 }).observe(hero);

    let rz;
    addEventListener('resize', () => {
      clearTimeout(rz);
      rz = setTimeout(() => { setupBadge(false); }, 150);
    });

    // start once fonts are in, so the badge height is right
    const go = () => startBadge();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(go); else addEventListener('load', go);
  }


  /* ------------------------------------------------------
     8. Design viewer: wireframe / light / dark
  ------------------------------------------------------ */
  const viewer = $('#viewer');
  if (viewer) {
    const captions = {
      wire: 'Wireframe. The structure and content order, with no visuals yet.',
      light: 'Light. Easier to read and more approachable.',
      dark: 'Dark. Technical and system-like, familiar from developer tools.'
    };
    const frame = $('.viewer__frame', viewer);
    const scroller = $('.viewer__scroll', viewer);
    const cap = $('#viewerCaption');
    const tabs = $$('.viewer__bar button', viewer);
    const imgs = $$('.viewer__scroll img', viewer);
    const show = view => {
      const ratio = scroller.scrollTop / Math.max(1, scroller.scrollHeight - scroller.clientHeight);
      tabs.forEach(t => {
        const on = t.dataset.view === view;
        t.classList.toggle('is-active', on);
        t.setAttribute('aria-pressed', on);
      });
      imgs.forEach(i => i.classList.toggle('is-active', i.dataset.view === view));
      frame.dataset.surface = view;
      cap.textContent = captions[view];
      // keep the same spot on the page when switching, so you compare like with like
      scroller.scrollTop = ratio * (scroller.scrollHeight - scroller.clientHeight);
    };
    tabs.forEach(t => t.addEventListener('click', () => show(t.dataset.view)));
    cap.textContent = captions.wire;
  }


  /* ------------------------------------------------------
     9. Prototype video plays only while visible
  ------------------------------------------------------ */
  $$('video[data-autoplay]').forEach(v => {
    if (reduce) { v.controls = true; return; }
    new IntersectionObserver(([en]) => {
      if (en.isIntersecting) { v.preload = 'auto'; v.play().catch(() => {}); } else v.pause();
    }, { threshold: 0.25 }).observe(v);
  });

  /* ------------------------------------------------------
     Scroll loop (one rAF for everything scroll-linked)
  ------------------------------------------------------ */
  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      updateNavTheme();
      updateStatement();
      updateStack();
      ticking = false;
    });
  }
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  updateNavTheme(); updateStatement(); updateStack();

  /* ---------- Contact form ---------- */
  const cform = $('#contactForm');
  if (cform) {
    const status = $('#cformStatus');
    const submit = $('button[type="submit"]', cform);

    // The giant "Get in touch" button sends people to the form.
    const cta = $('#cta');
    if (cta && cta.getAttribute('href') === '#contactForm') {
      cta.addEventListener('click', e => {
        e.preventDefault();
        cform.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
        const first = $('#cf-name', cform);
        if (reduce) { first.focus(); return; }
        setTimeout(() => first.focus({ preventScroll: true }), 520);
      });
    }

    cform.addEventListener('submit', async e => {
      e.preventDefault();
      status.className = 'cform__status';
      status.textContent = 'Sending…';
      submit.disabled = true;

      try {
        const payload = Object.fromEntries(new FormData(cform));
        const res = await fetch(cform.action, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(payload)
        });
        const out = await res.json().catch(() => ({}));
        if (!res.ok || !out.success) throw new Error(out.message || 'Request failed');
        cform.reset();
        status.classList.add('is-ok');
        status.textContent = 'Thank you — your message is on its way.';
      } catch (err) {
        status.classList.add('is-err');
        status.textContent = 'That did not send. Please email gulnar.rza.e@gmail.com directly.';
      } finally {
        submit.disabled = false;
      }
    });
  }
})();
