import puppeteer from 'puppeteer-core';
import { mkdtempSync } from 'node:fs';
const out = process.argv[2];
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', userDataDir: mkdtempSync(process.env.TEMP + '/pp-') });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const res = [];
for (const [w, h] of [[1440, 900], [1366, 650], [1920, 1080], [1280, 600]]) {
  const p = await b.newPage();
  await p.setViewport({ width: w, height: h });
  await p.evaluateOnNewDocument(() => sessionStorage.setItem('introSeen', '1'));
  await p.goto('http://localhost:4327/?x', { waitUntil: 'networkidle2' });
  await sleep(500);
  await p.evaluate(() => { const y = document.querySelector('.hs').getBoundingClientRect().top + scrollY + innerHeight * 1.6; scrollTo({ top: y, behavior: 'instant' }); });
  await sleep(1800);
  const m = await p.evaluate(() => {
    const st = document.querySelector('.hs__stick').getBoundingClientRect();
    const cuts = [...document.querySelectorAll('.cut')].map((c) => { const r = c.getBoundingClientRect(); const pr = c.querySelector('h3').getBoundingClientRect(); return { l: Math.round(r.left), bottomP: Math.round(pr.bottom), clipped: pr.bottom > innerHeight - 2 }; }).filter((c) => c.l > -50 && c.l < innerWidth);
    return { vh: innerHeight, stickTop: Math.round(st.top), anyClipped: cuts.some((c) => c.clipped), maxBottom: Math.max(...cuts.map((c) => c.bottomP)), ch: getComputedStyle(document.querySelector('.hs')).getPropertyValue('--ch') };
  });
  res.push({ w, h, ...m });
  await p.screenshot({ path: `${out}-${w}x${h}.jpg`, type: 'jpeg', quality: 65 });
  await p.close();
}
console.log(JSON.stringify(res, null, 1));
await b.close();
