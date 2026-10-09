/**
 * SEO helpers: consistent brand suffix in <title>, absolute URLs, and
 * schema.org JSON-LD builders (Organization, BreadcrumbList, FAQPage,
 * Product). Emitted by Base.astro / Breadcrumbs.astro / FaqSection.astro.
 *
 * Builders return plain objects — the components serialize them. Nothing
 * here fabricates content: pass only data that exists (e.g. price only when
 * a real departure is known), and undefined fields are dropped before output.
 */

export const SITE_NAME = 'Galápagos & Beyond';
/** Keep in sync with astro.config.mjs `site`. Confirm domain before cutover. */
export const SITE_URL = 'https://www.galapagosandbeyond.com';
const BRAND_SUFFIX = ` | ${SITE_NAME}`;

/** Append "| Galápagos & Beyond" to a page title unless it already names the brand. */
export function withBrand(title: string): string {
  return title.includes(SITE_NAME) ? title : `${title}${BRAND_SUFFIX}`;
}

/**
 * Serialize JSON-LD for injection into a `<script set:html={...}>` tag.
 * `JSON.stringify` alone doesn't escape `<` — a string containing `</script>`
 * (a tour/FAQ title, say) would prematurely close the tag and let anything
 * after it run as real markup/script. Escaping `<` as `<` neutralizes
 * that while staying valid JSON (unicode escapes are legal anywhere in a
 * JSON string).
 */
export function jsonLdScript(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

/** Turn a site-relative path into an absolute URL for canonical/og/JSON-LD. */
export function absoluteUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  return new URL(path, SITE_URL).href;
}

type Json = Record<string, unknown>;

/** Strip undefined/null/empty-array values so JSON-LD stays clean and valid. */
function compact<T extends Json>(obj: T): T {
  for (const key of Object.keys(obj)) {
    const v = obj[key];
    if (v === undefined || v === null || (Array.isArray(v) && v.length === 0)) {
      delete obj[key];
    }
  }
  return obj;
}

export interface Crumb {
  label: string;
  /** Site-relative path. Omit on the current (last) crumb. */
  href?: string;
}

/** BreadcrumbList — tells AI/search the page's place in the site hierarchy. */
export function breadcrumbLd(items: Crumb[]): Json {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((c, i) =>
      compact({
        '@type': 'ListItem',
        position: i + 1,
        name: c.label,
        item: c.href ? absoluteUrl(c.href) : undefined,
      }),
    ),
  };
}

export interface FaqEntry {
  question: string;
  /** Plain text or HTML string — tags are stripped for the schema answer. */
  answer: string;
}

/** FAQPage — eligible for FAQ rich results and heavily cited by AI answers. */
export function faqLd(faqs: FaqEntry[]): Json | null {
  if (!faqs.length) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: f.answer.replace(/<[^>]+>/g, '').trim(),
      },
    })),
  };
}

export interface ProductLdInput {
  name: string;
  description?: string;
  image?: string;
  url: string;
  category?: string;
  /** Lowest per-person price from a real, known departure — omit if unknown. */
  price?: number;
  priceCurrency?: string;
}

/** Product + Offer — surfaces price in results. Offer only when price is real. */
export function productLd(input: ProductLdInput): Json {
  return compact({
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: input.name,
    description: input.description,
    image: input.image ? absoluteUrl(input.image) : undefined,
    url: absoluteUrl(input.url),
    category: input.category,
    brand: { '@type': 'Brand', name: SITE_NAME },
    offers:
      input.price != null
        ? compact({
            '@type': 'Offer',
            price: input.price,
            priceCurrency: input.priceCurrency ?? 'USD',
            availability: 'https://schema.org/InStock',
            url: absoluteUrl(input.url),
          })
        : undefined,
  });
}

export interface LodgingLdInput {
  name: string;
  description?: string;
  image?: string;
  url: string;
  /** Free-text locality (e.g. "Santa Cruz, Galápagos") — omit if unknown. */
  areaServed?: string;
}

/** LodgingBusiness — correct entity type for an agency-run stay/aparthotel. */
export function lodgingLd(input: LodgingLdInput): Json {
  return compact({
    '@context': 'https://schema.org',
    '@type': 'LodgingBusiness',
    name: input.name,
    description: input.description,
    image: input.image ? absoluteUrl(input.image) : undefined,
    url: absoluteUrl(input.url),
    areaServed: input.areaServed,
    brand: { '@type': 'Brand', name: SITE_NAME },
  });
}

/** Organization — brand entity for knowledge-graph / "who is this" AI queries. */
export function organizationLd(): Json {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE_URL,
    logo: absoluteUrl('/logos/galapagosandbeyond-logo.svg'),
    description:
      'Ecuador-based specialists in Galápagos cruises, island tours and stays.',
  };
}
