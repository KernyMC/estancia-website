/**
 * Builds the FULL visual review report (all 390 photos), pointing at the
 * already-compressed local files so Kevin judges real final quality/size,
 * not the original hotlinked WP images.
 *
 * Written to migration/photos/review.html so relative image paths resolve
 * correctly when opened directly (double-click) from that folder.
 *
 * Usage: node migration/build-photo-review-full.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'data', 'photo-manifest.json'), 'utf8'));

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Group by entity so Kevin can review ship-by-ship / tour-by-tour.
const groups = new Map();
for (const item of manifest) {
  const groupKey = `${item.entityType}|${item.entitySlug}`;
  if (!groups.has(groupKey)) groups.set(groupKey, { entityType: item.entityType, entitySlug: item.entitySlug, entityName: item.entityName.split(' — ')[0], items: [] });
  groups.get(groupKey).items.push(item);
}

const sections = [...groups.values()]
  .sort((a, b) => (a.entityType === b.entityType ? a.entityName.localeCompare(b.entityName) : a.entityType.localeCompare(b.entityType)))
  .map((group) => {
    const cards = group.items
      .map((it) => {
        if (it.error) {
          return `<div class="card error"><div class="body"><span class="badge badge-error">✕ Error</span><p class="entity">${esc(it.section)}</p><p class="alt">${esc(it.error)}</p></div></div>`;
        }
        return `
        <div class="card ${it.flagged ? 'flagged' : ''}">
          <a href="${esc(it.relativePath)}" target="_blank"><img src="${esc(it.relativePath)}" alt="" loading="lazy" /></a>
          <div class="body">
            ${it.flagged ? '<span class="badge">⚠ Revisar</span>' : ''}
            <p class="entity">${esc(it.section)} <span class="kb">${it.finalKb}KB</span></p>
            <p class="row"><code>${esc(it.filename)}</code></p>
            <p class="alt">"${esc(it.alt)}"</p>
          </div>
        </div>`;
      })
      .join('\n');

    return `
    <section class="entity-group" data-type="${esc(group.entityType)}">
      <h2>${esc(group.entityName)} <span class="count">${group.items.length} fotos</span></h2>
      <div class="grid">${cards}</div>
    </section>`;
  })
  .join('\n');

const flaggedCount = manifest.filter((m) => m.flagged).length;
const errorCount = manifest.filter((m) => m.error).length;

const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>Revisión completa de fotos (${manifest.length})</title>
<style>
  :root { color-scheme: light dark; }
  body { font-family: system-ui, -apple-system, sans-serif; max-width: 1300px; margin: 0 auto; padding: 2rem 1.5rem 4rem; background: #fafaf8; color: #10192e; }
  @media (prefers-color-scheme: dark) { body { background: #10192e; color: #f0f0f0; } }
  h1 { font-size: 1.5rem; margin-bottom: 0.25rem; }
  .sub { color: #666; margin-bottom: 1rem; }
  .filters { position: sticky; top: 0; background: inherit; padding: 0.75rem 0; z-index: 10; display: flex; gap: 0.5rem; border-bottom: 1px solid #ddd; margin-bottom: 1.5rem; }
  .filters button { font: inherit; padding: 0.4rem 0.9rem; border-radius: 999px; border: 1px solid #ccc; background: white; cursor: pointer; }
  @media (prefers-color-scheme: dark) { .filters button { background: #1a2338; color: #eee; border-color: #444; } }
  .filters button.active { background: #3b64e0; color: white; border-color: #3b64e0; }
  h2 { font-size: 1.1rem; margin: 2.5rem 0 1rem; }
  .count { font-weight: 400; color: #888; font-size: 0.85rem; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 1rem; }
  .card { border: 1px solid #ddd; border-radius: 10px; overflow: hidden; background: white; }
  @media (prefers-color-scheme: dark) { .card { background: #1a2338; border-color: #333; } }
  .card.flagged { border-color: #d97706; border-width: 2px; }
  .card.error { border-color: #dc2626; border-width: 2px; }
  .card img { width: 100%; aspect-ratio: 4/3; object-fit: cover; display: block; background: #eee; }
  .body { padding: 0.7rem 0.85rem 0.9rem; }
  .badge { display: inline-block; font-size: 0.68rem; font-weight: 700; color: #d97706; background: #fef3c7; padding: 0.15rem 0.45rem; border-radius: 6px; margin-bottom: 0.4rem; }
  .badge-error { color: #dc2626; background: #fee2e2; }
  .entity { font-weight: 700; font-size: 0.78rem; margin: 0 0 0.4rem; display: flex; justify-content: space-between; gap: 0.4rem; }
  .kb { font-weight: 400; color: #888; }
  code { font-size: 0.68rem; word-break: break-all; color: #3b64e0; }
  .alt { font-size: 0.74rem; font-style: italic; color: #555; margin-top: 0.4rem; }
  @media (prefers-color-scheme: dark) { .alt { color: #aaa; } }
</style>
</head>
<body>
  <h1>Revisión completa de fotos (${manifest.length})</h1>
  <p class="sub">${flaggedCount} marcadas ⚠ (sin contexto claro en el nombre original)${errorCount ? `, ${errorCount} con error` : ''}. Fotos ya comprimidas — clic para ver a tamaño completo.</p>
  <div class="filters">
    <button class="active" data-filter="all">Todas</button>
    <button data-filter="ships">Barcos</button>
    <button data-filter="tours">Tours</button>
    <button data-filter="flagged">Solo marcadas ⚠</button>
  </div>
  ${sections}
  <script>
    const buttons = document.querySelectorAll('.filters button');
    const groups = document.querySelectorAll('.entity-group');
    buttons.forEach(btn => btn.addEventListener('click', () => {
      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const filter = btn.dataset.filter;
      groups.forEach(g => {
        if (filter === 'all') { g.style.display = ''; g.querySelectorAll('.card').forEach(c => c.style.display = ''); return; }
        if (filter === 'flagged') {
          let any = false;
          g.querySelectorAll('.card').forEach(c => { const show = c.classList.contains('flagged'); c.style.display = show ? '' : 'none'; if (show) any = true; });
          g.style.display = any ? '' : 'none';
          return;
        }
        g.style.display = g.dataset.type === filter ? '' : 'none';
        g.querySelectorAll('.card').forEach(c => c.style.display = '');
      });
    }));
  </script>
</body>
</html>`;

fs.writeFileSync(path.join(root, 'photos', 'review.html'), html);
console.log(`Wrote migration/photos/review.html (${manifest.length} photos, ${flaggedCount} flagged)`);
