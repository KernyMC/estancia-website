// Capturas viejo vs nuevo para la presentación. node scripts/deck-shots.mjs
import puppeteer from 'puppeteer-core';
import { mkdtempSync } from 'node:fs';
const OUT = 'presentacion/img';
const targets = [
  ['old-home-d', 'https://estancia.com/', 1440, 900],
  ['new-home-d', 'http://localhost:4327/', 1440, 900],
  ['old-home-m', 'https://estancia.com/', 390, 844],
  ['new-home-m', 'http://localhost:4327/', 390, 844],
  ['old-hol-d', 'https://estancia.com/holidays-schedule/', 1440, 900],
  ['new-hol-d', 'http://localhost:4327/holidays/', 1440, 900],
  ['old-menu-d', 'https://estancia.com/menu-list-austin/', 1440, 900],
  ['new-menu-d', 'http://localhost:4327/austin/menu/', 1440, 900],
];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', userDataDir: mkdtempSync(process.env.TEMP + '/pp-') });
for (const [name, url, w, h] of targets) {
  const p = await b.newPage();
  await p.setViewport({ width: w, height: h, isMobile: w < 800, hasTouch: w < 800 });
  await p.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36');
  await p.evaluateOnNewDocument(() => sessionStorage.setItem('introSeen', '1'));
  try {
    await p.goto(url, { waitUntil: 'networkidle2', timeout: 90000 });
    await sleep(2500);
    await p.screenshot({ path: `${OUT}/${name}.jpg`, type: 'jpeg', quality: 72 });
    console.log('ok', name);
  } catch (e) { console.log('FALLÓ', name, e.message.slice(0, 80)); }
  await p.close();
}
await b.close();
await new Promise((r) => setTimeout(r, 2500));
