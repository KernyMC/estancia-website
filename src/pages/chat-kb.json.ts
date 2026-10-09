import { locations, hours, giftCards, nav } from '../data/site';
import { specials, faqs, events } from '../data/content';
import { holidays, giftBonus, groupHoliday } from '../data/holidays';

// Base de conocimiento del asistente de chat: se genera en build desde los mismos datos del sitio (una sola fuente de verdad).
const L = (id: 'austin' | 'leander') => {
  const l = locations[id];
  return [
    `${l.name.toUpperCase()} (${l.area})`,
    `Address: ${l.address}, ${l.cityLine}`,
    `Phone: ${l.phone} · Events phone: ${l.eventsPhone} · Events email: ${l.eventsEmail}`,
    `Reserve (Resy): ${l.resy}`,
    `Order online: ${l.order.map((o) => `${o.label} ${o.url}`).join(' | ')}`,
    `Private dining rooms: ${l.rooms.map((r) => `${r.name} (${r.guests})`).join('; ')}`,
    `Page: https://estancia.com/${l.id}/`,
  ].join('\n');
};

const holidayText = holidays
  .map((h) =>
    [
      `${h.name} (${h.dates}): ${h.description}`,
      ...h.days.map((d) => `  ${d.label}: ${d.slots.map((s) => `${s.name} ${s.time} — ${s.rows.map(([n, p]) => `${n} ${p}`).join(', ')}`).join('; ')}`),
      `  Kids: ${h.kids.join('; ')}`,
      `  Takeout: ${h.takeout.title}, ${h.takeout.price}, ${h.takeout.serves}, ${h.takeout.window}`,
      `  Page: https://estancia.com/${h.slug}/`,
    ].join('\n'),
  )
  .join('\n');

const pages = nav.flatMap((n) => [n, ...(n.children ?? [])]).map((n) => `${n.label}: https://estancia.com${n.href}`);

const kb = [
  'Estância Brazilian Steakhouse is a Brazilian steakhouse (churrascaria) in Austin and Leander, Texas. Fire-roasted meats are carved tableside by gauchos, with a gourmet salad bar and traditional Brazilian sides.',
  '',
  L('austin'),
  '',
  L('leander'),
  '',
  'HOURS (both locations, regular schedule):',
  ...hours.map((h) => `${h.days}: ${h.lines.join(' · ')}`),
  'Closed between lunch and dinner Monday to Friday (3:30 pm to 5:00 pm).',
  '',
  'WEEKLY SPECIALS:',
  ...specials.map((s) => `${s.title} (${s.day}): ${s.text}`),
  '',
  'EVENTS:',
  ...events.map((e) => `${e.title} — ${e.when} — ${e.where}. ${e.text} Page: https://estancia.com/events/${e.slug}/`),
  '',
  'HOLIDAYS (details and prices still pending final confirmation by the restaurant; tell guests to confirm with their location):',
  holidayText,
  `Holiday gift card bonus: ${giftBonus.headline} (${giftBonus.window}).`,
  `Group holiday offer: ${groupHoliday.headline} ${groupHoliday.rewards.map(([a, b]) => `${a} ${b}`).join('; ')}.`,
  '',
  'GIFT CARDS: buy at ' + giftCards.buy + ' · check balance at ' + giftCards.balance,
  'PRIVATE DINING & GROUPS: rooms from 12 up to 250 guests. Request an event at https://estancia.com/private-dining/',
  '',
  'FAQ:',
  ...faqs.map((f) => `Q: ${f.q} A: ${f.a}`),
  '',
  'SITE PAGES:',
  ...pages,
  'Contact: https://estancia.com/contact/ · FAQ: https://estancia.com/faq/ · News: https://estancia.com/news/',
  '',
  'NOT AVAILABLE IN THIS DATA: regular (non-holiday) churrasco dinner/lunch prices, allergen details, table availability. Do not guess these.',
].join('\n');

export const GET = () =>
  new Response(JSON.stringify({ kb }), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=300' },
  });
