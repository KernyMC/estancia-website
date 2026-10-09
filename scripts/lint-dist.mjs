// Revisión estática del build: title/description/canonical/h1/alt/ids duplicados. Uso: node scripts/lint-dist.mjs
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative, dirname, sep } from 'node:path';

const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]));
const files = walk('dist').filter((f) => f.endsWith('index.html') || f.endsWith('404.html'));
const issues = [];
const titles = new Map();
const descs = new Map();
let redirects = 0;
const push = (m, k, v) => (m.get(k) ?? m.set(k, []).get(k)).push(v);

for (const f of files) {
  const h = readFileSync(f, 'utf8');
  const p = '/' + relative('dist', dirname(f)).split(sep).join('/') + '/';
  if (/http-equiv="refresh"/.test(h)) { redirects++; continue; }
  const t = (h.match(/<title>([^<]*)/) || [])[1];
  const d = (h.match(/<meta name="description" content="([^"]*)"/) || [])[1];
  const c = h.match(/rel="canonical" href="([^"]*)"/);
  const h1 = (h.match(/<h1/g) || []).length;
  if (!t) issues.push(`${p} sin title`); else { if (t.length > 70) issues.push(`${p} title largo (${t.length})`); push(titles, t, p); }
  if (!d) issues.push(`${p} sin description`); else { if (d.length > 170) issues.push(`${p} description larga (${d.length})`); push(descs, d, p); }
  if (!c) issues.push(`${p} sin canonical`);
  if (h1 !== 1) issues.push(`${p} h1=${h1}`);
  const noalt = [...h.matchAll(/<img(?![^>]*\balt=)[^>]*>/g)].length;
  if (noalt) issues.push(`${p} img sin alt: ${noalt}`);
  const ids = [...h.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]);
  const dup = [...new Set(ids.filter((x, i) => ids.indexOf(x) !== i))];
  if (dup.length) issues.push(`${p} ids duplicados: ${dup.slice(0, 4).join(', ')}`);
  const unlabeled = [...h.matchAll(/<(input|select|textarea)\b(?![^>]*type="(hidden|submit)")(?![^>]*aria-hidden)(?![^>]*type="(checkbox|radio)")[^>]*>/g)].filter((m) => { const id = (m[0].match(/\bid="([^"]+)"/) || [])[1]; return !id || !new RegExp(`for="${id}"`).test(h); }).length;
  if (unlabeled) issues.push(`${p} campos sin label asociado: ${unlabeled}`);
}
for (const [k, v] of titles) if (v.length > 1) issues.push(`title duplicado "${k}" en ${v.slice(0, 4).join(' ')}`);
for (const [k, v] of descs) if (v.length > 1) issues.push(`description duplicada (${v.length}) en ${v.slice(0, 3).join(' ')}`);
console.log(`páginas ${files.length}, redirects ${redirects}`);
console.log(issues.slice(0, 60).join('\n'));
console.log('total hallazgos:', issues.length);
