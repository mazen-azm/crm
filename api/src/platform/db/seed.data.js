// Written, not generated. "Customer 37" fills the same screen as a real name
// and demonstrates nothing — and a queue of identical rows hides every layout
// bug a real one would show.
//
// Only staff[0] is the admin whose password is generated and printed. The
// others get a random password that is hashed and thrown away: the schema
// stays honest without a known credential sitting in a repository.

export const staff = [
  { email: 'admin@support-desk.local', name: 'Nadia Haddad', role: 'admin' },
  { email: 'omar.reilly@support-desk.local', name: 'Omar Reilly', role: 'agent' },
  { email: 'sofia.martinez@support-desk.local', name: 'Sofía Martínez', role: 'agent' },
  { email: 'kenji.watanabe@support-desk.local', name: 'Kenji Watanabe', role: 'agent' },
  { email: 'amina.diallo@support-desk.local', name: 'Amina Diallo', role: 'agent' },
  { email: 'tomas.novak@support-desk.local', name: 'Tomáš Novák', role: 'agent' },
  { email: 'grace.okafor@support-desk.local', name: 'Grace Okafor', role: 'admin' },
];

// The row with no email carries a fixed id: a null email cannot be a conflict
// arbiter (the unique index is partial on email IS NOT NULL), so identity is
// the only thing that keeps a second run from duplicating it.
export const customers = [
  { name: 'Aiko Tanaka', email: 'aiko.tanaka@example.com', phone: '+81 3 5555 0111', address: '2-1-1 Nihonbashi, Chuo, Tokyo' },
  { name: 'Marcus Bell', email: 'Marcus.Bell@Example.com', phone: '+1 415 555 0142', address: '1200 Harrison St, San Francisco, CA' },
  { name: 'Leila Mansour', email: 'leila.mansour@example.com', phone: '+20 2 5555 0177', address: '14 Sharia El Nasr, Nasr City, Cairo' },
  { name: 'Ingrid Larsen', email: 'ingrid.larsen@example.com', phone: '+47 22 555 019', address: 'Storgata 42, 0182 Oslo' },
  { name: 'Rafael Duarte', email: 'rafael.duarte@example.com', phone: '+55 11 5555 0163', address: 'Rua Augusta 901, São Paulo' },
  { name: 'Priya Raman', email: 'priya.raman@example.com', phone: '+91 80 5555 0188', address: '7 Church Street, Bengaluru' },
  { name: 'Walk-in counter', email: null, phone: '+44 20 5555 0100', address: 'Front desk, 3 Bishopsgate, London', id: 'seed-customer-walk-in' },
];

export const categories = [
  { name: 'Billing' },
  { name: 'Account access' },
  { name: 'Bug report' },
  { name: 'Feature request' },
  { name: 'Hardware' },
  { name: 'Onboarding' },
];

// Minutes. Urgent is answered inside a coffee break; low is answered inside a
// working day, and resolved inside a working week.
// The promise, in minutes, exactly as rule S-2 states it:
//   urgent 1h/4h · high 4h/24h · normal 8h/72h · low 24h/168h
//
// These are not free numbers. S-2 is a requirement derived from the product
// brief, and "fixed by the seed, by decision" means there is no admin screen
// for them — not that whatever the seed happens to contain becomes the
// promise. They disagreed until 2026-08-29, on all four priorities, because
// this file was written a day after the rule and nobody compared the two.
// scripts/verify-backlog.mjs now does.
export const slaTargets = [
  { priority: 'low', first_response_minutes: 24 * 60, resolution_minutes: 168 * 60 },
  { priority: 'normal', first_response_minutes: 8 * 60, resolution_minutes: 72 * 60 },
  { priority: 'high', first_response_minutes: 4 * 60, resolution_minutes: 24 * 60 },
  { priority: 'urgent', first_response_minutes: 1 * 60, resolution_minutes: 4 * 60 },
];
