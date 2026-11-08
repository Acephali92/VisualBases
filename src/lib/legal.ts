/**
 * Legal notice (Impressum, § 5 DDG / § 18 Abs. 2 MStV) and the controller named in the privacy statement.
 *
 * TO BE FILLED IN BY THE PROJECT OWNERS before the launch (docs/IMPROVEMENT-ROADMAP.md, A2).
 * As long as a required field is empty, the Impressum page says so openly and `npm run launch:check` fails.
 */
/** contact address for hints by e-mail (also used by src/lib/github.ts); this module has no imports so that Node scripts can load it */
export const CONTACT = 'info@visualbases.org';

export interface Imprint {
  /** person or association responsible for the website (for an association: name, register court and number) */
  name: string;
  /** postal address that can be served (no P.O. box) */
  address: string[];
  /** fast electronic contact */
  email: string;
  /** for an association: who represents it (board) */
  representedBy?: string;
  /** responsible for the content according to § 18 Abs. 2 MStV (name and address) */
  responsibleForContent?: string;
  /** association register (court and number), if any */
  register?: string;
}

export const IMPRINT: Imprint = {
  name: '',
  address: [],
  email: CONTACT,
  representedBy: '',
  responsibleForContent: '',
  register: '',
};

/** required fields that are still empty */
export function missingImprintFields(i: Imprint = IMPRINT): string[] {
  const missing: string[] = [];
  if (!i.name.trim()) missing.push('name');
  if (!i.address.some((l) => l.trim())) missing.push('address');
  if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(i.email)) missing.push('email');
  if (!i.responsibleForContent?.trim()) missing.push('responsibleForContent');
  return missing;
}
