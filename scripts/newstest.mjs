// Prueba de /news/: paginación, buscador y filtros. node scripts/newstest.mjs
import puppeteer from 'puppeteer-core';
import { mkdtempSync } from 'node:fs';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', userDataDir: mkdtempSync(process.env.TEMP + '/pp-') });
const p = await b.newPage();
await p.setViewport({ width: 1440, height: 900 });
const errs = [];
p.on('pageerror', (e) => errs.push(e.message));
p.on('console', (m) => m.type() === 'error' && !/WebSocket|ERR_CONNECTION/.test(m.text()) && errs.push(m.text()));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const out = {};
await p.goto('http://localhost:4327/news/', { waitUntil: 'networkidle2' });
out.page1 = await p.evaluate(() => ({ cards: document.querySelectorAll('[data-news-default] .card').length, pager: [...document.querySelectorAll('.pager ol a, .pager__gap')].map((a) => a.textContent), count: document.querySelector('.pager__count')?.textContent }));
const bar = await p.evaluate(() => { const t = document.querySelector('.topics').getBoundingClientRect(); const s = document.querySelector('.news-search').getBoundingClientRect(); return { topicsRight: Math.round(t.right), searchLeft: Math.round(s.left), sameRow: Math.abs(t.top - s.top) < 40 }; });
out.bar = bar;
await p.screenshot({ path: process.env.TEMP + '/est/s/news-1.jpg', type: 'jpeg', quality: 70 });
// buscador
await p.type('#news-q', 'picanha'); await sleep(900);
out.search = await p.evaluate(() => ({ status: document.querySelector('[data-news-status]').textContent, results: document.querySelectorAll('[data-news-results] .card').length, defaultHidden: document.querySelector('[data-news-default]').hidden, url: location.search }));
await p.screenshot({ path: process.env.TEMP + '/est/s/news-2.jpg', type: 'jpeg', quality: 70 });
await p.type('#news-q', 'zzzz'); await sleep(700);
out.noResults = await p.evaluate(() => document.querySelector('[data-news-status]').textContent);
await p.keyboard.press('Escape'); await sleep(500);
out.cleared = await p.evaluate(() => ({ defaultVisible: !document.querySelector('[data-news-default]').hidden, q: document.querySelector('#news-q').value }));
// paginación (navegación suave)
await Promise.all([p.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {}), p.evaluate(() => document.querySelector('.pager ol a[aria-label="Page 2"]').click())]);
await sleep(1200);
out.page2 = await p.evaluate(() => ({ path: location.pathname, cards: document.querySelectorAll('[data-news-default] .card').length, current: document.querySelector('.pager [aria-current=page]')?.textContent, title: document.title }));
await p.goto('http://localhost:4327/news/page/6/', { waitUntil: 'networkidle2' });
out.page6 = await p.evaluate(() => ({ cards: document.querySelectorAll('[data-news-default] .card').length, nextOff: !!document.querySelector('.pager__step.is-off span')?.textContent.includes('Next') }));
await p.goto('http://localhost:4327/news/topic/churrasco/', { waitUntil: 'networkidle2' });
out.topic = await p.evaluate(() => ({ cards: document.querySelectorAll('[data-news-default] .card').length, pages: document.querySelectorAll('.pager ol li').length }));
await p.goto('http://localhost:4327/news/?q=brunch', { waitUntil: 'networkidle2' }); await sleep(900);
out.deepLink = await p.evaluate(() => document.querySelector('[data-news-status]').textContent);
out.errors = errs;
console.log(JSON.stringify(out, null, 1));
await b.close();
await new Promise((r) => setTimeout(r, 2500));
