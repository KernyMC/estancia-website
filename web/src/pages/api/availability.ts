/**
 * Public availability endpoint. Reads the cache only — never triggers a
 * live upstream fetch itself. Client-side widgets (date pickers, "check
 * other dates") hit this instead of duplicating the caching logic.
 */
import type { APIRoute } from 'astro';
import { getShips } from '../../lib/content';
import { getDepartures } from '../../lib/availability';

export const GET: APIRoute = async ({ url }) => {
  const shipSlug = url.searchParams.get('ship');
  const allShips = await getShips();
  const ships = shipSlug ? allShips.filter((s) => s.slug === shipSlug) : allShips;

  const results = await Promise.all(
    ships.map(async (ship) => ({
      slug: ship.slug,
      name: ship.name,
      departures: await getDepartures(ship),
    }))
  );

  return new Response(JSON.stringify({ ships: results }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
