import puppeteer from 'puppeteer-core';
import { mkdtempSync } from 'node:fs';
const out = process.argv[2];
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', userDataDir: mkdtempSync(process.env.TEMP + '/pp-') });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const res = [];
for (const [w, h] of [[1440, 900], [1280, 720], [1920, 1080], [390, 844]]) {
  const p = await b.newPage();
  await p.setViewport({ width: w, height: h });
  await p.evaluateOnNewDocument(() => sessionStorage.setItem('introSeen', '1'));
  await p.goto('http://localhost:4327/', { waitUntil: 'networkidle2' });
  await p.evaluate(() => { const y = document.querySelector('.flipsec').getBoundingClientRect().top + scrollY; scrollTo({ top: y, behavior: 'instant' }); });
  await sleep(1800);
  res.push({ w, h, ...(await p.evaluate(() => { const s = document.querySelector('.flipsec').getBoundingClientRect(); const tops = [...document.querySelectorAll('.flow li')].map((l) => Math.round(l.getBoundingClientRect().top)); return { sectionH: Math.round(s.height), vh: innerHeight, fits: s.height <= innerHeight, chipsOneRow: new Set(tops).size === 1 }; })) });
  await p.screenshot({ path: `${out}-${w}.jpg`, type: 'jpeg', quality: 65 });
  await p.close();
}
console.log(JSON.stringify(res));
await b.close();
