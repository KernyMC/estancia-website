/**
 * Inquiry submission endpoint. Persists to Postgres and notifies the team by
 * email. The HTTP contract is unchanged from the pre-database version — the
 * contact form needed no edits.
 */
import type { APIRoute } from 'astro';
import { z } from 'zod';
import { db } from '../../server/db';
import { sendInquiryEmail } from '../../server/email/sender';
import { noHeaderInjection } from '../../server/payments/validation';

/** Astro FormData entries arrive as strings — empty optional fields come through as ''. */
const emptyToUndefined = (v: unknown) => (v === '' ? undefined : v);

const bodySchema = z.object({
  name: z.string().trim().min(1).max(200).regex(noHeaderInjection, 'invalid characters'),
  email: z.string().trim().email().max(320),
  phone: z.preprocess(emptyToUndefined, z.string().trim().max(40).regex(noHeaderInjection, 'invalid characters').optional()),
  travelers: z.preprocess(emptyToUndefined, z.coerce.number().int().min(1).max(50).optional()),
  /** Free text, not validated against real availability — stays have no live calendar. */
  startDate: z.preprocess(emptyToUndefined, z.string().trim().max(40).regex(noHeaderInjection, 'invalid characters').optional()),
  /** Free text, not validated against real availability — same reasoning as startDate. */
  endDate: z.preprocess(emptyToUndefined, z.string().trim().max(40).regex(noHeaderInjection, 'invalid characters').optional()),
  originCountry: z.preprocess(emptyToUndefined, z.string().trim().max(100).regex(noHeaderInjection, 'invalid characters').optional()),
  /** Optional on stay inquiries (structured fields carry most of the info) — still required on the main contact form via its own `required` attribute. Kept in sync with MESSAGE_MAX_LENGTH in src/pages/contact.astro. */
  message: z.preprocess(emptyToUndefined, z.string().trim().max(1000).optional()).default(''),
  /** Optional: which page the form was submitted from. */
  context: z.preprocess(emptyToUndefined, z.string().trim().max(500).regex(noHeaderInjection, 'invalid characters').optional()),
});

function json(status: number, data: unknown): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export const POST: APIRoute = async ({ request }) => {
  const raw = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return json(400, { ok: false, error: 'Name, email and message are required' });
  }

  try {
    const inquiry = await db.inquiry.create({ data: parsed.data });
    await sendInquiryEmail(inquiry);
    return json(200, { ok: true });
  } catch (err) {
    console.error('[inquiry] failed:', err);
    return json(500, { ok: false, error: 'Could not submit your inquiry. Please try again.' });
  }
};
