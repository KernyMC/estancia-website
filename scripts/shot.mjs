// Captura de revisión visual: node scripts/shot.mjs <ruta> <salida-prefijo> [ancho] [alto]
import puppeteer from 'puppeteer-core';
const [, , route = '/', out = 'shot', w = '1440', h = '900', max = '40'] = process.argv;
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', userDataDir: (await import('node:fs')).mkdtempSync(process.env.TEMP + '/pp-'), args: ['--hide-scrollbars'] });
const page = await browser.newPage();
await page.setViewport({ width: +w, height: +h });
await page.evaluateOnNewDocument(() => sessionStorage.setItem('introSeen', '1'));
const errors = [];
page.on('console', (m) => ['error', 'warning'].includes(m.type()) && errors.push(m.type() + ': ' + m.text()));
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
await page.goto('http://localhost:4327' + route, { waitUntil: 'networkidle2', timeout: 60000 });
await new Promise((r) => setTimeout(r, 2500));
await page.screenshot({ path: `${out}-0.jpg`, type: 'jpeg', quality: 70 });
const total = await page.evaluate(() => document.documentElement.scrollHeight);
let i = 1;
for (let y = +h * 0.9; y < total; y += +h * 0.9) {
  await page.evaluate((yy) => scrollTo(0, yy), y);
  await new Promise((r) => setTimeout(r, 1700));
  await page.screenshot({ path: `${out}-${i++}.jpg`, type: 'jpeg', quality: 62 });
  if (i >= +max) break;
}
console.log(JSON.stringify({ total, shots: i, errors: errors.slice(0, 10) }));
await browser.close();
await new Promise((r) => setTimeout(r, 2500));
