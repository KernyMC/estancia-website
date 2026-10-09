// Textos legales y de consentimiento (borradores). Revisión pendiente: docs/PENDIENTES-LEGAL.md.
import { locations } from './site';

export const legalUpdated = 'October 8, 2026';
/** Correo de contacto para privacidad y términos. DATO FALTANTE: pedir un correo de privacidad al cliente. */
export const legalEmail = locations.austin.eventsEmail;

export const consent = {
  inquiry: 'By submitting, you agree to our Terms of Use and Privacy Policy. We’ll use your details only to respond to your event inquiry.',
  inquiryMarketing: 'Send me Estância news and offers by email. Unsubscribe anytime.',
  subscribe: 'By joining, you agree to receive marketing emails from Estância. Unsubscribe anytime. You must be 13 or older.',
  subscribeBirthday: 'Your birthday (month and day only) is used just to send you a birthday offer.',
  eeo: 'Estância is an equal opportunity employer. We do not discriminate on the basis of race, color, religion, sex, national origin, age, disability, genetic information, veteran status or any other protected status.',
  atWill: 'Submitting an application does not create an employment contract. Employment with Estância is at-will.',
  careers: 'Your application is used only for hiring and is not published. Please do not include sensitive information such as your Social Security number.',
};
