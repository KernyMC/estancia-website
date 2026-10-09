import posts from '../../data/posts.json';

// Índice ligero para el buscador (sin el HTML de los artículos).
export const GET = () =>
  new Response(JSON.stringify(posts.map(({ slug, title, date, excerpt, image, topics }) => ({ slug, title, date, excerpt, image, topics }))), {
    headers: { 'Content-Type': 'application/json' },
  });
