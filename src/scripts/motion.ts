// Movimiento ligero sin librerías: IntersectionObserver + rAF. Respeta prefers-reduced-motion.
let ac: AbortController | null = null;
const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const $$ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => Array.from(r.querySelectorAll<T>(s));
const clamp = (n: number, a = 0, b = 1) => Math.min(b, Math.max(a, n));

const held: Element[] = [];
const flushHeld = () => held.splice(0).forEach((t) => t.classList.add('in'));

/** Intro de la home: logo centrado -> la cortina se abre sobre el video -> aparecen nav, titular y botones. */
function initIntro(sig: AbortSignal) {
  const root = document.documentElement;
  const el = document.querySelector<HTMLElement>('.intro');
  if (!el) return;
  if (!root.classList.contains('intro-pending')) return el.remove();
  const timers: number[] = [];
  let opened = false;
  const open = (fast = false) => {
    if (opened) return;
    opened = true;
    timers.forEach(clearTimeout);
    try { sessionStorage.setItem('introSeen', '1'); } catch { /* sin storage: se repite, no pasa nada */ }
    el.classList.add('is-out');
    // a mitad de la apertura arranca el resto de la página
    timers.push(window.setTimeout(() => { root.classList.remove('intro-pending'); flushHeld(); }, fast ? 350 : 750));
    timers.push(window.setTimeout(() => el.remove(), fast ? 900 : 1400));
  };
  timers.push(window.setTimeout(() => open(), 2500)); // logo visible ~2.5 s antes de abrir
  // Se puede saltar con clic, toque o tecla
  const skip = () => open(true);
  el.addEventListener('click', skip, { signal: sig });
  addEventListener('keydown', skip, { once: true, signal: sig });
  sig.addEventListener('abort', () => timers.forEach(clearTimeout));
}

/** Envuelve cada palabra en una máscara para el reveal por líneas (conserva <em>). */
function split(el: HTMLElement) {
  let i = 0;
  const walk = (node: Node) => {
    Array.from(node.childNodes).forEach((n) => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        (n.textContent ?? '').split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) return frag.append(' ');
          const w = document.createElement('span');
          w.className = 'w';
          const s = document.createElement('span');
          s.style.setProperty('--i', String(i++));
          s.textContent = part;
          w.append(s);
          frag.append(w);
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1) walk(n);
    });
  };
  const label = el.textContent?.trim() ?? '';
  walk(el);
  el.setAttribute('aria-label', label);
  $$('.w', el).forEach((w) => w.setAttribute('aria-hidden', 'true'));
}

function initReveal(sig: AbortSignal) {
  $$('[data-split]').forEach((el) => !el.dataset.done && ((el.dataset.done = '1'), split(el)));
  // Grupos grandes (p. ej. 68 posts): se observa cada hijo, con retardo cíclico, para que no esperen a que el contenedor entero sea visible.
  const big = $$('[data-stagger]').filter((p) => p.children.length > 8);
  $$('[data-stagger]').forEach((p) => Array.from(p.children).forEach((c, i) => (c as HTMLElement).style.setProperty('--i', String(p.children.length > 8 ? i % 3 : i))));
  const targets = [
    ...$$('[data-reveal],[data-mask],[data-split]'),
    ...$$('[data-stagger]').filter((p) => !big.includes(p)),
    ...big.flatMap((p) => Array.from(p.children) as HTMLElement[]),
  ];
  if (reduce() || !('IntersectionObserver' in window)) return targets.forEach((t) => t.classList.add('in'));
  const io = new IntersectionObserver(
    (entries) =>
      entries.forEach((e) => {
        if (e.isIntersecting) {
          // Durante el intro, los elementos del hero esperan a que se abra la cortina
          if (document.documentElement.classList.contains('intro-pending') && e.target.closest('.hero')) held.push(e.target);
          else e.target.classList.add('in');
          io.unobserve(e.target);
        }
      }),
    { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
  );
  targets.forEach((t) => io.observe(t));
  sig.addEventListener('abort', () => io.disconnect());
}

function initNav(sig: AbortSignal) {
  const nav = document.querySelector<HTMLElement>('.nav');
  if (!nav) return;
  let last = scrollY;
  let ticking = false;
  const update = () => {
    const y = scrollY;
    const dy = y - last;
    nav.classList.toggle('is-solid', y > 40);
    const menuOpen = document.body.classList.contains('menu-open');
    if (y < 120 || menuOpen) nav.classList.remove('is-hidden');
    else if (dy > 6) nav.classList.add('is-hidden'); // bajando: se esconde
    else if (dy < -4) nav.classList.remove('is-hidden'); // subiendo: vuelve
    if (Math.abs(dy) > 4) last = y;
    ticking = false;
  };
  update();
  addEventListener('scroll', () => !ticking && ((ticking = true), requestAnimationFrame(update)), { passive: true, signal: sig });
  // También reaparece al llevar el mouse al borde superior o al enfocar con teclado.
  addEventListener('mousemove', (e) => e.clientY < 70 && nav.classList.remove('is-hidden'), { passive: true, signal: sig });
  nav.addEventListener('focusin', () => nav.classList.remove('is-hidden'), { signal: sig });
  addEventListener('keydown', (e) => (e.key === 'Home' || e.key === 'ArrowUp') && nav.classList.remove('is-hidden'), { signal: sig });

  const burger = document.querySelector<HTMLButtonElement>('.burger');
  const set = (open: boolean) => {
    document.body.classList.toggle('menu-open', open);
    burger?.setAttribute('aria-expanded', String(open));
    if (open) nav.classList.remove('is-hidden');
  };
  burger?.addEventListener('click', () => set(!document.body.classList.contains('menu-open')), { signal: sig });
  $$('.drawer a').forEach((a) => a.addEventListener('click', () => set(false), { signal: sig }));
  addEventListener('keydown', (e) => e.key === 'Escape' && set(false), { signal: sig });
  set(false);
}

function initScrollFx(sig: AbortSignal) {
  const par = $$('[data-parallax]');
  const hs = $$('.hs');
  const hsStatic = matchMedia('(max-width: 860px)').matches || reduce();
  hs.forEach((h) => h.classList.toggle('hs--static', hsStatic));
  const bars = $$('[data-progress]');
  const frame = () => {
    const vh = innerHeight;
    if (!reduce()) {
      par.forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) return;
        const speed = parseFloat(el.dataset.parallax || '0.1');
        const y = (r.top + r.height / 2 - vh / 2) * -speed;
        el.style.transform = `translate3d(0, ${y.toFixed(1)}px, 0)`;
      });
    }
    if (!hsStatic) {
      hs.forEach((h) => {
        const track = h.querySelector<HTMLElement>('.hs__track');
        if (!track) return;
        const r = h.getBoundingClientRect();
        const p = clamp(-r.top / (r.height - vh));
        const dist = Math.max(0, track.scrollWidth - innerWidth);
        track.style.transform = `translate3d(${(-p * dist).toFixed(1)}px,0,0)`;
        h.style.setProperty('--p', p.toFixed(3));
      });
    }
    bars.forEach((b) => {
      const max = document.documentElement.scrollHeight - vh;
      b.style.transform = `scaleX(${max > 0 ? clamp(scrollY / max) : 0})`;
    });
  };
  let ticking = false;
  const on = () => !ticking && ((ticking = true), requestAnimationFrame(() => ((ticking = false), frame())));
  frame();
  addEventListener('scroll', on, { passive: true, signal: sig });
  addEventListener('resize', on, { signal: sig });
}

function initCounters(sig: AbortSignal) {
  const els = $$('[data-count]');
  if (!els.length) return;
  const run = (el: HTMLElement) => {
    const to = parseFloat(el.dataset.count || '0');
    const dec = (el.dataset.count || '').includes('.') ? 1 : 0;
    const suffix = el.dataset.suffix || '';
    if (reduce()) return void (el.textContent = to.toFixed(dec) + suffix);
    const t0 = performance.now();
    const step = (t: number) => {
      const p = clamp((t - t0) / 1800);
      const eased = 1 - Math.pow(1 - p, 4);
      el.textContent = (to * eased).toFixed(dec) + suffix;
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && (run(e.target as HTMLElement), io.unobserve(e.target))), { threshold: 0.6 });
  els.forEach((e) => io.observe(e));
  sig.addEventListener('abort', () => io.disconnect());
}

function initInteractions(sig: AbortSignal) {
  // Selector de local (tabs accesibles)
  $$('[data-tabs]').forEach((root) => {
    const tabs = $$<HTMLButtonElement>('[role=tab]', root);
    const panels = $$('[role=tabpanel]', root);
    const show = (id: string) => {
      tabs.forEach((t) => t.setAttribute('aria-selected', String(t.dataset.tab === id)));
      panels.forEach((p) => (p.hidden = p.dataset.panel !== id));
      history.replaceState(null, '', '#' + id);
    };
    tabs.forEach((t) => t.addEventListener('click', () => show(t.dataset.tab!), { signal: sig }));
    const h = location.hash.slice(1);
    if (h && tabs.some((t) => t.dataset.tab === h)) show(h);
  });
  // Tarjeta verde/roja + pasos que se iluminan en bucle (se detiene si el usuario interactúa)
  $$('[data-flow]').forEach((root) => {
    const card = root.querySelector<HTMLButtonElement>('.flip');
    const steps = $$('.flow li', root);
    if (!card || !steps.length) return;
    const STEP_MS = 2600;
    let cur = 0;
    let timer = 0;
    const show = (i: number) => {
      cur = i;
      const go = i === 1; // paso 2: verde; pasos 1 y 3: roja
      card.classList.toggle('is-go', go);
      card.setAttribute('aria-pressed', String(go));
      steps.forEach((s, n) => {
        s.classList.toggle('is-on', n === i);
        s.classList.toggle('is-done', n < i);
      });
    };
    const stop = () => {
      clearInterval(timer);
      root.classList.remove('is-auto');
    };
    const play = () => {
      stop();
      if (reduce()) return show(1);
      root.classList.add('is-auto');
      show(cur);
      timer = window.setInterval(() => {
        const next = (cur + 1) % steps.length;
        // reinicia la animación de la barra al volver al inicio
        if (next === 0) steps.forEach((s) => s.classList.remove('is-done', 'is-on'));
        requestAnimationFrame(() => show(next));
      }, STEP_MS);
    };
    root.style.setProperty('--step', `${STEP_MS}ms`);
    card.addEventListener('click', () => {
      stop();
      show(card.classList.contains('is-go') ? 2 : 1);
    }, { signal: sig });
    steps.forEach((s, n) => s.addEventListener('click', () => { stop(); show(n); }, { signal: sig }));
    const io = new IntersectionObserver((es) => es.forEach((e) => (e.isIntersecting ? play() : stop())), { threshold: 0.4 });
    io.observe(root);
    show(0);
    sig.addEventListener('abort', () => { io.disconnect(); stop(); });
  });
  // Botones magnéticos y brillo del hero (solo puntero fino)
  if (matchMedia('(hover: hover) and (pointer: fine)').matches && !reduce()) {
    $$('[data-magnetic]').forEach((b) => {
      b.addEventListener('mousemove', (e) => {
        const r = b.getBoundingClientRect();
        b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.18}px, ${(e.clientY - r.top - r.height / 2) * 0.3}px)`;
      }, { signal: sig });
      b.addEventListener('mouseleave', () => (b.style.transform = ''), { signal: sig });
    });
    $$('.glow').forEach((g) => g.addEventListener('mousemove', (e) => {
      const r = g.getBoundingClientRect();
      g.style.setProperty('--mx', `${e.clientX - r.left}px`);
      g.style.setProperty('--my', `${e.clientY - r.top}px`);
    }, { signal: sig }));
  }
  // Tarjetas 3D: inclinación + brillo + foil siguen al puntero (ratón o dedo)
  if (!reduce()) {
    $$('.tilt').forEach((t) => {
      const move = (e: PointerEvent) => {
        const r = t.getBoundingClientRect();
        const px = clamp((e.clientX - r.left) / r.width);
        const py = clamp((e.clientY - r.top) / r.height);
        t.classList.add('is-moving');
        t.style.setProperty('--ry', `${((px - 0.5) * 26).toFixed(2)}deg`);
        t.style.setProperty('--rx', `${((0.5 - py) * 20).toFixed(2)}deg`);
        t.style.setProperty('--gx', `${(px * 100).toFixed(1)}%`);
        t.style.setProperty('--gy', `${(py * 100).toFixed(1)}%`);
        t.style.setProperty('--mx', (px - 0.5).toFixed(3));
        t.style.setProperty('--my', (py - 0.5).toFixed(3));
        t.style.setProperty('--ga', `${(Math.atan2(py - 0.5, px - 0.5) * 180) / Math.PI + 90}deg`);
      };
      const leave = () => {
        t.classList.remove('is-moving');
        ['--rx', '--ry', '--mx', '--my'].forEach((v) => t.style.removeProperty(v));
      };
      t.addEventListener('pointermove', move, { signal: sig });
      t.addEventListener('pointerleave', leave, { signal: sig });
    });
  }
  // Formularios (demo: sin envío real)
  $$<HTMLFormElement>('form[data-demo]').forEach((f) => f.addEventListener('submit', (e) => {
    e.preventDefault();
    f.querySelector('.form-note')?.classList.add('show');
    f.querySelectorAll('button[type=submit]').forEach((b) => ((b as HTMLButtonElement).disabled = true));
  }, { signal: sig }));
}

/** "Open now" en hora de Texas (America/Chicago). */
function initOpenNow() {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', weekday: 'short', hour: 'numeric', minute: 'numeric', hour12: false }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
  const mins = (parseInt(get('hour')) % 24) * 60 + parseInt(get('minute'));
  const T = (h: number, m = 0) => h * 60 + m;
  const sched: Record<number, [number, number][]> = {
    0: [[T(11), T(21)]], 1: [[T(11), T(15, 30)], [T(17), T(22)]], 2: [[T(11), T(15, 30)], [T(17), T(22)]], 3: [[T(11), T(15, 30)], [T(17), T(22)]],
    4: [[T(11), T(15, 30)], [T(17), T(22)]], 5: [[T(11), T(15, 30)], [T(17), T(22, 30)]], 6: [[T(11), T(22, 30)]],
  };
  const fmt = (m: number) => { const h = Math.floor(m / 60), mm = m % 60; return `${((h + 11) % 12) + 1}${mm ? ':' + String(mm).padStart(2, '0') : ''} ${h < 12 ? 'am' : 'pm'}`; };
  const slot = sched[day].find(([a, b]) => mins >= a && mins < b);
  const next = sched[day].find(([a]) => mins < a);
  $$('[data-open]').forEach((el) => {
    el.classList.toggle('is-open', !!slot);
    el.textContent = slot ? `Open now · until ${fmt(slot[1])}` : next ? `Closed · opens ${fmt(next[0])}` : 'Closed · opens tomorrow';
  });
}

/** El video del hero aparece (fundido) solo cuando ya reproduce; respeta Save-Data. */
function initHeroVideo(sig: AbortSignal) {
  const v = document.querySelector<HTMLVideoElement>('.hero__video');
  if (!v) return;
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  if (conn?.saveData || reduce()) return v.remove();
  const on = () => v.classList.add('is-playing');
  v.addEventListener('playing', on, { once: true, signal: sig });
  if (!v.paused && v.readyState >= 3) on(); // el autoplay pudo arrancar antes de registrar el evento
  v.play().catch(() => {}); // si el navegador lo bloquea, queda el póster
  // Pausa fuera de pantalla para ahorrar CPU/batería
  const io = new IntersectionObserver((es) => es.forEach((e) => (e.isIntersecting ? v.play().catch(() => {}) : v.pause())), { threshold: 0.05 });
  io.observe(v);
  sig.addEventListener('abort', () => io.disconnect());
}

/** Cinta de película curva: repite el texto, mide su largo exacto y lo hace correr por la curva en bucle perfecto; */
function initFilmStrip(sig: AbortSignal) {
  const svgs = $$<SVGSVGElement>('svg[data-film]');
  if (!svgs.length) return;
  const NS = 'http://www.w3.org/2000/svg';
  const SPEED = 55; // unidades del viewBox por segundo
  const setup = () => {
    svgs.forEach((svg) => {
      if (svg.dataset.ready) return;
      const unit = svg.dataset.unit ?? '';
      const text = svg.querySelector('text');
      const tp = svg.querySelector('textPath');
      if (!text || !tp || !unit) return;
      tp.textContent = unit; // medir una unidad
      const u = text.getComputedTextLength();
      if (!u) return;
      const path = svg.querySelector<SVGPathElement>('defs path');
      const need = Math.ceil(((path?.getTotalLength() ?? 1800) + u) / u) + 1;
      tp.textContent = unit.repeat(need);
      svg.dataset.ready = '1';
      if (reduce()) return;
      const anim = document.createElementNS(NS, 'animate');
      anim.setAttribute('attributeName', 'startOffset');
      anim.setAttribute('from', '0');
      anim.setAttribute('to', String(-u));
      anim.setAttribute('dur', `${(u / SPEED).toFixed(2)}s`);
      anim.setAttribute('repeatCount', 'indefinite');
      tp.append(anim);
    });
  };
  // las métricas del texto dependen de la fuente
  document.fonts?.ready.then(setup);
  setup();
  sig.addEventListener('abort', () => svgs.forEach((s) => delete s.dataset.ready));
}

function init() {
  ac?.abort();
  ac = new AbortController();
  const sig = ac.signal;
  initIntro(sig);
  initNav(sig);
  initReveal(sig);
  initScrollFx(sig);
  initCounters(sig);
  initInteractions(sig);
  initOpenNow();
  initHeroVideo(sig);
  initFilmStrip(sig);
}

let started = false;
const boot = () => ((started = true), init());
document.addEventListener('astro:page-load', boot);
document.addEventListener('astro:before-swap', () => ((started = false), ac?.abort()));
// Respaldo por si el evento de Astro llegó antes de registrar el listener.
setTimeout(() => !started && boot(), 200);
