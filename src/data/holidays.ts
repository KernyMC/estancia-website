// Feriados 2026. Fuente: estancia.com/{holidays,holidays-schedule,thanksgiving,christmas,new-years,easter,fathersday} (2026-10-08).
// Correcciones de calendario aplicadas (el original traía días de años anteriores). Todo lo marcado en PENDIENTES
// (docs/PENDIENTES-HOLIDAYS.md) debe confirmarlo el cliente antes de publicar.
export type Price = [name: string, price: string];

export interface Slot {
  name: string; // p. ej. «Brunch», «Dinner»
  time: string;
  rows: Price[];
  note?: string;
}
export interface Day {
  iso: string; // fecha de inicio del servicio
  label: string; // «Thursday, December 24»
  title: string;
  slots: Slot[];
}
export interface Course { heading: string; items: { name: string; desc?: string }[] }
export interface Takeout {
  title: string;
  price: string;
  serves: string;
  window: string;
  courses: Course[];
  extras?: { heading: string; price: string; items: string[] };
  extraPackage?: { title: string; price: string; serves: string };
  pickup: string[];
  details: string[];
}
export interface Holiday {
  slug: 'thanksgiving' | 'christmas' | 'new-years';
  name: string;
  short: string;
  dates: string;
  start: string;
  h1: string;
  title: string;
  description: string;
  hero: string;
  banner: string;
  badge?: string;
  intro: string;
  days: Day[];
  kids: string[];
  takeout: Takeout;
  cardDays: string;
  related?: { title: string; date: string; text: string }[];
  faq: { q: string; a: string }[];
}

export const KIDS_HALF = ['Kids 0–2 years old: complimentary', 'Kids 3–5 years old: $5', 'Kids 6–12 years old: half price'];

export const cardTerms = {
  summary: 'Receive one complimentary lunch or dinner card to apply toward a future visit when you dine with us on the dates above.',
  fine: [
    'Limit one card per table while supplies last.',
    'Card is redeemable for one complimentary lunch or dinner with the purchase of a lunch or dinner of equal value.',
    'Cannot be combined with any other offer.',
  ],
  valid: 'Valid Sunday – Thursday only, January 4 – March 25, 2027.',
  notValid: 'Not valid on Fridays, Saturdays or any other holidays.',
};

export const giftBonus = {
  headline: '$25 bonus Dining Card for every $100 in Gift Cards',
  window: 'November 1 – December 31',
  fine: [
    'The Holiday Bonus Dining Card is valid for $25 off a Full Churrasco Dinner at Estância Brazilian Steakhouse.',
    'Limit one (1) card per table. The dining card must be present at the time of use. Not valid with any other offer.',
    'The card cannot pay for beverages, desserts, tax, alcohol or gratuity. It is not for sale, is non-transferable, is not a gift card and has no cash value. If the amount purchased is less than the full value of the card, any unused balance will be forfeited.',
  ],
  valid: 'Valid Sunday – Thursday only, January 4 – March 25, 2027. Not valid on Fridays, Saturdays or any holiday.',
};

export const groupHoliday = {
  headline: 'Book 12+ guests this December and get rewarded',
  rewards: [
    ['$100', 'dining card for the host of a lunch party'],
    ['$150', 'dining card for the host of a dinner party'],
    ['$25', 'dining card for every guest'],
  ] as [string, string][],
  perks: [
    ['Custom packages & menus', 'We can customize any package or build a custom menu.'],
    ['Flexible table layouts', 'Fully private modular rooms with arrangements tailored to your group.'],
    ['Seamless planning & billing', 'Simple planning and organized billing from start to finish.'],
    ['Private or non-private', 'Enjoy your guests, relax and experience exceptional dining with ease.'],
    ['Audiovisual', 'Integrated audio & visual capabilities for presentations and special events.'],
    ['Dining cards', 'Complimentary dining cards offered as guest favors for private events.'],
  ] as [string, string][],
  capacity: [
    { id: 'austin', rooms: '4 private rooms', cap: '260+ guests' },
    { id: 'leander', rooms: '6 private rooms', cap: '400+ guests' },
  ],
  packages: { austin: '/menus/austin-events-online.pdf', leander: '/menus/leander-events-package-online.pdf', holiday: '/menus/holiday-package2.pdf' },
};

const cheesecakeDesserts = ['NY Style Cheesecake', 'Key Lime Pie', 'Chocolate Mousse Cake', 'Tres Leches Cake'];
const takeoutRules = [
  'The regular à la carte takeout menu will still be available. No substitutions.',
  'Tax and handling fee are not included in the prices above.',
  'Also available for delivery through our partners Uber Eats, DoorDash and Grubhub.',
];

export const holidays: Holiday[] = [
  {
    slug: 'thanksgiving',
    name: 'Thanksgiving',
    short: 'Thanksgiving',
    dates: 'Thursday, November 26',
    start: '2026-11-26',
    h1: 'Thanksgiving at Estância',
    title: 'Thanksgiving Dinner in Austin & Leander',
    description: 'Thanksgiving churrasco $70 with turkey, sides and dessert, plus takeout packages. Open 10:30am–9pm on November 26. Reserve at Estância.',
    hero: '/img/w/edited_dsc09350-scaled.jpg',
    banner: '/img/w/happy-thanksgiving.jpg',
    intro: 'Skip the cooking and gather around the fire. On Thanksgiving Day we open early, from 10:30 am to 9:00 pm, with a traditional turkey spread alongside our unlimited prime meats.',
    days: [
      {
        iso: '2026-11-26',
        label: 'Thursday, November 26',
        title: 'Thanksgiving Day',
        slots: [
          {
            name: 'All day',
            time: '10:30 am – 9:00 pm',
            rows: [
              ['Churrasco Thanksgiving Special', '$70'],
              ['Traditional Thanksgiving Special', '$45'],
            ],
            note: 'The $70 special adds an entire traditional Thanksgiving spread to our regular unlimited meats, sides and salads: roasted turkey, Thanksgiving sides and your choice of pumpkin pie, chocolate cake or cheesecake. The $45 special includes roasted turkey, traditional Thanksgiving sides, our usual sides and the salad bar, without churrasco meats or dessert.',
          },
        ],
      },
    ],
    kids: ['Kids 0–2 years old: complimentary', 'Kids 3–5 years old: $5', 'Kids 6–12 years old: $31.50 (regular price, dessert not included)'],
    takeout: {
      title: 'Brazilian Thanksgiving Package',
      price: '$60 · $120',
      serves: 'Serves 2–3 ($60) · Serves 4–6 ($120)',
      window: 'Thursday, November 26',
      courses: [
        { heading: 'Starter', items: [{ name: 'Brazilian Cheese Bread' }, { name: 'Fried Bananas' }] },
        { heading: 'Meats', items: [{ name: 'Roasted Turkey' }, { name: 'Prime Picanha Steak' }] },
        { heading: 'Sides', items: [{ name: 'Garlic Mashed Potatoes' }, { name: 'Traditional Gravy' }, { name: 'Brazilian Stuffing' }, { name: 'Fresh Cranberry Sauce' }, { name: 'Roasted Brussels Sprouts' }] },
      ],
      extras: { heading: 'Add dessert', price: '$8 each', items: ['Pumpkin Pie', 'Chocolate Mousse Cake', 'NY Style Cheesecake'] },
      pickup: ['Thursday, November 26: 12:00 pm – 3:00 pm'],
      details: ['Orders can be placed up to 3 days in advance. A 60-minute lead time is required for all orders.', ...takeoutRules],
    },
    cardDays: 'Thanksgiving Day, Thursday, November 26',
    related: [
      { title: 'Black Friday', date: 'Friday, November 27', text: '$25 off two dinners and $15 off two lunches. Mention this promotion to claim your discount. One day only.' },
      { title: 'Cyber Monday', date: 'Monday, November 30', text: '25% off all takeout orders placed directly through the Estância takeout page. Pickup orders only; third-party delivery is excluded.' },
    ],
    faq: [
      { q: 'What are Estância’s Thanksgiving hours?', a: 'We are open on Thursday, November 26 from 10:30 am to 9:00 pm at both our Austin and Leander locations.' },
      { q: 'What is included in the $70 Thanksgiving special?', a: 'The Churrasco Thanksgiving Special includes our regular unlimited meats, sides and salad bar plus a traditional Thanksgiving spread with roasted turkey, Thanksgiving sides and a choice of pumpkin pie, chocolate cake or cheesecake.' },
      { q: 'Can I order Thanksgiving takeout?', a: 'Yes. The Brazilian Thanksgiving Package serves 2–3 for $60 or 4–6 for $120, with pickup on Thursday from 12 to 3 pm. Orders can be placed up to 3 days in advance.' },
    ],
  },
  {
    slug: 'christmas',
    name: 'Christmas',
    short: 'Christmas',
    dates: 'December 24 – 25',
    start: '2026-12-24',
    h1: 'Christmas at Estância',
    title: 'Christmas Eve & Day Dinner in Austin & Leander',
    description: 'Christmas Eve brunch and dinner, Christmas Day prix fixe $70 and a family takeout package. Book your table in Austin or Leander.',
    hero: '/img/w/take_out_christmas.jpg',
    banner: '/img/w/merry-christmas.jpg',
    badge: '/img/w/screenshot-2025-11-05-at-2.00.36-pm-1.png',
    intro: 'Celebrate Christmas around the fire with prime meats, a gourmet salad bar and authentic Brazilian sides, or bring the feast home with our family-style takeout package.',
    days: [
      {
        iso: '2026-12-24',
        label: 'Thursday, December 24',
        title: 'Christmas Eve',
        slots: [
          { name: 'Brunch', time: '11:00 am – 3:00 pm', rows: [['Full Churrasco + Brunch', '$45'], ['Brunch only', '$36']] },
          { name: 'Early dinner', time: '4:00 pm – 5:30 pm', rows: [['Full Churrasco', '$65'], ['Salad bar only', '$36']], note: 'Prime meats, gourmet salads, authentic sides and dessert.' },
          { name: 'Dinner', time: '6:00 pm – 10:30 pm', rows: [['Full Churrasco', '$70'], ['Salad bar only', '$36']], note: 'Prime meats, gourmet salads, authentic sides and dessert.' },
        ],
      },
      {
        iso: '2026-12-25',
        label: 'Friday, December 25',
        title: 'Christmas Day',
        slots: [
          { name: 'All day', time: '10:30 am – 9:00 pm', rows: [['Prix Fixe Christmas Day Churrasco Special', '$70'], ['Prix Fixe Christmas Day Salad Special', '$36']], note: 'The churrasco special includes prime meats, gourmet salads, authentic sides and dessert. The salad special includes gourmet salads, authentic sides and dessert.' },
        ],
      },
    ],
    kids: ['Kids 0–2 years old: complimentary', 'Kids 3–5 years old: $5', 'Kids 6–12 years old: half price'],
    takeout: {
      title: 'Christmas Family Style Package',
      price: '$55',
      serves: 'Serves 2',
      window: 'Thursday, December 24 – Friday, December 25',
      courses: [
        { heading: 'Starter', items: [{ name: 'Brazilian Cheese Bread', desc: 'Our heavenly homemade cheese bread.' }] },
        { heading: 'Meats', items: [{ name: 'Stuffed Pork Loin with Vegetables', desc: 'Tender and juicy pork loin stuffed with savory vegetables and fresh mozzarella, then roasted to perfection.' }, { name: 'Prime Picanha Steak', desc: 'Our signature cut of beef, the prime cut of top sirloin.' }, { name: 'Grilled Shrimp', desc: 'Succulent shrimp grilled to perfection and lightly seasoned.' }] },
        { heading: 'Sides', items: [{ name: 'Garlic Mashed Potatoes', desc: 'Classic and delicious mashed potatoes seasoned with garlic.' }, { name: 'Sautéed Vegetables', desc: 'A medley of asparagus and mushrooms, sautéed and served warm.' }, { name: 'Chimichurri', desc: 'Homemade chimichurri crafted with fresh herbs.' }] },
      ],
      extras: { heading: 'Add dessert (1 serving)', price: '$8 each', items: cheesecakeDesserts },
      pickup: ['Thursday, December 24: 11:00 am – 6:00 pm', 'Friday, December 25: 11:00 am – 4:00 pm'],
      details: takeoutRules,
    },
    cardDays: 'Thursday, December 24 and Friday, December 25',
    faq: [
      { q: 'What are the Christmas Eve and Christmas Day hours?', a: 'Christmas Eve: brunch 11 am – 3 pm, early dinner 4 – 5:30 pm and dinner 6 – 10:30 pm. Christmas Day: open all day from 10:30 am to 9 pm.' },
      { q: 'How much is Christmas dinner at Estância?', a: 'Christmas Eve full churrasco is $65 (4 – 5:30 pm) or $70 (6 – 10:30 pm), and Christmas Day prix fixe is $70. Salad bar only options are $36.' },
      { q: 'Is there a Christmas takeout option?', a: 'Yes, the Christmas Family Style Package serves 2 for $55 and is available December 24 and 25 with pickup 11 am – 6 pm on the 24th and 11 am – 4 pm on the 25th.' },
    ],
  },
  {
    slug: 'new-years',
    name: 'New Year’s',
    short: 'New Year’s',
    dates: 'December 31 – January 1',
    start: '2026-12-31',
    h1: 'New Year’s at Estância',
    title: 'New Year’s Eve Dinner in Austin & Leander',
    description: 'Ring in the New Year with churrasco, a midnight toast and a family takeout package. Reserve in Austin or Leander.',
    hero: '/img/w/ish_0658.jpg',
    banner: '/img/w/new-year2026.jpg',
    badge: '/img/w/screenshot-2025-11-05-at-2.00.50-pm-1.png',
    intro: 'Bring in the new year with a long, lingering dinner, extended hours and a complimentary glass of bubbles at midnight on New Year’s Eve.',
    days: [
      {
        iso: '2026-12-31',
        label: 'Thursday, December 31',
        title: 'New Year’s Eve',
        slots: [
          { name: 'Brunch', time: '11:00 am – 3:30 pm', rows: [['Full Churrasco + Brunch', '$45'], ['Brunch only', '$36']] },
          { name: 'Early dinner', time: '4:00 pm – 5:30 pm', rows: [['Full Churrasco', '$65'], ['Salad bar only', '$36']] },
          { name: 'Dinner', time: '6:00 pm – 11:00 pm', rows: [['Full Churrasco', '$75'], ['Salad bar only', '$36']], note: 'Extended hours and a complimentary glass of bubbles at midnight.' },
        ],
      },
      {
        iso: '2027-01-01',
        label: 'Friday, January 1',
        title: 'New Year’s Day',
        slots: [
          { name: 'Brunch', time: '11:00 am – 3:30 pm', rows: [['Full Churrasco + Brunch', '$45'], ['Brunch only', '$36']] },
          { name: 'Dinner', time: '4:00 pm – 9:00 pm', rows: [['Full Churrasco', '$63'], ['Salad bar only', '$36']] },
        ],
      },
    ],
    kids: ['Kids 0–2 years old: complimentary', 'Kids 3–5 years old: $5', 'Kids 6–12 years old: half price'],
    takeout: {
      title: 'New Year’s Family Style Package',
      price: '$55',
      serves: 'Serves 2',
      window: 'Thursday, December 31 – Friday, January 1',
      courses: [
        { heading: 'Starter', items: [{ name: 'Brazilian Cheese Bread', desc: 'Our heavenly homemade cheese bread.' }] },
        { heading: 'Meats', items: [{ name: 'Roasted Salmon', desc: 'Tender roasted salmon fillet. Fish is believed to be a lucky New Year’s food because it swims forward, representing progress.' }, { name: 'Prime Picanha Steak', desc: 'Our signature cut of beef, the prime cut of top sirloin.' }] },
        { heading: 'Sides', items: [{ name: 'Garlic Mashed Potatoes', desc: 'Classic mashed potatoes seasoned with garlic.' }, { name: 'Asparagus', desc: 'Steamed, fresh asparagus.' }, { name: 'Lentil Soup', desc: 'The star of the New Year’s dinner: lentils symbolize wealth and good fortune for the coming year.' }] },
      ],
      extras: { heading: 'Add on', price: 'See prices', items: ['Desserts, $8 each: NY Style Cheesecake, Key Lime Pie, Chocolate Mousse Cake, Tres Leches Cake', 'Celebration Wine, $36: 1 bottle of house sparkling wine'] },
      pickup: ['Pickup hours to be confirmed. Call your location.'],
      details: takeoutRules,
    },
    cardDays: 'dinner on Thursday, December 31 and Friday, January 1',
    faq: [
      { q: 'What are the New Year’s Eve hours?', a: 'On December 31 we serve brunch from 11 am to 3:30 pm and dinner from 4 pm to 11 pm, with extended hours and a complimentary glass of bubbles at midnight.' },
      { q: 'How much is New Year’s Eve dinner?', a: 'Full Churrasco is $65 from 4 to 5:30 pm and $75 from 6 to 11 pm. Salad bar only is $36. Brunch with churrasco is $45.' },
      { q: 'Are you open on New Year’s Day?', a: 'Yes, on Friday, January 1 we serve brunch 11 am – 3:30 pm and dinner 4 – 9 pm.' },
    ],
  },
];

export const endedHolidays = [
  {
    slug: 'easter',
    name: 'Easter',
    title: 'Easter Brunch & Dinner',
    description: 'Easter at Estância Brazilian Steakhouse: full churrasco and brunch menu all day. This year’s event has ended; see you next spring.',
    hero: '/img/w/screenshot-2026-03-17-at-3.06.27-pm.jpg',
    banner: '/img/w/screenshot-2026-03-17-at-3.06.27-pm.jpg',
    last: 'Easter Sunday, April 5, 2026',
    summary: ['11:00 am – 9:00 pm', 'Full Churrasco Experience $65', 'Salad Bar only $42', 'Brunch menu served all day: grilled salmon, fruit, pastries and desserts', 'Kids: 0–2 free · 3–5 $5 · 6–12 $32.50'],
    takeout: '4-course Easter package: $55 (serves 2) or $120 (serves 4–5), with picanha, grilled butter shrimp, sides and brigadeiro truffles.',
  },
  {
    slug: 'fathersday',
    name: 'Father’s Day',
    title: 'Father’s Day Dinner & Brunch',
    description: 'Father’s Day at Estância, dad’s favorite steakhouse. This year’s event has ended; see you next June.',
    hero: '/img/w/fathersdaytakeout.jpg',
    banner: '/img/w/card-fathers-day.png',
    last: 'Saturday, June 20 – Sunday, June 21, 2026',
    summary: ['Saturday, June 20: dinner 4:00 pm – 10:30 pm', 'Sunday, June 21: open all day, 10:30 am – 9:00 pm', 'Full Churrasco 3-course prix fixe $70 · Salad bar only $45', 'Kids: 0–2 free · 3–5 $5 · 6–12 $32.50'],
    takeout: 'Father’s Day at Home package: $55 (serves 2) with picanha, grilled butter shrimp, sides and an optional dessert.',
  },
];

export const holidayTopFaq = [
  { q: 'Is Estância open on Thanksgiving, Christmas and New Year’s?', a: 'Yes. We are open on Thanksgiving Day, Christmas Eve, Christmas Day, New Year’s Eve and New Year’s Day at both our Austin and Leander locations. See the schedule above for hours and prices.' },
  { q: 'Do I need a reservation for the holidays?', a: 'Reservations are highly recommended for every holiday date. You can book Austin or Leander on Resy.' },
  { q: 'Can I get holiday takeout?', a: 'Yes. Each holiday has a takeout package with pickup times, also available for delivery through Uber Eats, DoorDash and Grubhub.' },
  { q: 'How does the complimentary dining card work?', a: 'Dine with us on the holiday dates and receive one complimentary lunch or dinner card per table, redeemable for one complimentary meal with the purchase of a meal of equal value, Sunday – Thursday only, January 4 – March 25, 2027, while supplies last.' },
  { q: 'What is the holiday group dining offer?', a: 'Book a group of 12 or more in December: the host receives a $100 dining card for lunch parties or $150 for dinner parties, and every guest receives a $25 dining card.' },
];
