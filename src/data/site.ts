// Datos de negocio: en producción viven en Sanity (`location` / `siteSettings`). Ver docs/CONTENT-MODEL.md.
export type LocationId = 'austin' | 'leander';

export interface Room {
  name: string;
  kind: string;
  guests: string;
  image: string;
  link?: string;
}

export interface Location {
  id: LocationId;
  name: string;
  area: string;
  address: string;
  cityLine: string;
  phone: string;
  eventsPhone: string;
  eventsEmail: string;
  mapUrl: string;
  resy: string;
  tripleseat: string;
  image: string;
  hero: string;
  blurb: string;
  order: { label: string; url: string }[];
  rooms: Room[];
  reviews: string;
}

const TS = 'https://portal.tripleseat.com/direct_bookings/';

export const locations: Record<LocationId, Location> = {
  austin: {
    id: 'austin',
    name: 'Austin',
    area: 'Arboretum',
    address: '10000 Research Blvd, Suite B',
    cityLine: 'Austin, TX 78759',
    phone: '(512) 345-5600',
    eventsPhone: '(512) 237-7416',
    eventsEmail: 'events.austin@estancia.com',
    mapUrl: 'https://www.google.com/maps/search/?api=1&query=Est%C3%A2ncia+Brazilian+Steakhouse+10000+Research+Blvd+Austin+TX',
    resy: 'https://resy.com/cities/austin-tx/venues/estancia-brazilian-steakhouse',
    tripleseat: 'https://estanciabraziliansteakhouse.tripleseat.com/party_request/13606',
    image: '/img/w/arboretum-room-1.jpg',
    hero: '/img/w/dsc09664.jpg',
    blurb: 'The original Estância in the heart of the Arboretum, with five private rooms for up to 120 guests.',
    reviews: '4.8 · 12k+ reviews',
    order: [
      { label: 'Order direct (Toast)', url: 'https://www.toasttab.com/estancia-brazilian-steakhouse-10000-research-blvd-suite-b/v3/?mode=fulfillment' },
      { label: 'DoorDash', url: 'https://www.doordash.com/store/estancia-churrascaria-brazilian-steakhouse-(research-blvd)-austin-912522/' },
      { label: 'Uber Eats', url: 'https://www.ubereats.com/store/estancia-brazilian-steakhouse-research-blvd/RWa1uwC4QEy3adADi9GyZQ' },
      { label: 'Grubhub', url: 'https://www.grubhub.com/restaurant/estncia-brazilian-steakhouse-10000-research-blvd-suite-b-austin/2064302' },
    ],
    rooms: [
      { name: 'Estância Room', kind: 'Private dining', guests: '12 guests', image: '/img/w/dsc03865.jpg', link: TS + 'syrwqqeb7n2' },
      { name: 'Gaucho Room', kind: 'Private dining', guests: '40–50 guests', image: '/img/w/estancia-and-gaucho-room.jpg', link: TS + 'ty3aasw3d8ev1' },
      { name: 'Austin Room', kind: 'Private dining', guests: '20–40 guests', image: '/img/w/dsc07446.jpg', link: TS + 'w5pvzx7yz2' },
      { name: 'Arboretum Room', kind: 'Private dining', guests: '50–60 guests', image: '/img/w/arboretum-room-1.jpg', link: TS + 'xyr97b87z63' },
      { name: 'Arboretum & Gaucho', kind: 'Private dining', guests: '80–120 guests', image: '/img/w/dsc09630.jpg', link: TS + 'yenptphmtwb1' },
      { name: 'Large Party', kind: 'Non-private dining', guests: '12–40 guests', image: '/img/w/dscf3129.jpg', link: TS + 'zmqhay93qx5' },
    ],
  },
  leander: {
    id: 'leander',
    name: 'Leander',
    area: 'Crystal Village',
    address: '2132 Raider Way',
    cityLine: 'Leander, TX 78641',
    phone: '(512) 889-8000',
    eventsPhone: '(512) 276-8595',
    eventsEmail: 'events.leander@estancia.com',
    mapUrl: 'https://www.google.com/maps/search/?api=1&query=Est%C3%A2ncia+Brazilian+Steakhouse+2132+Raider+Way+Leander+TX',
    resy: 'https://resy.com/cities/leander-tx-tx/venues/estancia-brazilian-steakhouse-tx',
    tripleseat: 'https://estanciabraziliansteakhouse.tripleseat.com/party_request/44259',
    image: '/img/w/butterfly-room.jpg',
    hero: '/img/w/l1010398-scaled.jpg',
    blurb: 'Our newest home: a grand dining room, a lively bar and patio, and rooms for gatherings up to 250.',
    reviews: '4.8 · 10k+ reviews',
    order: [
      { label: 'Order direct (Toast)', url: 'https://order.toasttab.com/online/estancia-brazilian-steakhouse-leander-ntwff' },
      { label: 'DoorDash', url: 'https://www.doordash.com/store/39183061' },
      { label: 'Uber Eats', url: 'https://www.ubereats.com/store/estancia-brazilian-steak-house-leander/iZ0zc1SPWzO-KXDNr1Veag' },
      { label: 'Grubhub', url: 'https://www.grubhub.com/restaurant/estancia-brazilian-steakhouse-2132-raider-way--leander/13491640' },
    ],
    rooms: [
      { name: 'Leander Room', kind: 'Private dining', guests: '20 guests', image: '/img/w/l1010374.jpg' },
      { name: 'Northside Room', kind: 'Private dining', guests: '12 guests', image: '/img/w/l1010416.jpg' },
      { name: 'Butterfly Room', kind: 'Private dining', guests: '40 guests', image: '/img/w/butterfly-room.jpg' },
      { name: 'Family Room', kind: 'Private dining', guests: '30 guests', image: '/img/w/l1010479-scaled.jpg' },
      { name: 'Crystal Village', kind: 'Private dining', guests: '12 guests', image: '/img/w/l1010483-scaled.jpg' },
      { name: 'Sunset Room', kind: 'Semi-private dining', guests: '100 guests', image: '/img/w/l1010487-scaled.jpg' },
    ],
  },
};

export const hours = [
  { days: 'Monday – Thursday', lines: ['Lunch 11:00 am – 3:30 pm', 'Dinner 5:00 pm – 10:00 pm'] },
  { days: 'Friday', lines: ['Lunch 11:00 am – 3:30 pm', 'Dinner 5:00 pm – 10:30 pm'] },
  { days: 'Saturday', lines: ['11:00 am – 10:30 pm', 'Brunch 11:00 am – 3:30 pm'] },
  { days: 'Sunday', lines: ['11:00 am – 9:00 pm', 'Brunch 11:00 am – 3:30 pm'] },
];

/** Horarios estructurados (misma fuente que `hours`) para JSON-LD y el indicador «Open now». Ojo: cierra entre 3:30 y 5:00 pm de lunes a viernes. */
export const hoursSpec = [
  { days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday'], ranges: [['11:00', '15:30'], ['17:00', '22:00']] },
  { days: ['Friday'], ranges: [['11:00', '15:30'], ['17:00', '22:30']] },
  { days: ['Saturday'], ranges: [['11:00', '22:30']] },
  { days: ['Sunday'], ranges: [['11:00', '21:00']] },
];

export const social = [
  { label: 'Instagram', url: 'https://www.instagram.com/estanciabraziliansteakhouse/' },
  { label: 'Facebook', url: 'https://www.facebook.com/EstanciaBrazilianSteakhouse' },
  { label: 'TikTok', url: 'https://www.tiktok.com/@estanciasteak' },
  { label: 'YouTube', url: 'https://www.youtube.com/channel/UCq3ybDs5b8NsArulVESTa9A' },
];

export const giftCards = {
  buy: 'https://estancia.securetree.com/',
  balance: 'https://lookup.app.securetree.com/lookup/estancia',
};

export interface NavItem {
  label: string;
  href: string;
  children?: { label: string; href: string; note?: string }[];
}

export const nav: NavItem[] = [
  {
    label: 'Menu',
    href: '/menu/',
    children: [
      { label: 'Churrasco', href: '/menu/churrasco/', note: '15 fire-roasted cuts' },
      { label: 'Salad Bar', href: '/menu/salad-bar/', note: '40+ gourmet items' },
      { label: 'Sides', href: '/menu/sides/', note: 'Traditional Brazilian' },
      { label: 'Brunch', href: '/menu/brunch/', note: 'Sat & Sun' },
      { label: 'Bar', href: '/menu/bar/', note: 'Cocktails & happy hour' },
      { label: 'Dessert', href: '/menu/dessert/', note: 'Sweet endings' },
    ],
  },
  {
    label: 'Locations',
    href: '/locations/',
    children: [
      { label: 'Austin', href: '/austin/', note: '10000 Research Blvd' },
      { label: 'Leander', href: '/leander/', note: '2132 Raider Way' },
    ],
  },
  { label: 'Private Dining', href: '/private-dining/' },
  { label: 'Events & Specials', href: '/events/', children: [
      { label: 'Holidays', href: '/holidays/', note: 'Thanksgiving, Christmas, New Year’s' },
      { label: 'Events', href: '/events/', note: 'Tastings and special nights' },
      { label: 'Weekly Specials', href: '/specials/', note: 'Something every day' },
      { label: 'News', href: '/news/', note: 'Guides and stories' },
    ] },
  { label: 'Order', href: '/order/' },
  { label: 'Gift Cards', href: '/gift-cards/' },
];

export const footerLinks = [
  { label: 'News', href: '/news/' },
  { label: 'FAQ', href: '/faq/' },
  { label: 'Contact', href: '/contact/' },
  { label: 'Careers', href: '/careers/' },
  { label: 'Subscribe', href: '/subscribe/' },
];

export const legalLinks = [
  { label: 'Privacy', href: '/privacy/' },
  { label: 'Terms', href: '/terms/' },
  { label: 'Accessibility', href: '/accessibility/' },
  { label: 'Your Privacy Choices', href: '/privacy/#choices' },
];
