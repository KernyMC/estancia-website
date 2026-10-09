import puppeteer from 'puppeteer-core';
import { mkdtempSync } from 'node:fs';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', userDataDir: mkdtempSync(process.env.TEMP + '/pp-') });
for (const [w, h, m] of [[1440, 900, false], [390, 844, true]]) {
  const p = await b.newPage();
  await p.setViewport({ width: w, height: h, isMobile: m, hasTouch: m });
  await p.evaluateOnNewDocument(() => sessionStorage.setItem('introSeen', '1'));
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:4327/', { waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 1500));
  await p.screenshot({ path: process.env.TEMP + `/est/s/chat-${w}-0.jpg`, type: 'jpeg', quality: 70 });
  await p.click('.chat__fab');
  await p.type('.chat__form input', 'What are your hours?');
  await p.keyboard.press('Enter');
  await new Promise((r) => setTimeout(r, 2500));
  await p.screenshot({ path: process.env.TEMP + `/est/s/chat-${w}-1.jpg`, type: 'jpeg', quality: 70 });
  console.log(w, await p.evaluate(() => [...document.querySelectorAll('.chat__msg')].map((e) => e.textContent.slice(0, 70))), errs);
  await p.close();
}
await b.close();
await new Promise((r) => setTimeout(r, 2500));
