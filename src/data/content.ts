// Contenido editorial extraído de estancia.com (2026-10-07). En producción: Sanity (`menu`, `event`, `special`, `faqItem`).
export const meats = [
  { name: 'Picanha', img: '/img/w/picanha.jpg', text: 'Prime aged top sirloin, seasoned with sea salt, also served with bold garlic and a zesty spicy rub.' },
  { name: 'Filet Mignon', img: '/img/w/filet.jpg', text: 'The most tender cut of beef, prime aged and carved to showcase its decadent texture and flavor.' },
  { name: 'Ribeye', img: '/img/w/ribeye.jpg', text: 'Prime aged ribeye, marbled to perfection for a superb flavor.' },
  { name: 'Fraldinha', img: '/img/w/fraldinha.jpg', text: 'Bottom sirloin carved against the grain: the most flavorful cut, served with ultimate tenderness.' },
  { name: 'Lamb', img: '/img/w/lamb.jpg', text: 'Lamb steak and juicy lamb chops, marinated in fresh mint, white wine and lemon pepper.' },
  { name: 'Pork Ribs', img: '/img/w/pork_ribs.jpg', text: 'Marinated in white wine, lemon pepper, smoky paprika and bold fajita seasoning.' },
  { name: 'Pork Parmesan', img: '/img/w/parm_pork.jpg', text: 'Juicy pork tenderloin in smoky spices and white wine, finished with a golden Parmesan crust.' },
  { name: 'Chicken', img: '/img/w/chicken.jpg', text: 'Tender chicken marinated in beer, brandy and lemon pepper, slow-roasted, also wrapped in bacon.' },
  { name: 'Sausage', img: '/img/w/sausage.jpg', text: 'Pork sausage slow-roasted for a crispy outside and tender center.' },
  { name: 'Shrimp', img: '/img/w/shrimp.jpg', text: 'Juicy grilled shrimp seasoned in butter, garlic and lemon pepper.' },
];

export const saladBar = [
  'Smoked salmon', 'Hearts of palm', 'Prosciutto', 'Brie', 'Manchego', 'Fresh mozzarella', 'Artichoke bottoms', 'Asparagus',
  'Waldorf salad', 'Tabbouleh', 'Caesar salad', 'Chicken salad', 'Bruschetta', 'Shiitake mushrooms', 'Sun-dried tomato pasta',
  'Pesto pasta', 'Grana Padano', 'Smoked Gouda', 'Fig jam', 'Brazilian rice', 'Black beans with pork', 'Peppadew', 'Marinated onions',
  'Garbanzo salad', 'Potato salad', 'Baby spinach & arugula', 'Spring mix', 'Cherry tomatoes', 'Salami', 'Ciabatta',
];

export const sides = [
  { name: 'Garlic mashed potatoes', img: '/img/w/img_5067-e1775582191954.jpg' },
  { name: 'Caramelized bananas', img: '/img/w/dsc04728-scaled.jpg' },
  { name: 'Brazilian feijoada', img: '/img/w/dsc05345-scaled.jpg' },
  { name: 'Yucca fries', img: '/img/w/img_4046-1-scaled.jpg' },
  { name: 'Farofa', img: '/img/w/img_4046-1-scaled.jpg' },
  { name: 'Carreteiro rice', img: '/img/w/carreteiro-rice-1-small-1.jpg' },
  { name: 'Crispy polenta', img: '/img/w/polenta-1-small-1.jpg' },
  { name: 'Pão de queijo', img: '/img/w/pao-de-queijo-1-small-1.jpg' },
];

export const brunch = [
  'Grilled salmon', 'Sautéed shrimp', 'Scrambled eggs', 'Breakfast potatoes', 'French toast casserole', 'Bacon & candied bacon',
  'Brazilian sausage', 'Bolo de fubá', 'Charcuterie', 'Muffins & scones', 'Flan', 'Fruit bar',
];

export const desserts = [
  { name: 'Chocolate Molten Cake', img: '/img/w/20.jpg' },
  { name: 'Tres Leches', img: '/img/w/21.jpg' },
  { name: 'Grilled Pineapple & Vanilla Ice Cream', img: '/img/w/22.jpg' },
  { name: 'Cheesecake', img: '/img/w/23.jpg' },
  { name: 'Papaya Cream with Cassis', img: '/img/w/24.jpg' },
  { name: 'Condensed Milk Flan', img: '/img/w/25.jpg' },
];

export const cocktails = [
  { name: 'Caipirinha', img: '/img/w/caipirinhas-220628-ish.jpg' },
  { name: 'Brazilian Lemonade', img: '/img/w/brazilianlemonade-220628-ish-scaled.jpg' },
  { name: 'Passion Fruit Lemon Drop', img: '/img/w/barpassionfruitlemondrop.jpg' },
  { name: 'Mexican Martini', img: '/img/w/barmexicanmartinivert.jpg' },
  { name: 'Old Fashioned', img: '/img/w/drink-old-fashioned.jpg' },
  { name: 'Lychee Martini', img: '/img/w/blanc-lychee-martini.jpg' },
];

export interface EventItem {
  slug: string;
  title: string;
  kicker: string;
  when: string;
  start?: string;
  where: string;
  image: string;
  text: string;
  cta?: { label: string; href: string };
  ctas?: { label: string; href: string }[];
  href?: string;
}

export const events: EventItem[] = [
  {
    slug: 'daou-tasting',
    title: 'Estância 19th Anniversary: DAOU Tasting',
    kicker: 'Wine tasting',
    when: 'Oct 22 (Austin) · Oct 29 (Leander) · 6:00–8:30 pm',
    start: '2026-10-22',
    where: 'Austin & Leander',
    image: '/img/w/ad-1_1-austin-leander-daou-tasting.jpg',
    text: 'Join us to celebrate 19 years of Estância with a guided tasting of DAOU wines featuring Patrimony, paired with seasonal bites from our kitchen. Seats are limited — reserve yours early.',
    ctas: [
      { label: 'Buy tickets · Austin, Oct 22', href: 'https://estancia19austin.tripleseattickets.com/registration/select' },
      { label: 'Buy tickets · Leander, Oct 29', href: 'https://estancia19leander.tripleseattickets.com/registration/select' },
    ],
  },
  {
    slug: 'a-taste-of-fall',
    title: 'A Taste of Fall',
    kicker: 'Seasonal tasting',
    when: 'Sep 24 (Austin) · Sep 26 (Leander)',
    start: '2026-09-26',
    where: 'Austin & Leander',
    image: '/img/w/a-taste-of-fall-web-banner.jpg',
    text: 'Our seasonal tasting evening: fall cocktails, autumn flavors and the best of the churrasco. See you next season.',
    cta: { label: 'Leander tickets page', href: 'https://atasteoffall-estancialeander.tripleseattickets.com/' },
  },
];

export const specials = [
  { day: 'Monday', title: 'Monday Night Special', img: '/img/w/monday-night-2.jpg', text: 'Start the week right with a special churrasco offer at both locations.' },
  { day: 'Mon – Fri', title: 'Brazilian Happy Hour', img: '/img/w/feed-brazilian-happy-hour.jpg', text: 'Bar area only. Craft cocktails, caipirinhas and bites. Monday to Friday, 12:00 – 6:00 pm.' },
  { day: 'Wednesday', title: 'Wine Wednesday', img: '/img/w/3.jpg', text: '50% off selected bottles every Wednesday.' },
  { day: 'Lunch', title: 'Executive Lunch', img: '/img/w/4.jpg', text: 'Prime meats & unlimited salad bar, starting at $21. Austin-exclusive.' },
  { day: 'Sat & Sun', title: 'Brazilian Brunch', img: '/img/w/6.jpg', text: 'Weekend brunch from 11:00 am to 3:30 pm with brunch additions and signature cocktails.' },
  { day: 'Leander', title: 'Churrasco on the Patio', img: '/img/w/feed-churrasco-estancia.jpg', text: 'Four grilled skewers, two traditional accompaniments. Serves two. Meet us on the patio.' },
];

export const faqs = [
  { q: 'What is the Churrasco Experience?', a: 'A continuous dining journey featuring fire-roasted meats carved tableside by our gauchos, with unlimited access to our gourmet salad bar, traditional Brazilian hot dishes and classic sides.' },
  { q: 'What is a Brazilian steakhouse?', a: 'A Brazilian steakhouse, or churrascaria, serves a variety of fire-roasted meats carved tableside. At Estância in Austin and Leander you enjoy premium meats, a gourmet salad bar and traditional Brazilian sides in a continuous service.' },
  { q: 'Where is Estância located?', a: 'We have two locations in Texas: Austin (Arboretum area, 10000 Research Blvd) and Leander (2132 Raider Way).' },
  { q: 'Do I need a reservation?', a: 'Reservations are highly recommended, especially for weekends, holidays and special occasions. You can reserve online through our website.' },
  { q: 'Does Estância offer takeout or delivery?', a: 'Yes. Order online for pickup, or through Uber Eats, Grubhub and DoorDash in Austin and Leander.' },
  { q: 'Is Estância good for special occasions or groups?', a: 'Absolutely. We host birthdays, graduations, corporate events and family gatherings, with private rooms from 12 up to 250 guests.' },
  { q: 'What kind of meats are served?', a: 'Picanha, prime bottom sirloin, garlic beef, spicy beef, sirloin wrapped in bacon, prime aged ribeye, filet mignon, pork ribs, Brazilian sausage, pork Parmesan, lamb chops and steak, chicken breast wrapped in bacon, chicken legs and grilled shrimp.' },
  { q: 'Do you have a dress code?', a: 'We recommend smart casual attire. There is no strict dress code.' },
];

export const reviews = [
  { name: 'Marcelo Azevedo', text: 'We came in for dinner and loved the grilled meats, passion fruit caipirinha, and service!' },
  { name: 'Norah Bartels', text: 'Impeccable service, food and atmosphere! This location never disappoints!' },
  { name: 'Giovanni Avellaneda', text: 'First time at Estância, great service dealing with a big group — five star quality.' },
  { name: 'John Megas', text: 'Everyone is very attentive, and the food was great!' },
  { name: 'Joseph Fuentes', text: 'Very attentive and accommodating. Excellent service.' },
  { name: 'Barbara Ascanio', text: 'Amazing service and staff.' },
  { name: 'Isabel Salazar', text: 'Thank you for delightful service!' },
];

export const topics: Record<string, string> = {
  churrasco: 'Churrasco',
  events: 'Events',
  'group-dining': 'Group Dining',
  'happy-hour': 'Happy Hour',
  news: 'News',
};

import { holidays } from './holidays';

/** Eventos + feriados para listados (los feriados conservan sus URLs originales: /thanksgiving/, /christmas/, /new-years/). */
export const eventItems = () =>
  [
    ...events.map((e) => ({ ...e, href: `/events/${e.slug}/` })),
    ...holidays.map((h) => ({ slug: h.slug, title: `${h.name} at Estância`, kicker: 'Holidays', when: h.dates, start: h.start, where: 'Austin & Leander', image: h.banner, text: h.description, href: `/${h.slug}/` })),
  ].sort((a, b) => (a.start ?? '').localeCompare(b.start ?? ''));

/** Entradas por página en /news/ */
export const PAGE_SIZE = 12;
