// Altura de cada sección de una ruta como % del viewport. node scripts/heights.mjs [/ruta]
import puppeteer from 'puppeteer-core';
import { mkdtempSync } from 'node:fs';
const route = process.argv[2] ?? '/';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', userDataDir: mkdtempSync(process.env.TEMP + '/pp-') });
for (const [w, h] of [[1440, 900], [768, 1024], [390, 844]]) {
  const p = await b.newPage();
  await p.setViewport({ width: w, height: h });
  await p.evaluateOnNewDocument(() => sessionStorage.setItem('introSeen', '1'));
  await p.goto('http://localhost:4327' + route, { waitUntil: 'networkidle2' });
  const total = await p.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < total; y += 500) { await p.evaluate((yy) => scrollTo({ top: yy, behavior: 'instant' }), y); await new Promise((r) => setTimeout(r, 80)); }
  const rows = await p.evaluate(() => [...document.querySelectorAll('main > section, main > .film, main > .locs, main > div')].map((s) => { const hs = s.classList.contains('hs'); const name = (s.querySelector('h1,h2')?.textContent || s.className).trim().replace(/\s+/g, ' ').slice(0, 30); return { name, hs, h: Math.round(hs ? s.querySelector('.hs__stick').getBoundingClientRect().height : s.getBoundingClientRect().height) }; }));
  console.log(`\n== ${w}x${h}`);
  rows.forEach((r) => console.log(`${String(Math.round((r.h / h) * 100)).padStart(4)}%  ${String(r.h).padStart(5)}px  ${r.name}${r.hs ? ' (pinned)' : ''}`));
  await p.close();
}
await b.close();
await new Promise((r) => setTimeout(r, 2500));
