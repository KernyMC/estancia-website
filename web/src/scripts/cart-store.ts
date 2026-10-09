/**
 * Browser-only cart + favorites state, persisted to localStorage. No login
 * exists on this site, so both are per-browser/device — never a source of
 * truth for price (that's always /api/cart/quote, server-side).
 *
 * Never import src/server from here — this module ships to the browser.
 *
 * Unlike the only other localStorage precedent in the repo
 * (CookieBanner.astro's consent flag), every read/write here is wrapped in
 * try/catch: Safari private mode throws on localStorage.setItem, and there a
 * thrown exception would only break a banner — here it would break a click
 * on "add to cart".
 */

export const CART_KEY = 'gab-cart-v1';
export const FAV_KEY = 'gab-favorites-v1';
export const STORE_EVENT = 'gab:store-change';
export const MAX_ITEMS = 10;

export interface CartItem {
  type: 'tour' | 'cruise';
  slug: string;
  /** Cruises only. */
  departureStart?: string;
  departureEnd?: string;
  adults: number;
  children: number;
  /** Display only — never trusted as a price. */
  name: string;
  href: string;
  thumbnail?: string;
  priceFrom?: number;
  addedAt: number;
}

export interface FavoriteItem {
  type: 'tour' | 'cruise';
  slug: string;
  name: string;
  href: string;
  thumbnail?: string;
  addedAt: number;
}

export interface StoreChangeDetail {
  cartCount: number;
  favoritesCount: number;
}

/** Same shape used server-side for cartItemKey() in pricing.ts. */
export function itemKey(item: { type: string; slug: string; departureStart?: string }): string {
  return `${item.type}:${item.slug}:${item.departureStart ?? ''}`;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Same output as lib/availability.ts's formatDateRange — kept as its own
 * copy because that module pulls in server-only fetch/cache code that has
 * no business in a browser bundle. */
export function formatDateRange(start: string, end: string): string {
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  const s = new Date(`${start}T12:00:00`);
  const e = new Date(`${end}T12:00:00`);
  const sTxt = s.toLocaleDateString('en-US', opts);
  const eTxt = e.toLocaleDateString('en-US', { ...opts, year: 'numeric' });
  return `${sTxt} – ${eTxt}`;
}

function safeParse<T>(raw: string | null): T[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function isValidCartItem(item: unknown): item is CartItem {
  if (!item || typeof item !== 'object') return false;
  const i = item as Partial<CartItem>;
  return (
    (i.type === 'tour' || i.type === 'cruise') &&
    typeof i.slug === 'string' &&
    i.slug.length > 0 &&
    typeof i.adults === 'number' &&
    Number.isInteger(i.adults) &&
    typeof i.children === 'number' &&
    Number.isInteger(i.children) &&
    typeof i.name === 'string' &&
    typeof i.href === 'string'
  );
}

function isValidFavoriteItem(item: unknown): item is FavoriteItem {
  if (!item || typeof item !== 'object') return false;
  const i = item as Partial<FavoriteItem>;
  return (
    (i.type === 'tour' || i.type === 'cruise') &&
    typeof i.slug === 'string' &&
    i.slug.length > 0 &&
    typeof i.name === 'string' &&
    typeof i.href === 'string'
  );
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Safari private mode, storage quota, etc. — the click still completes
    // in-memory for this page load, it just won't persist across reloads.
  }
}

/** Sanitized read: bad JSON, malformed entries, and expired departures are
 * dropped and the cleaned array is written back so it doesn't linger. */
export function readCart(): CartItem[] {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(CART_KEY);
  } catch {
    return [];
  }
  const today = todayIso();
  const cleaned = safeParse<unknown>(raw)
    .filter(isValidCartItem)
    .filter((item) => !item.departureStart || item.departureStart >= today)
    .slice(0, MAX_ITEMS);

  if (JSON.stringify(cleaned) !== raw) write(CART_KEY, cleaned);
  return cleaned;
}

export function readFavorites(): FavoriteItem[] {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(FAV_KEY);
  } catch {
    return [];
  }
  const cleaned = safeParse<unknown>(raw).filter(isValidFavoriteItem);
  if (JSON.stringify(cleaned) !== raw) write(FAV_KEY, cleaned);
  return cleaned;
}

function emitChange(): void {
  window.dispatchEvent(
    new CustomEvent<StoreChangeDetail>(STORE_EVENT, {
      detail: { cartCount: cartCount(), favoritesCount: favoritesCount() },
    })
  );
}

export function isInCart(key: string): boolean {
  return readCart().some((item) => itemKey(item) === key);
}

export function isFavorite(key: string): boolean {
  return readFavorites().some((item) => itemKey(item) === key);
}

export function cartCount(): number {
  return readCart().length;
}

export function favoritesCount(): number {
  return readFavorites().length;
}

export interface AddToCartResult {
  added: boolean;
  reason?: 'duplicate' | 'full';
}

export function addToCart(item: Omit<CartItem, 'addedAt'>): AddToCartResult {
  const cart = readCart();
  const key = itemKey(item);
  if (cart.some((existing) => itemKey(existing) === key)) {
    return { added: false, reason: 'duplicate' };
  }
  if (cart.length >= MAX_ITEMS) {
    return { added: false, reason: 'full' };
  }
  cart.push({ ...item, addedAt: Date.now() });
  write(CART_KEY, cart);
  emitChange();
  return { added: true };
}

export function removeFromCart(key: string): void {
  const cart = readCart().filter((item) => itemKey(item) !== key);
  write(CART_KEY, cart);
  emitChange();
}

export function setPax(key: string, adults: number, children: number): void {
  const cart = readCart();
  const target = cart.find((item) => itemKey(item) === key);
  if (!target) return;
  target.adults = Math.max(1, Math.round(adults));
  target.children = Math.max(0, Math.round(children));
  write(CART_KEY, cart);
  emitChange();
}

export function clearCart(): void {
  write(CART_KEY, []);
  emitChange();
}

export interface ToggleFavoriteResult {
  saved: boolean;
}

export function toggleFavorite(item: Omit<FavoriteItem, 'addedAt'>): ToggleFavoriteResult {
  const favorites = readFavorites();
  const key = itemKey(item);
  const existingIndex = favorites.findIndex((f) => itemKey(f) === key);

  if (existingIndex >= 0) {
    favorites.splice(existingIndex, 1);
    write(FAV_KEY, favorites);
    emitChange();
    return { saved: false };
  }

  favorites.push({ ...item, addedAt: Date.now() });
  write(FAV_KEY, favorites);
  emitChange();
  return { saved: true };
}

/** Shape the server's cartQuoteRequestSchema expects. */
export function toCheckoutItems(): Array<{
  type: 'tour' | 'cruise';
  slug: string;
  adults: number;
  children: number;
  departureStart?: string;
}> {
  return readCart().map((item) => ({
    type: item.type,
    slug: item.slug,
    adults: item.adults,
    children: item.children,
    ...(item.departureStart ? { departureStart: item.departureStart } : {}),
  }));
}

// Cross-tab sync: another tab changing the cart should update this tab's
// badge too. The native `storage` event only fires in OTHER tabs, so
// re-dispatch our own event locally to reuse the same listener everywhere.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === CART_KEY || e.key === FAV_KEY) emitChange();
  });
}
