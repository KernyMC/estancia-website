// Captura un elemento: node scripts/elshot.mjs <ruta> <selector> <salida.jpg> [ancho] [alto]
import puppeteer from 'puppeteer-core';
import { mkdtempSync } from 'node:fs';
const [, , route, sel, out, w = '1440', h = '900'] = process.argv;
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', userDataDir: mkdtempSync(process.env.TEMP + '/pp-') });
const p = await b.newPage();
await p.setViewport({ width: +w, height: +h });
await p.evaluateOnNewDocument(() => sessionStorage.setItem('introSeen', '1'));
await p.goto('http://localhost:4327' + route, { waitUntil: 'networkidle2' });
await p.evaluate((s) => document.querySelector(s).scrollIntoView({ block: 'center', behavior: 'instant' }), sel);
await new Promise((r) => setTimeout(r, 2800));
const el = await p.$(sel);
await el.screenshot({ path: out, type: 'jpeg', quality: 75 });
await b.close();
await new Promise((r) => setTimeout(r, 2500));
