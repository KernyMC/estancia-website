/**
 * Data-access layer for content. Everything reads from Sanity now (ships,
 * tours/cruise itineraries, stays, reviews — schemaTypes/ship.ts, trip.ts,
 * stay.ts, review.ts). Pages and components keep the same function
 * contracts regardless of what's behind them.
 *
 * Live availability/pricing is a separate concern — see lib/availability.ts.
 */
import { sanity } from './sanity';
import { cache } from './cache';
import type { SanityImageSource } from '@sanity/image-url';
import type { SeasonalPrice } from './seasonal-pricing';

/**
 * Content is treated as static: cached until a Sanity webhook clears it
 * (see server/sanity-webhook.ts + api/sanity-revalidate.ts), not on a
 * refresh timer. The TTL below is only a safety net for a missed/failed
 * webhook delivery — Sanity's own docs recommend not relying on webhooks
 * alone — not the normal refresh path.
 */
const CONTENT_CACHE_TTL_SECONDS = 60 * 60 * 24;

async function cachedFetch<T>(key: string, query: () => Promise<T>): Promise<T> {
  const hit = await cache.get(key);
  if (hit !== null) return JSON.parse(hit) as T;

  const value = await query();
  await cache.set(key, JSON.stringify(value), CONTENT_CACHE_TTL_SECONDS);
  return value;
}

export interface ShipFaq {
  question: string;
  answer: string;
}

export interface GalleryTab {
  label: string;
  images: string[];
}

export interface ItineraryDay {
  day_label: string;
  am: string;
  pm: string;
}

export interface ItineraryRoute {
  route_name: string;
  duration: string;
  days: ItineraryDay[];
}

export interface Activity {
  name: string;
  main_image: string | null;
}

/**
 * A taxonomy reference resolved in-query (`ref->{name, "slug": slug.current}`)
 * — used for both `ship.category` (schemaTypes/cruiseClass.ts) and
 * `trip.category` (schemaTypes/tourCategory.ts). Editable from Sanity
 * Studio: adding a new class/category there needs no code change.
 */
export interface Category {
  name: string;
  slug: string;
}

export interface Ship {
  slug: string;
  name: string;
  apiShipId: number | null;
  apiName: string | null;
  /** False for cruises with no live-availability API feed (see schemaTypes/ship.ts). Defaults true for existing ships. */
  hasLiveAvailability: boolean;
  /** Manually-entered "from $X / person" shown only when hasLiveAvailability is false. */
  indicativePrice: number | null;
  boatType: string | null;
  category: Category | null;
  description: string;
  highlights: string[];
  include: string[];
  exclude: string[];
  faq: ShipFaq[];
  activities: Activity[];
  itineraryRoutes: ItineraryRoute[];
  galleryTabs: GalleryTab[];
  heroImage: string;
  thumbnail: string;
  seo: { title: string | null; description: string | null };
}

/**
 * Paid variant of a tour's marine activity (e.g. snorkeling included vs a
 * scuba-diving upgrade) — lets one tour offer alternatives at different
 * prices instead of duplicating the whole tour as a second document.
 * `priceDelta` is USD per person, added on top of the tour's base price.
 */
export interface TourAddOn {
  slug: string;
  name: string;
  description?: string;
  /** Name of the standard activity this add-on swaps out (e.g. "Snorkeling"). */
  replaces?: string;
  priceDelta: number;
}

export interface Tour {
  slug: string;
  name: string;
  category: Category | null;
  durationDays: number;
  /** Base price — applies on any date outside every seasonal price. */
  price: number | null;
  childPrice: number | null;
  /** Date-range prices (see lib/seasonal-pricing.ts). Absent on tours cached before the field existed. */
  seasonalPrices?: SeasonalPrice[];
  description: string;
  highlights: string[];
  include: string[];
  exclude: string[];
  thumbnail: string;
  gallery: string[];
  addOns?: TourAddOn[];
  faq: ShipFaq[];
  seo: { title: string | null; description: string | null };
}

const ACTIVITY_FIELDS = `name, "main_image": image.asset->url`;

const ITINERARY_ROUTE_FIELDS = `
  "route_name": title,
  "duration": durationDays + " day" + select(durationDays == 1 => "", "s"),
  "days": coalesce(itineraryDays[]{"day_label": dayLabel, am, pm}, [])
`;

const SHIP_BASE_FIELDS = `
  "slug": slug.current,
  name,
  apiShipId,
  apiName,
  "hasLiveAvailability": coalesce(hasLiveAvailability, true),
  indicativePrice,
  boatType,
  "category": category->{name, "slug": slug.current},
  description,
  "highlights": coalesce(highlights, []),
  "include": coalesce(include, []),
  "exclude": coalesce(exclude, []),
  "faq": coalesce(faq[]{question, answer}, []),
  "activities": coalesce(activities[]{${ACTIVITY_FIELDS}}, []),
  "galleryTabs": coalesce(gallery[]{label, "images": coalesce(images[].asset->url, [])}, []),
  "heroImage": banner.asset->url,
  "thumbnail": banner.asset->url,
  "seo": {"title": seo.title, "description": seo.description}
`;

/**
 * Listing contexts (hub, homepage, related-ships) never render
 * `itineraryRoutes` — only the single ship page does, via ItineraryTabs.
 * That field is a per-ship cross-document subquery (scans the whole `trip`
 * collection once for every ship in the list) — the one genuinely expensive
 * part of this projection, so listings skip it entirely instead of paying
 * for N subqueries nobody reads. See docs/log.md 2026-08-02 for the
 * before/after.
 */
const SHIP_LIST_FIELDS = `${SHIP_BASE_FIELDS}, "itineraryRoutes": []`;

const SHIP_DETAIL_FIELDS = `${SHIP_BASE_FIELDS}, "itineraryRoutes": *[_type == "trip" && kind == "cruise-itinerary" && ship._ref == ^._id] | order(apiItineraryCode asc) {${ITINERARY_ROUTE_FIELDS}}`;

/** Every ship, banner image first — used for the cruises hub and homepage. */
export async function getShips(): Promise<Ship[]> {
  return cachedFetch('sanity:ships', () =>
    sanity.fetch(`*[_type == "ship" && defined(slug.current)]{${SHIP_LIST_FIELDS}} | order(name asc)`)
  );
}

export async function getShip(slug: string): Promise<Ship | undefined> {
  return cachedFetch(`sanity:ship:${slug}`, () =>
    sanity.fetch(`*[_type == "ship" && slug.current == $slug][0]{${SHIP_DETAIL_FIELDS}}`, { slug })
  );
}

/** Ship slugs manually marked `featured` in Sanity — homepage carousel curation. */
export async function getFeaturedShipSlugs(): Promise<string[]> {
  return cachedFetch('sanity:ships:featured-slugs', () =>
    sanity.fetch(`*[_type == "ship" && featured == true].slug.current`)
  );
}

/**
 * Cruise classes (Luxury, First Class, Tourist Superior...), authored in
 * Sanity Studio (schemaTypes/cruiseClass.ts) — drives the `?class=` filter
 * on /cruises/ and Header/Footer nav. Editable from Studio, no code change
 * needed to add a new class.
 */
export async function getCruiseClasses(): Promise<Category[]> {
  return cachedFetch('sanity:cruise-classes', () =>
    sanity.fetch(`*[_type == "cruiseClass"] | order(order asc){name, "slug": slug.current}`),
  );
}

/**
 * Experience-based filters (audit #8): traveller-facing tags derived from each
 * ship's real `activities` — never invented. `match` are lowercase substrings
 * tested against activity names present in Sanity.
 */
export const SHIP_EXPERIENCES = [
  { slug: 'snorkeling', label: 'Snorkeling', match: ['snorkel'] },
  { slug: 'diving', label: 'Scuba Diving', match: ['dive', 'diving', 'scuba'] },
  { slug: 'kayaking', label: 'Kayaking', match: ['kayak', 'paddle'] },
  { slug: 'hiking', label: 'Hiking', match: ['hiking', 'highlands'] },
  { slug: 'wildlife', label: 'Wildlife', match: ['wildlife'] },
] as const;

export type ShipExperience = (typeof SHIP_EXPERIENCES)[number]['slug'];

/** Experience slugs a ship supports, derived from its onboard activities. */
export function shipExperiences(ship: Ship): ShipExperience[] {
  const names = ship.activities.map((a) => a.name.toLowerCase());
  return SHIP_EXPERIENCES.filter((exp) =>
    names.some((n) => exp.match.some((m) => n.includes(m))),
  ).map((exp) => exp.slug);
}

const TOUR_BASE_FIELDS = `
  "slug": slug.current,
  "name": title,
  "category": category->{name, "slug": slug.current},
  durationDays,
  price,
  childPrice,
  "seasonalPrices": coalesce(seasonalPrices[]{label, startDate, endDate, price, childPrice}, []),
  description,
  "highlights": coalesce(highlights, []),
  "include": coalesce(include, []),
  "exclude": coalesce(exclude, []),
  "thumbnail": banner.asset->url,
  "seo": {"title": seo.title, "description": seo.description}
`;

/**
 * Grids/related-tour lists only ever show thumbnail + name + price + duration
 * — gallery images, add-ons, and FAQ are detail-page-only (tours/[slug].astro).
 * Skipping them in the list query cuts the response from "up to 10 gallery
 * images × ~20 tours" down to just what a card renders.
 */
const TOUR_LIST_FIELDS = `${TOUR_BASE_FIELDS}, "gallery": [], "addOns": [], "faq": []`;

const TOUR_DETAIL_FIELDS = `${TOUR_BASE_FIELDS},
  "gallery": coalesce(gallery[].images[].asset->url, []),
  "addOns": coalesce(addOns[]{name, "slug": slug.current, description, replaces, priceDelta}, []),
  "faq": coalesce(faq[]{question, answer}, [])
`;

/** Every day tour / multi-day package (excludes cruise itineraries). */
export async function getTours(categorySlug?: string): Promise<Tour[]> {
  const tours = await cachedFetch<Tour[]>('sanity:tours', () =>
    sanity.fetch(
      `*[_type == "trip" && kind != "cruise-itinerary" && defined(slug.current)]{${TOUR_LIST_FIELDS}} | order(title asc)`,
    ),
  );
  return categorySlug ? tours.filter((t) => t.category?.slug === categorySlug) : tours;
}

export async function getTour(slug: string): Promise<Tour | undefined> {
  return cachedFetch(`sanity:tour:${slug}`, () =>
    sanity.fetch(
      `*[_type == "trip" && kind != "cruise-itinerary" && slug.current == $slug][0]{${TOUR_DETAIL_FIELDS}}`,
      { slug },
    ),
  );
}

/**
 * Traveller-facing tour categories (Day Tours, Multi-Day, Diving...),
 * authored in Sanity Studio (schemaTypes/tourCategory.ts) — drives
 * /tours/[category]/, the filter bar on /tours/, and Header/Footer nav.
 * `heading`/`description`/`seo` are the hub page's own copy, so a new
 * category gets a working page without touching code.
 */
export interface TourCategoryPage extends Category {
  heading: string;
  description: string;
  seo: { title: string | null; description: string | null };
}

export async function getTourCategories(): Promise<TourCategoryPage[]> {
  return cachedFetch('sanity:tour-categories', () =>
    sanity.fetch(
      `*[_type == "tourCategory"] | order(order asc){name, "slug": slug.current, heading, description, "seo": {"title": seo.title, "description": seo.description}}`,
    ),
  );
}

export interface StayRoom {
  name: string;
  description: string | null;
  capacity: number | null;
  beds: string | null;
  amenities: string[];
  gallery: string[];
}

/**
 * A place to stay, authored in Sanity Studio (schemaTypes/stay.ts).
 * `thumbnail`/`heroImage` are the same banner image, exposed twice so
 * card and hero contexts don't need to know they're the same field.
 */
/** One bedroom inside a floor/unit (see StayFloor) — e.g. "Bedroom 1", "1 queen bed". */
export interface StayBedroom {
  name: string;
  beds: string | null;
  photo: string | null;
}

/** A labeled bathroom photo card inside a floor/unit (see StayFloor). */
export interface StayBathroomPhoto {
  label: string;
  image: string | null;
}

/** An extra space not every floor/unit has (e.g. a kitchenette, a terrace) — just a photo and a caption. */
export interface StayOtherRoom {
  photo: string | null;
  description: string | null;
}

/**
 * A self-contained unit occupying one floor of a multi-unit building — e.g.
 * the 5 independent condos of Condo Galápagos, each on its own floor and
 * sharing the building-level amenities (pool, jacuzzi, sauna, terrace).
 */
export interface StayFloor {
  name: string;
  tagline: string | null;
  description: string | null;
  capacity: number | null;
  bathrooms: number | null;
  bedrooms: StayBedroom[];
  amenities: string[];
  airbnbUrl: string | null;
  mainPhoto: string | null;
  bathroomPhotos: StayBathroomPhoto[];
  otherRooms: StayOtherRoom[];
  gallery: string[];
}

export interface Stay {
  slug: string;
  name: string;
  location: string | null;
  airbnbUrl: string | null;
  description: string | null;
  highlights: string[];
  amenities: string[];
  thumbnail: string | null;
  heroImage: string | null;
  gallery: GalleryTab[];
  rooms: StayRoom[];
  floors: StayFloor[];
  faq: ShipFaq[];
}

const STAY_FIELDS = `
  "slug": slug.current,
  name,
  location,
  airbnbUrl,
  description,
  "highlights": coalesce(highlights, []),
  "amenities": coalesce(amenities, []),
  "thumbnail": banner.asset->url,
  "heroImage": banner.asset->url,
  "gallery": coalesce(gallery[]{
    label,
    "images": coalesce(images[].asset->url, [])
  }, []),
  "rooms": coalesce(rooms[]{
    name,
    description,
    capacity,
    beds,
    "amenities": coalesce(amenities, []),
    "gallery": coalesce(gallery[].asset->url, [])
  }, []),
  "floors": coalesce(floors[]{
    name,
    tagline,
    description,
    capacity,
    bathrooms,
    "bedrooms": coalesce(bedrooms[]{name, beds, "photo": photo.asset->url}, []),
    "amenities": coalesce(amenities, []),
    airbnbUrl,
    "mainPhoto": mainPhoto.asset->url,
    "bathroomPhotos": coalesce(bathroomPhotos[]{label, "image": image.asset->url}, []),
    "otherRooms": coalesce(otherRooms[]{description, "photo": photo.asset->url}, []),
    "gallery": coalesce(gallery[].asset->url, [])
  }, []),
  "faq": coalesce(faq[]{question, answer}, [])
`;

/** Every stay, banner image first — used for the hub grid and home teaser. */
export async function getStays(): Promise<Stay[]> {
  return cachedFetch('sanity:stays', () =>
    sanity.fetch(`*[_type == "stay" && defined(slug.current)]{${STAY_FIELDS}} | order(name asc)`)
  );
}

export async function getStay(slug: string): Promise<Stay | undefined> {
  return cachedFetch(`sanity:stay:${slug}`, () =>
    sanity.fetch(`*[_type == "stay" && slug.current == $slug][0]{${STAY_FIELDS}}`, { slug })
  );
}

/**
 * Guest review, authored in Sanity Studio (schemaTypes/review.ts).
 * `source` is a slug ('airbnb', 'tripadvisor', …) mapped to a logo in
 * lib/reviewSources.ts. `guestPhoto` is a Sanity image ref or null — when
 * null the UI renders an initial-letter avatar.
 */
export interface Review {
  _id: string;
  source: string;
  reviewType: 'agency' | 'stay';
  author: string;
  guestPhoto: SanityImageSource | null;
  date: string;
  rating: number;
  text: string;
  link: string | null;
  stayName: string | null;
}

const REVIEW_FIELDS = `
  _id, source, reviewType, author, date, rating, text, link, guestPhoto,
  "stayName": stay->name
`;

/** Every published review — agency-level and stay-level. */
export async function getReviews(): Promise<Review[]> {
  return cachedFetch('sanity:reviews', () =>
    sanity.fetch(`*[_type == "review"]{${REVIEW_FIELDS}} | order(date desc)`)
  );
}

/** Reviews about the agency overall (e.g. TripAdvisor), not tied to a stay. */
export async function getAgencyReviews(): Promise<Review[]> {
  return cachedFetch('sanity:reviews:agency', () =>
    sanity.fetch(`*[_type == "review" && reviewType == "agency"]{${REVIEW_FIELDS}} | order(date desc)`)
  );
}

/** Reviews about a specific stay, by its slug. */
export async function getStayReviews(staySlug: string): Promise<Review[]> {
  return cachedFetch(`sanity:reviews:stay:${staySlug}`, () =>
    sanity.fetch(
      `*[_type == "review" && reviewType == "stay" && stay->slug.current == $slug]{${REVIEW_FIELDS}} | order(date desc)`,
      { slug: staySlug },
    ),
  );
}

/**
 * WhatsApp number + default message, authored once in Sanity Studio
 * (schemaTypes/socialLinks.ts) as a singleton. `whatsappNumber` is digits
 * only (country code included, no `+`) — ready to drop into a wa.me URL.
 */
export interface SocialLinks {
  whatsappNumber: string | null;
  whatsappDefaultMessage: string | null;
  email: string | null;
  personalEmail: string | null;
  instagramUrl: string | null;
  facebookUrl: string | null;
  tripadvisorUrl: string | null;
  airbnbUrl: string | null;
  bookingUrl: string | null;
}

export async function getSocialLinks(): Promise<SocialLinks | undefined> {
  return cachedFetch('sanity:social-links', () =>
    sanity.fetch(
      `*[_type == "socialLinks"][0]{whatsappNumber, whatsappDefaultMessage, email, personalEmail, instagramUrl, facebookUrl, tripadvisorUrl, airbnbUrl, bookingUrl}`,
    ),
  );
}

/** Build a wa.me link, e.g. for an "Ask about availability" CTA. */
export function whatsappUrl(number: string, message: string): string {
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

/**
 * Privacy / Terms / Cookies copy, authored in Sanity Studio
 * (schemaTypes/legalPage.ts) — one document per `page` value.
 */
export interface LegalPage {
  title: string;
  description: string;
  heading: string;
  lastUpdated: string;
  body: any[];
}

export async function getLegalPage(page: 'privacy' | 'terms' | 'cookies'): Promise<LegalPage | undefined> {
  return cachedFetch(`sanity:legal-page:${page}`, () =>
    sanity.fetch(
      `*[_type == "legalPage" && page == $page][0]{title, description, heading, lastUpdated, body}`,
      { page },
    ),
  );
}
