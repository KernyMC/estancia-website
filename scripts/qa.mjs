// QA automático de responsive y UX. Requiere el sitio sirviéndose (pnpm exec astro dev --port 4327) y Chrome instalado.
// Uso:  node scripts/qa.mjs [--quick] [--routes=/,/order/] [--base=http://localhost:4327] [--shots=carpeta]
//   --quick  = solo 390, 768 y 1440 px.  Sin --routes = lista de rutas clave.
import puppeteer from 'puppeteer-core';
import { mkdtempSync, mkdirSync } from 'node:fs';

const arg = (n, d) => (process.argv.find((a) => a.startsWith(`--${n}=`)) ?? '').split('=')[1] ?? d;
const quick = process.argv.includes('--quick');
const base = arg('base', 'http://localhost:4327');
const shots = arg('shots', '');
const routes = (arg('routes', '') || [
  '/', '/menu/', '/menu/churrasco/', '/austin/', '/austin/menu/', '/leander/', '/austin/private-dining/', '/locations/', '/reserve/', '/order/',
  '/private-dining/', '/events/', '/events/daou-tasting/', '/holidays/', '/thanksgiving/', '/christmas/', '/new-years/', '/easter/', '/specials/',
  '/gift-cards/', '/news/', '/news/what-is-picanha/', '/faq/', '/contact/', '/careers/', '/subscribe/', '/privacy/', '/terms/', '/accessibility/',
].join(',')).split(',');
const viewports = quick
  ? [[390, 844], [768, 1024], [1440, 900]]
  : [[360, 740], [390, 844], [768, 1024], [1024, 768], [1280, 800], [1440, 900]];
if (shots) mkdirSync(shots, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  userDataDir: mkdtempSync(process.env.TEMP + '/qa-'),
  args: ['--autoplay-policy=no-user-gesture-required'],
});

const results = [];
for (const route of routes) {
  for (const [w, h] of viewports) {
    const page = await browser.newPage();
    await page.setViewport({ width: w, height: h, isMobile: w < 800, hasTouch: w < 800 });
    await page.evaluateOnNewDocument(() => sessionStorage.setItem('introSeen', '1'));
    const issues = [];
    page.on('pageerror', (e) => issues.push(`error JS: ${e.message.slice(0, 120)}`));
    page.on('console', (m) => { if (m.type() === 'error' && !/WebSocket|ERR_CONNECTION/.test(m.text())) issues.push(`consola: ${m.text().slice(0, 120)}`); });
    page.on('response', (r) => { if (r.status() >= 400 && !r.url().includes('/@') && !r.url().includes('favicon')) issues.push(`HTTP ${r.status()}: ${r.url().replace(base, '')}`); });
    try {
      await page.goto(base + route, { waitUntil: 'networkidle2', timeout: 60000 });
      await sleep(600);
      // recorrer la página para activar lazy-load y los reveals
      const total = await page.evaluate(() => document.documentElement.scrollHeight);
      for (let y = 0; y < total; y += Math.max(300, h * 0.7)) { await page.evaluate((yy) => scrollTo({ top: yy, behavior: 'instant' }), y); await sleep(110); }
      await sleep(900);
      const r = await page.evaluate((vw) => {
        const vis = (el) => { const s = getComputedStyle(el); const b = el.getBoundingClientRect(); return s.display !== 'none' && s.visibility !== 'hidden' && b.width > 0 && b.height > 0 && !el.closest('[hidden]') && !el.closest('.drawer') && !el.closest('.sr-only'); };
        const out = {};
        out.overflowX = document.documentElement.scrollWidth - innerWidth;
        // elementos que se salen por la derecha (excluye los que están dentro de un carrusel/contenedor con scroll horizontal)
        const inScroller = (el) => { for (let p = el.parentElement; p; p = p.parentElement) { const s = getComputedStyle(p); if (/(auto|scroll)/.test(s.overflowX) && p.scrollWidth > p.clientWidth + 1) return true; if (s.overflow === 'hidden' || s.overflowX === 'hidden' || s.overflowX === 'clip') return true; } return false; };
        out.offenders = out.overflowX > 1 ? [...document.body.querySelectorAll('*')].filter((e) => vis(e) && e.getBoundingClientRect().right > vw + 2 && !inScroller(e)).slice(0, 4).map((e) => `${e.tagName.toLowerCase()}.${(e.className || '').toString().split(' ')[0]}`) : [];
        out.brokenImgs = [...document.images].filter((i) => i.complete && i.naturalWidth === 0 && vis(i)).map((i) => i.getAttribute('src')).slice(0, 4);
        out.h1 = document.querySelectorAll('h1').length;
        out.stuckReveal = [...document.querySelectorAll('[data-reveal],[data-mask],[data-stagger] > *')].filter((e) => vis(e) && getComputedStyle(e).opacity === '0' && !e.closest('.cta__side') && !e.closest('[class*="hs"]') && !e.closest('.cards:not(.cards--grid), .rooms, .dishes')).length;
        out.tiny = [...document.querySelectorAll('a, button, summary, select, input:not([type=hidden]):not(.honey):not([type=checkbox]):not([type=radio]), textarea')].filter((e) => { if (!vis(e) || e.closest('.nav__menu, .nav__drop, .prose, .faq, .legal-note, .note, .footer__legal, .crumbs, .consent')) return false; const b = e.getBoundingClientRect(); return (b.height < 36 || (b.width < 36 && b.height < 44)) && !e.matches('.skip, .sr-only'); }).slice(0, 4).map((e) => `${e.tagName.toLowerCase()} "${(e.textContent || e.getAttribute('aria-label') || '').trim().slice(0, 18)}" ${Math.round(e.getBoundingClientRect().width)}x${Math.round(e.getBoundingClientRect().height)}`);
        out.smallText = [...document.querySelectorAll('p, li, span, a, label, td, th, small, b, i, em')].filter((e) => vis(e) && e.children.length === 0 && e.textContent.trim().length > 3 && parseFloat(getComputedStyle(e).fontSize) < 11 && !e.closest('.film, .intro, .gcard, .tile, .hero__badge')).map((e) => `${e.tagName.toLowerCase()}.${(e.className || '').toString().split(' ')[0]} "${e.textContent.trim().slice(0, 14)}" ${parseFloat(getComputedStyle(e).fontSize).toFixed(1)}px`);
        out.unlabeled = [...document.querySelectorAll('input:not([type=hidden]):not(.honey):not([type=checkbox]):not([type=radio]):not([type=submit]), select, textarea')].filter((e) => vis(e) && !(e.id && document.querySelector(`label[for="${e.id}"]`)) && !e.closest('label') && !e.getAttribute('aria-label')).length;
        return out;
      }, w);
      if (r.overflowX > 1) issues.push(`desborde horizontal ${r.overflowX}px (${r.offenders.join(', ') || 'sin culpable visible'})`);
      if (r.brokenImgs.length) issues.push(`imágenes rotas: ${r.brokenImgs.join(', ')}`);
      if (r.h1 !== 1) issues.push(`h1=${r.h1}`);
      if (r.stuckReveal) issues.push(`${r.stuckReveal} elementos de animación quedaron invisibles`);
      if (w < 800 && r.tiny.length) issues.push(`objetivos táctiles <36px: ${r.tiny.join(' | ')}`);
      if (r.smallText.length) issues.push(`textos <11px: ${r.smallText.slice(0, 4).join(' | ')} (${r.smallText.length})`);
      if (r.unlabeled) issues.push(`${r.unlabeled} campos sin label`);
      if (shots) await page.screenshot({ path: `${shots}/${route.replace(/\//g, '_') || '_'}-${w}.jpg`, type: 'jpeg', quality: 55, fullPage: false });
    } catch (e) { issues.push(`no cargó: ${e.message.slice(0, 80)}`); }
    results.push({ route, w, issues: [...new Set(issues)] });
    await page.close();
  }
}
await browser.close();
await sleep(900);

const bad = results.filter((r) => r.issues.length);
console.log(`QA: ${routes.length} rutas × ${viewports.length} tamaños = ${results.length} revisiones · con hallazgos: ${bad.length}`);
for (const r of bad) console.log(`\n${r.route} @${r.w}px\n  - ${r.issues.join('\n  - ')}`);
if (!bad.length) console.log('Sin hallazgos.');
process.exitCode = bad.length ? 1 : 0;
