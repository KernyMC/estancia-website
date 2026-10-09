/** Strips WP shortcodes and HTML tags, leaving clean plain text with paragraph breaks. */
export function cleanText(raw) {
  if (!raw) return ''
  return raw
    .replace(/\[[a-z_]+[^\]]*\]/gi, '') // WP shortcodes e.g. [gab_availability ship="4"]
    .replace(/<\/p>\s*<p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
