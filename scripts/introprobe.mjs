import puppeteer from 'puppeteer-core';
import { mkdtempSync } from 'node:fs';
const out = process.argv[2];
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', userDataDir: mkdtempSync(process.env.TEMP + '/pp-'), args: ['--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage();
await p.setViewport({ width: 1440, height: 810 });
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const t0 = Date.now();
await p.goto('http://localhost:4327/', { waitUntil: 'domcontentloaded' });
const state = () => p.evaluate(() => ({ pending: document.documentElement.classList.contains('intro-pending'), intro: !!document.querySelector('.intro'), out: document.querySelector('.intro')?.classList.contains('is-out') ?? null, navOp: getComputedStyle(document.querySelector('.nav')).opacity, h1in: document.querySelector('.hero h1').classList.contains('in'), seen: sessionStorage.getItem('introSeen') }));
const log = [];
let i = 0;
for (const at of [500, 1500, 2700, 3300, 4200, 6000]) {
  await sleep(Math.max(0, at - (Date.now() - t0)));
  const s = await state(); log.push({ at, ...s });
  await p.screenshot({ path: `${out}-${i++}.jpg`, type: 'jpeg', quality: 62 });
}
await p.reload({ waitUntil: 'networkidle2' }); await sleep(800);
log.push({ afterReload: await state() });
console.log(JSON.stringify({ errs, log }, null, 1));
await b.close();
