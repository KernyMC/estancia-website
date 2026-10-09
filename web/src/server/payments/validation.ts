/**
 * Shared Zod primitives for user-submitted text that ends up in an email
 * header (Subject, To, a `Name <email>` From) — checkout customer name/phone,
 * inquiry name/phone/context. Nodemailer encodes header values safely on its
 * own, but rejecting CR/LF/NUL at the input boundary means a malformed
 * field fails validation instead of silently riding along into a header.
 */
export const noHeaderInjection = /^[^\r\n\0]*$/;
