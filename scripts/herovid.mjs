import puppeteer from 'puppeteer-core';
import { mkdtempSync } from 'node:fs';
const out = process.argv[2];
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', userDataDir: mkdtempSync(process.env.TEMP + '/pp-'), args: ['--autoplay-policy=no-user-gesture-required'] });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
for (const [name, w, h] of [['d', 1440, 900], ['m', 390, 844]]) {
  const p = await b.newPage();
  await p.setViewport({ width: w, height: h });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:4327/', { waitUntil: 'networkidle2' });
  await sleep(3500);
  const info = await p.evaluate(() => { const v = document.querySelector('.hero__video'); return v ? { paused: v.paused, t: +v.currentTime.toFixed(2), rs: v.readyState, playing: v.classList.contains('is-playing'), vw: v.videoWidth } : null; });
  await p.screenshot({ path: `${out}-${name}.jpg`, type: 'jpeg', quality: 72 });
  console.log(name, JSON.stringify({ info, errs }));
  await p.close();
}
await b.close();
