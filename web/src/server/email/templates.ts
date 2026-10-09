/**
 * Email templates. Every message ships both `text` (deliverability fallback,
 * required) and `html` (branded — table layout + inline styles, the one
 * markup pattern Gmail/Outlook render consistently). Team/internal emails
 * reuse the same shell with `audience: 'team'` (see htmlLayout) — no
 * customer-facing contact CTA, adds a customer contact card instead.
 */
import type { EmailMessage } from './sender';
import type { OrderWithItems } from './sender';

const BRAND = '#4e7ffe';
const BRAND_DEEP = '#3b64e0';
const INK = '#10192e';
const INK_SOFT = '#4b5878';
const PAPER = '#fcfbf8';
const SAND = '#f4f1ea';
const LINE = '#e6e2d8';
const SUCCESS = '#1a7a4c';
const AMBER = '#b7791f';
const WHATSAPP = '#25d366';

const LOGO_URL =
  'https://cdn.sanity.io/images/gxkh85js/production/fcfb8e42eb2d83c3d564c67f8149bce3a327c73c-1254x1254.svg';
const WHATSAPP_URL =
  "https://api.whatsapp.com/send/?phone=19735804445&text=Hi%21+I%27d+like+to+ask+about+availability.&type=phone_number&app_absent=0";
const WHATSAPP_DISPLAY = '+1 973 580 4445';

function formatUsd(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Table-based shell: logo header, white card, footer. Inline CSS only — the
 * one markup pattern Gmail/Outlook render consistently. `audience: 'customer'`
 * shows the WhatsApp/email contact CTA; `'team'` (internal order/refund
 * notifications) skips it — there's no reason for the business to invite
 * itself to contact itself.
 */
function htmlLayout(opts: {
  preheader: string;
  badge?: { label: string; color: string };
  bodyHtml: string;
  audience?: 'customer' | 'team';
}): string {
  const audience = opts.audience ?? 'customer';
  const badgeHtml = opts.badge
    ? `<span style="display:inline-block;padding:5px 14px;border-radius:999px;background:${opts.badge.color}1a;color:${opts.badge.color};font:700 11px/1 Arial,sans-serif;letter-spacing:.06em;text-transform:uppercase;">${opts.badge.label}</span>`
    : '';

  const footerCta =
    audience === 'customer'
      ? `<table role="presentation" cellpadding="0" cellspacing="0">
<tr>
<td style="padding:0 6px;">
<a href="${WHATSAPP_URL}" style="display:inline-block;padding:10px 18px;border-radius:999px;background:${WHATSAPP};color:#ffffff;font:600 13px/1 Arial,sans-serif;text-decoration:none;">WhatsApp us</a>
</td>
<td style="padding:0 6px;">
<a href="mailto:info@galapagosandbeyond.com" style="display:inline-block;padding:10px 18px;border-radius:999px;background:${PAPER};border:1px solid ${LINE};color:${INK};font:600 13px/1 Arial,sans-serif;text-decoration:none;">Email us</a>
</td>
</tr>
</table>
<p style="margin:18px 0 0;font:400 12px/1.6 Arial,sans-serif;color:${INK_SOFT};">
Galápagos &amp; Beyond · Puerto Ayora, Santa Cruz, Galápagos, Ecuador<br>
${WHATSAPP_DISPLAY} · <a href="mailto:info@galapagosandbeyond.com" style="color:${BRAND_DEEP};text-decoration:none;">info@galapagosandbeyond.com</a>
</p>`
      : `<p style="margin:0;font:400 12px/1.6 Arial,sans-serif;color:${INK_SOFT};">Internal notification &middot; Galápagos &amp; Beyond booking system</p>`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>Galápagos &amp; Beyond</title>
</head>
<body style="margin:0;padding:0;background:${SAND};font-family:Arial,Helvetica,sans-serif;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(opts.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${SAND};padding:40px 16px;">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:100%;">
<tr>
<td style="padding:0 8px 24px;" align="center">
<img src="${LOGO_URL}" width="52" height="52" alt="Galápagos &amp; Beyond" style="display:block;border:0;outline:0;">
<div style="margin-top:10px;font:700 17px/1 Georgia,'Times New Roman',serif;color:${INK};letter-spacing:.01em;">Galápagos <span style="color:${BRAND_DEEP};">&amp;</span> Beyond</div>
</td>
</tr>
<tr>
<td style="background:${PAPER};border-radius:14px;border:1px solid ${LINE};box-shadow:0 1px 3px rgba(16,25,46,0.06);overflow:hidden;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr><td style="height:4px;line-height:4px;font-size:0;background:linear-gradient(90deg,${BRAND},${BRAND_DEEP});">&nbsp;</td></tr>
<tr>
<td style="padding:36px 36px 32px;">
${badgeHtml ? `<div style="margin-bottom:18px;">${badgeHtml}</div>` : ''}
${opts.bodyHtml}
</td>
</tr>
</table>
</td>
</tr>
<tr>
<td style="padding:28px 12px 0;" align="center">
${footerCta}
</td>
</tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

function itemRowsHtml(order: OrderWithItems): string {
  return order.items
    .map((item, i) => {
      const meta = [
        item.departureStart ? `${item.departureStart} &rarr; ${item.departureEnd}` : null,
        `${item.adults} adult${item.adults === 1 ? '' : 's'}${item.children ? `, ${item.children} child${item.children === 1 ? '' : 'ren'}` : ''}`,
      ]
        .filter((l): l is string => l !== null)
        .join(' &middot; ');
      const isLast = i === order.items.length - 1;

      return `<tr>
<td colspan="2" style="padding:0 0 ${isLast ? '0' : '10px'};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${SAND};border-radius:10px;">
<tr>
<td style="padding:14px 16px;vertical-align:top;">
<p style="margin:0 0 4px;font:600 15px/1.4 Georgia,'Times New Roman',serif;color:${INK};">${escapeHtml(item.itemName)}</p>
<p style="margin:0;font:400 13px/1.5 Arial,sans-serif;color:${INK_SOFT};">${meta}</p>
</td>
<td style="padding:14px 16px;text-align:right;white-space:nowrap;vertical-align:top;">
<span style="font:700 15px/1.4 Arial,sans-serif;color:${INK};">${formatUsd(item.amountCents)}</span>
</td>
</tr>
</table>
</td>
</tr>`;
    })
    .join('');
}

function orderSummaryHtml(order: OrderWithItems): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:22px 0 18px;">
${itemRowsHtml(order)}
<tr>
<td colspan="2" style="padding:18px 4px 0;border-top:1px solid ${LINE};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr>
<td style="font:700 12px/1 Arial,sans-serif;color:${INK_SOFT};text-transform:uppercase;letter-spacing:.06em;">Total paid</td>
<td style="text-align:right;font:700 20px/1 Arial,sans-serif;color:${BRAND_DEEP};">${formatUsd(order.amountCents)} ${order.currency.toUpperCase()}</td>
</tr>
</table>
</td>
</tr>
</table>
<p style="margin:0;font:400 12px/1.5 Arial,sans-serif;color:${INK_SOFT};">Order reference <span style="font-family:'Courier New',monospace;color:${INK};">${order.id}</span></p>`;
}

function itemLines(order: OrderWithItems): string[] {
  return order.items.map((item, i) => {
    const lines = [
      `${i + 1}. ${item.itemName}`,
      item.departureStart ? `   Departure: ${item.departureStart} to ${item.departureEnd}` : null,
      `   Travelers: ${item.adults} adult${item.adults === 1 ? '' : 's'}${item.children ? `, ${item.children} child${item.children === 1 ? '' : 'ren'}` : ''}`,
      `   Subtotal: ${formatUsd(item.amountCents)}`,
    ];
    return lines.filter((l): l is string => l !== null).join('\n');
  });
}

function orderSummary(order: OrderWithItems): string {
  return [
    `Order reference: ${order.id}`,
    '',
    ...itemLines(order),
    '',
    `Total paid: ${formatUsd(order.amountCents)} ${order.currency.toUpperCase()}`,
  ].join('\n');
}

/** "<first item>" for 1 item, "<first item> + N more" for N>1. */
function orderTitle(order: OrderWithItems): string {
  const first = order.items[0]?.itemName ?? 'your trip';
  return order.items.length > 1 ? `${first} + ${order.items.length - 1} more` : first;
}

/** Contact + payment reference card shown in internal (team) emails. */
function customerCardHtml(order: OrderWithItems): string {
  const rows = [
    ['Name', escapeHtml(order.customer.name)],
    ['Email', `<a href="mailto:${escapeHtml(order.customer.email)}" style="color:${BRAND_DEEP};text-decoration:none;">${escapeHtml(order.customer.email)}</a>`],
    order.customer.phone
      ? ['Phone', `<a href="tel:${escapeHtml(order.customer.phone)}" style="color:${BRAND_DEEP};text-decoration:none;">${escapeHtml(order.customer.phone)}</a>`]
      : null,
    ['Provider', order.provider === 'stripe' ? 'Stripe' : 'PayPal'],
    ['Reference', `<span style="font-family:'Courier New',monospace;">${escapeHtml(order.stripeSessionId ?? order.paypalOrderId ?? order.id)}</span>`],
  ].filter((r): r is [string, string] => r !== null);

  const rowsHtml = rows
    .map(
      ([label, value]) => `<tr>
<td style="padding:6px 0;font:600 12px/1.5 Arial,sans-serif;color:${INK_SOFT};text-transform:uppercase;letter-spacing:.04em;white-space:nowrap;vertical-align:top;">${label}</td>
<td style="padding:6px 0 6px 16px;font:400 14px/1.5 Arial,sans-serif;color:${INK};">${value}</td>
</tr>`
    )
    .join('');

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0 0;background:${SAND};border-radius:10px;">
<tr><td style="padding:14px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
${rowsHtml}
</table>
</td></tr>
</table>`;
}

export function orderCustomerEmail(order: OrderWithItems): EmailMessage {
  return {
    to: order.customer.email,
    subject: `Booking confirmed: ${orderTitle(order)}`,
    text: [
      `Dear ${order.customer.name},`,
      '',
      'Thank you for booking with Galápagos & Beyond! Your payment has been received and your booking is confirmed.',
      '',
      orderSummary(order),
      '',
      'Our team will contact you shortly with the next steps and full trip details.',
      '',
      'Warm regards,',
      'Galápagos & Beyond',
    ].join('\n'),
    html: htmlLayout({
      preheader: `Your payment has been received: ${orderTitle(order)} is confirmed.`,
      badge: { label: 'Booking confirmed', color: SUCCESS },
      bodyHtml: `
<p style="margin:0 0 8px;font:400 15px/1.6 Arial,sans-serif;color:${INK};">Dear ${escapeHtml(order.customer.name)},</p>
<p style="margin:0 0 8px;font:400 15px/1.6 Arial,sans-serif;color:${INK};">Thank you for booking with <strong>Galápagos &amp; Beyond</strong>! Your payment has been received and your booking is confirmed.</p>
${orderSummaryHtml(order)}
<p style="margin:20px 0 0;font:400 15px/1.6 Arial,sans-serif;color:${INK};">Our team will contact you shortly with the next steps and full trip details.</p>
<p style="margin:20px 0 0;font:400 15px/1.6 Arial,sans-serif;color:${INK};">Warm regards,<br>Galápagos &amp; Beyond</p>`,
    }),
  };
}

export function orderTeamEmail(order: OrderWithItems, to: string): EmailMessage {
  return {
    to,
    subject: `NEW ORDER (paid): ${order.items.length} item${order.items.length === 1 ? '' : 's'}, ${formatUsd(order.amountCents)}`,
    text: [
      orderSummary(order),
      '',
      `Customer: ${order.customer.name} <${order.customer.email}>${order.customer.phone ? ` / ${order.customer.phone}` : ''}`,
      `Provider: ${order.provider}`,
      `Reference: ${order.stripeSessionId ?? order.paypalOrderId}`,
    ].join('\n'),
    html: htmlLayout({
      audience: 'team',
      preheader: `New paid order: ${orderTitle(order)}, ${formatUsd(order.amountCents)}.`,
      badge: { label: 'New order · paid', color: AMBER },
      bodyHtml: `
<p style="margin:0 0 4px;font:700 19px/1.4 Georgia,'Times New Roman',serif;color:${INK};">${escapeHtml(orderTitle(order))}</p>
<p style="margin:0;font:400 14px/1.6 Arial,sans-serif;color:${INK_SOFT};">A new order was paid and needs follow-up.</p>
${orderSummaryHtml(order)}
${customerCardHtml(order)}`,
    }),
  };
}

export function orderRefundedCustomerEmail(order: OrderWithItems): EmailMessage {
  return {
    to: order.customer.email,
    subject: `Refund processed: ${orderTitle(order)}`,
    text: [
      `Dear ${order.customer.name},`,
      '',
      `Your payment for ${orderTitle(order)} has been refunded.`,
      '',
      orderSummary(order),
      '',
      'The refund should appear on your original payment method within a few business days.',
      '',
      'Warm regards,',
      'Galápagos & Beyond',
    ].join('\n'),
    html: htmlLayout({
      preheader: `Your payment for ${orderTitle(order)} has been refunded.`,
      badge: { label: 'Refund processed', color: INK_SOFT },
      bodyHtml: `
<p style="margin:0 0 8px;font:400 15px/1.6 Arial,sans-serif;color:${INK};">Dear ${escapeHtml(order.customer.name)},</p>
<p style="margin:0 0 8px;font:400 15px/1.6 Arial,sans-serif;color:${INK};">Your payment for <strong>${escapeHtml(orderTitle(order))}</strong> has been refunded.</p>
${orderSummaryHtml(order)}
<p style="margin:20px 0 0;font:400 15px/1.6 Arial,sans-serif;color:${INK};">The refund should appear on your original payment method within a few business days.</p>
<p style="margin:20px 0 0;font:400 15px/1.6 Arial,sans-serif;color:${INK};">Warm regards,<br>Galápagos &amp; Beyond</p>`,
    }),
  };
}

export function orderRefundedTeamEmail(order: OrderWithItems, to: string): EmailMessage {
  return {
    to,
    subject: `REFUND processed: ${order.items.length} item${order.items.length === 1 ? '' : 's'}, ${formatUsd(order.amountCents)}`,
    text: [
      orderSummary(order),
      '',
      `Customer: ${order.customer.name} <${order.customer.email}>`,
      `Provider: ${order.provider}`,
      `Reference: ${order.stripeSessionId ?? order.paypalOrderId}`,
    ].join('\n'),
    html: htmlLayout({
      audience: 'team',
      preheader: `Refund processed: ${orderTitle(order)}, ${formatUsd(order.amountCents)}.`,
      badge: { label: 'Refund processed', color: INK_SOFT },
      bodyHtml: `
<p style="margin:0 0 4px;font:700 19px/1.4 Georgia,'Times New Roman',serif;color:${INK};">${escapeHtml(orderTitle(order))}</p>
<p style="margin:0;font:400 14px/1.6 Arial,sans-serif;color:${INK_SOFT};">This order was refunded. No action needed unless the customer follows up.</p>
${orderSummaryHtml(order)}
${customerCardHtml(order)}`,
    }),
  };
}

/** One label/value row for the inquiry info table — skipped entirely when value is falsy. */
function inquiryInfoRow(label: string, value: string | number | null | undefined, href?: string): string {
  if (!value) return '';
  const cell = href
    ? `<a href="${href}" style="color:${BRAND_DEEP};text-decoration:none;">${escapeHtml(String(value))}</a>`
    : escapeHtml(String(value));
  return `<tr>
<td style="padding:6px 0;font:600 12px/1.5 Arial,sans-serif;color:${INK_SOFT};text-transform:uppercase;letter-spacing:.04em;white-space:nowrap;vertical-align:top;">${label}</td>
<td style="padding:6px 0 6px 16px;font:400 14px/1.5 Arial,sans-serif;color:${INK};">${cell}</td>
</tr>`;
}

export function inquiryTeamEmail(
  inquiry: {
    name: string;
    email: string;
    phone?: string | null;
    travelers?: number | null;
    startDate?: string | null;
    endDate?: string | null;
    originCountry?: string | null;
    message: string;
    context?: string | null;
  },
  to: string
): EmailMessage {
  return {
    to,
    subject: `New inquiry from ${inquiry.name}`,
    text: [
      `From: ${inquiry.name} <${inquiry.email}>`,
      inquiry.phone ? `Phone: ${inquiry.phone}` : null,
      inquiry.travelers ? `Travelers: ${inquiry.travelers}` : null,
      inquiry.startDate ? `Preferred start date: ${inquiry.startDate}` : null,
      inquiry.endDate ? `Preferred end date: ${inquiry.endDate}` : null,
      inquiry.originCountry ? `Origin country: ${inquiry.originCountry}` : null,
      inquiry.context ? `Page: ${inquiry.context}` : null,
      inquiry.message ? '' : null,
      inquiry.message ? inquiry.message : null,
    ]
      .filter((l): l is string => l !== null)
      .join('\n'),
    html: htmlLayout({
      audience: 'team',
      preheader: `New inquiry from ${inquiry.name}`,
      badge: { label: 'New inquiry', color: AMBER },
      bodyHtml: `
<p style="margin:0 0 4px;font:700 19px/1.4 Georgia,'Times New Roman',serif;color:${INK};">${escapeHtml(inquiry.name)}</p>
${inquiry.context ? `<p style="margin:0 0 16px;font:400 13px/1.5 Arial,sans-serif;color:${INK_SOFT};">Re: ${escapeHtml(inquiry.context)}</p>` : ''}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;background:${SAND};border-radius:10px;">
<tr><td style="padding:14px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr>
<td style="padding:6px 0;font:600 12px/1.5 Arial,sans-serif;color:${INK_SOFT};text-transform:uppercase;letter-spacing:.04em;white-space:nowrap;vertical-align:top;">Email</td>
<td style="padding:6px 0 6px 16px;font:400 14px/1.5 Arial,sans-serif;color:${INK};"><a href="mailto:${escapeHtml(inquiry.email)}" style="color:${BRAND_DEEP};text-decoration:none;">${escapeHtml(inquiry.email)}</a></td>
</tr>
${inquiryInfoRow('Phone', inquiry.phone, inquiry.phone ? `tel:${escapeHtml(inquiry.phone)}` : undefined)}
${inquiryInfoRow('Travelers', inquiry.travelers)}
${inquiryInfoRow('Preferred start date', inquiry.startDate)}
${inquiryInfoRow('Preferred end date', inquiry.endDate)}
${inquiryInfoRow('Origin country', inquiry.originCountry)}
</table>
</td></tr>
</table>
${inquiry.message ? `<p style="margin:0;font:400 15px/1.6 Arial,sans-serif;color:${INK};white-space:pre-wrap;">${escapeHtml(inquiry.message)}</p>` : ''}`,
    }),
  };
}
