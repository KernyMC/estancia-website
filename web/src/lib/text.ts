/** Strips leftover WordPress shortcodes like [gab_availability ship="7"]. */
export function stripShortcodes(text: string): string {
  return text.replace(/\[[a-z_]+[^\]]*\]/gi, '').trim();
}

/**
 * Splits paragraphs into an array for <p> rendering. Handles two source
 * shapes seen in the migrated WP data: plain text with blank-line-separated
 * paragraphs (the norm), and a handful of records that kept their raw
 * `<p>...</p>` HTML instead of being flattened to plain text during
 * migration — those get their tags stripped instead of shown literally.
 */
export function toParagraphs(text: string): string[] {
  const clean = stripShortcodes(text);

  if (/<p[\s>]/i.test(clean)) {
    return clean
      .split(/<\/p>/gi)
      .map((p) => p.replace(/<[^>]+>/g, '').trim())
      .filter(Boolean);
  }

  return clean
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}
