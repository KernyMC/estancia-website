// Micro-interacciones (puerto vanilla de Amicro): un único listener delegado, rAF, sin dependencias.
// Solo puntero fino con hover y sin prefers-reduced-motion. En táctil: vibración breve opcional.
export {};
const noMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
if (!noMotion) {
  if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
    // --x/--y (px) para el glow de botones; --px/--py (-0.5..0.5) para el parallax interno de las salas.
    let el: HTMLElement | null = null;
    let ev: PointerEvent | null = null;
    let raf = 0;
    const frame = () => {
      raf = 0;
      if (!el || !ev) return;
      const r = el.getBoundingClientRect();
      const x = ev.clientX - r.left, y = ev.clientY - r.top;
      el.style.setProperty('--x', `${x.toFixed(0)}px`);
      el.style.setProperty('--y', `${y.toFixed(0)}px`);
      el.style.setProperty('--px', (x / r.width - 0.5).toFixed(3));
      el.style.setProperty('--py', (y / r.height - 0.5).toFixed(3));
    };
    document.addEventListener('pointermove', (e) => {
      const t = (e.target as Element).closest?.('.btn, .room .mask') as HTMLElement | null;
      if (!t) return;
      el = t; ev = e;
      raf ||= requestAnimationFrame(frame);
    }, { passive: true });
    document.addEventListener('pointerout', (e) => {
      const t = (e.target as Element).closest?.('.btn, .room .mask');
      if (t && el === t && !t.contains(e.relatedTarget as Node)) { cancelAnimationFrame(raf); raf = 0; el = null; ev = null; }
    }, { passive: true });
  } else if ('vibrate' in navigator && !(navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData) {
    document.addEventListener('pointerdown', (e) => { if ((e.target as Element).closest?.('.btn')) navigator.vibrate(10); }, { passive: true });
  }
}
