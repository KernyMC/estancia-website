/**
 * Dial codes for the phone-number country picker (BookingForm, CartDrawer
 * checkout). `iso` is the 2-letter code used to fetch a real flag icon from
 * flagcdn.com — native <option> elements can't render images, so both call
 * sites use a custom listbox instead of a plain <select>.
 */
export interface CountryCode {
  name: string;
  dial: string;
  iso: string;
}

export const countryCodes: CountryCode[] = [
  { name: 'Ecuador', dial: '+593', iso: 'ec' },
  { name: 'United States / Canada', dial: '+1', iso: 'us' },
  { name: 'United Kingdom', dial: '+44', iso: 'gb' },
  { name: 'Spain', dial: '+34', iso: 'es' },
  { name: 'Germany', dial: '+49', iso: 'de' },
  { name: 'France', dial: '+33', iso: 'fr' },
  { name: 'Italy', dial: '+39', iso: 'it' },
  { name: 'Netherlands', dial: '+31', iso: 'nl' },
  { name: 'Belgium', dial: '+32', iso: 'be' },
  { name: 'Switzerland', dial: '+41', iso: 'ch' },
  { name: 'Portugal', dial: '+351', iso: 'pt' },
  { name: 'Ireland', dial: '+353', iso: 'ie' },
  { name: 'Sweden', dial: '+46', iso: 'se' },
  { name: 'Norway', dial: '+47', iso: 'no' },
  { name: 'Denmark', dial: '+45', iso: 'dk' },
  { name: 'Finland', dial: '+358', iso: 'fi' },
  { name: 'Austria', dial: '+43', iso: 'at' },
  { name: 'Poland', dial: '+48', iso: 'pl' },
  { name: 'Mexico', dial: '+52', iso: 'mx' },
  { name: 'Colombia', dial: '+57', iso: 'co' },
  { name: 'Peru', dial: '+51', iso: 'pe' },
  { name: 'Argentina', dial: '+54', iso: 'ar' },
  { name: 'Brazil', dial: '+55', iso: 'br' },
  { name: 'Chile', dial: '+56', iso: 'cl' },
  { name: 'Venezuela', dial: '+58', iso: 've' },
  { name: 'Bolivia', dial: '+591', iso: 'bo' },
  { name: 'Paraguay', dial: '+595', iso: 'py' },
  { name: 'Uruguay', dial: '+598', iso: 'uy' },
  { name: 'Costa Rica', dial: '+506', iso: 'cr' },
  { name: 'Panama', dial: '+507', iso: 'pa' },
  { name: 'Guatemala', dial: '+502', iso: 'gt' },
  { name: 'Australia', dial: '+61', iso: 'au' },
  { name: 'New Zealand', dial: '+64', iso: 'nz' },
  { name: 'Japan', dial: '+81', iso: 'jp' },
  { name: 'South Korea', dial: '+82', iso: 'kr' },
  { name: 'China', dial: '+86', iso: 'cn' },
  { name: 'India', dial: '+91', iso: 'in' },
  { name: 'South Africa', dial: '+27', iso: 'za' },
  { name: 'Israel', dial: '+972', iso: 'il' },
  { name: 'United Arab Emirates', dial: '+971', iso: 'ae' },
  { name: 'Russia', dial: '+7', iso: 'ru' },
  { name: 'Turkey', dial: '+90', iso: 'tr' },
  { name: 'Greece', dial: '+30', iso: 'gr' },
  { name: 'Czech Republic', dial: '+420', iso: 'cz' },
  { name: 'Hungary', dial: '+36', iso: 'hu' },
  { name: 'Romania', dial: '+40', iso: 'ro' },
];

// Ecuador stays first in the list (this is an Ecuador-based operator), but
// most guests booking are from the US, so that's the better pre-selected
// default rather than the list's first entry.
export const defaultCountry = countryCodes.find((c) => c.name === 'United States / Canada')!;
