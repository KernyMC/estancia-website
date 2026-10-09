import puppeteer from 'puppeteer-core';
import { mkdtempSync } from 'node:fs';
const out = process.argv[2];
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', userDataDir: mkdtempSync(process.env.TEMP + '/pp-') });
const p = await b.newPage();
await p.setViewport({ width: 1440, height: 900 });
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.goto('http://localhost:4327/', { waitUntil: 'networkidle2' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await p.evaluate(() => document.querySelector('[data-flow]').scrollIntoView({ block: 'center' }));
const st = () => p.evaluate(() => ({ go: document.querySelector('.flip').classList.contains('is-go'), on: [...document.querySelectorAll('.flow li')].map((l) => l.className.replace('is-', '')).join('|'), auto: document.querySelector('[data-flow]').classList.contains('is-auto') }));
const log = [];
for (const t of [700, 2600, 2600, 2600]) { await sleep(t); log.push(await st()); await p.screenshot({ path: `${out}-${log.length}.jpg`, type: 'jpeg', quality: 65 }); }
await p.click('.flip'); await sleep(1200); log.push({ afterClick: await st() });
await sleep(3000); log.push({ afterWait: await st() });
console.log(JSON.stringify({ errs, log }, null, 1));
await b.close();
