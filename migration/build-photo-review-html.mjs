import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const items = JSON.parse(fs.readFileSync(path.join(root, 'data', 'photo-review-sample.json'), 'utf8'));

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const cards = items
  .map(
    (it) => `
    <div class="card ${it.flagged ? 'flagged' : ''}">
      <img src="${esc(it.url)}" alt="" loading="lazy" />
      <div class="body">
        ${it.flagged ? '<span class="badge">⚠ Revisar — sin contexto claro</span>' : ''}
        <p class="entity">${esc(it.entityName)} <span class="section">· ${esc(it.section)}</span></p>
        <p class="row"><span class="label">Original</span> <code>${esc(it.originalFilename)}</code></p>
        <p class="row"><span class="label">Propuesto</span> <code class="new">${esc(it.filename)}</code></p>
        <p class="alt">"${esc(it.alt)}"</p>
      </div>
    </div>`
  )
  .join('\n');

const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>Revisión de fotos — muestra</title>
<style>
  :root { color-scheme: light dark; }
  body { font-family: system-ui, -apple-system, sans-serif; max-width: 1100px; margin: 0 auto; padding: 2rem 1.5rem 4rem; background: #fafaf8; color: #10192e; }
  @media (prefers-color-scheme: dark) { body { background: #10192e; color: #f0f0f0; } }
  h1 { font-size: 1.5rem; margin-bottom: 0.25rem; }
  .sub { color: #666; margin-bottom: 2rem; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 1.25rem; }
  .card { border: 1px solid #ddd; border-radius: 10px; overflow: hidden; background: white; }
  @media (prefers-color-scheme: dark) { .card { background: #1a2338; border-color: #333; } }
  .card.flagged { border-color: #d97706; border-width: 2px; }
  .card img { width: 100%; aspect-ratio: 4/3; object-fit: cover; display: block; background: #eee; }
  .body { padding: 0.85rem 1rem 1.1rem; }
  .badge { display: inline-block; font-size: 0.7rem; font-weight: 700; color: #d97706; background: #fef3c7; padding: 0.2rem 0.5rem; border-radius: 6px; margin-bottom: 0.5rem; }
  .entity { font-weight: 700; font-size: 0.85rem; margin: 0 0 0.5rem; }
  .section { font-weight: 400; color: #888; }
  .row { font-size: 0.78rem; margin: 0.2rem 0; display: flex; gap: 0.4rem; }
  .label { color: #888; min-width: 62px; flex-shrink: 0; }
  code { font-size: 0.75rem; word-break: break-all; }
  code.new { color: #3b64e0; font-weight: 600; }
  .alt { font-size: 0.8rem; font-style: italic; color: #555; margin-top: 0.6rem; }
  @media (prefers-color-scheme: dark) { .alt, .label { color: #aaa; } }
</style>
</head>
<body>
  <h1>Revisión de fotos — muestra (${items.length})</h1>
  <p class="sub">${items.filter((i) => i.flagged).length} marcadas con ⚠ por no tener contexto claro en el nombre original. Generado con qwen3-coder:30b local, sin visión.</p>
  <div class="grid">
    ${cards}
  </div>
</body>
</html>`;

fs.writeFileSync(path.join(root, 'photo-review-sample.html'), html);
console.log('Wrote migration/photo-review-sample.html');
