/**
 * Registry mapping a review's `source` value (stored in Sanity) to its display
 * label and logo. Add a new entry here when you add a source option in the
 * Studio schema (schemaTypes/review.ts).
 *
 * Logos live in `public/logos/` — drop the files there and point `logo` at the
 * exact filename. `w`/`h` are the rendered pixel size (logos are drawn at a
 * fixed height; set them to the file's aspect ratio to avoid layout shift).
 * If a logo file is missing set `logo: null` and the component falls back to
 * the text label, so the card never breaks.
 */
export interface ReviewSource {
  label: string;
  /** Path under /public, or null to show the text label instead. */
  logo: string | null;
  /** Rendered width/height in px (keep the source file's aspect ratio). */
  w: number;
  h: number;
}

const LOGO_H = 20;

export const REVIEW_SOURCES: Record<string, ReviewSource> = {
  // Square badge (320×320) → drawn 20×20.
  airbnb: { label: 'Airbnb', logo: '/logos/air-bnb-logo.svg', w: LOGO_H, h: LOGO_H },
  // Portrait owl (206×245) → drawn ~17×20.
  tripadvisor: { label: 'TripAdvisor', logo: '/logos/trip-advisor-logo.svg', w: 17, h: LOGO_H },
  // Square badge (400×400) → drawn 20×20.
  booking: { label: 'Booking.com', logo: '/logos/Icon.jpeg', w: LOGO_H, h: LOGO_H },
};

export function getReviewSource(source: string): ReviewSource {
  return REVIEW_SOURCES[source] ?? { label: source, logo: null, w: LOGO_H, h: LOGO_H };
}
