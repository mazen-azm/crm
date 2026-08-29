// The queue a demonstration opens on.
//
// Every subject and body here was written, not generated. That is the fourth
// acceptance criterion and it is not decoration: this is the first screen
// anybody sees, and "Ticket 7" or a paragraph of lorem tells a reader they are
// looking at a fixture rather than at a support desk. These read like the
// traffic a small desk actually gets.
//
// Each fixture also carries HOW it got where it is: `walk` is the sequence of
// real moves the seeder replays through the service, so a resolved ticket was
// resolved rather than written down as resolved. `raisedHoursAgo` is what puts
// some of them past their promise — the clock is a parameter, and a ticket
// backdated after the fact never went through the machine.
//
// Between them the fixtures cover every status and every priority, leave some
// tickets unassigned, and leave some past their first-response and resolution
// targets. `seed-demo.test.js` asserts that coverage rather than trusting this
// comment, because a fixture list drifts and a comment does not notice.

export const demoTickets = [
  {
    customer: 'Leila Mansour',
    category: 'Billing',
    priority: 'urgent',
    raisedHoursAgo: 26,
    subject: 'Charged twice for the August invoice',
    body:
      'Invoice 4471 was paid on the 3rd and the same amount left the account again on the 5th. '
      + 'The bank shows both as settled. I need one of them back, and I need to know it will not happen in September.',
    // Nobody has touched it, and it is a day past a one-hour response promise:
    // this is the row an SLA screen exists to make impossible to miss.
    walk: [],
  },
  {
    customer: 'Marcus Bell',
    category: 'Account access',
    priority: 'high',
    raisedHoursAgo: 6,
    subject: 'Password reset email never arrives',
    body:
      'I have asked for a reset four times this morning. Nothing in the inbox and nothing in spam. '
      + 'Our IT says the domain accepts everything from you. I can still sign in on my phone, so it is only the email.',
    walk: [
      { move: 'assign', to: 'Omar Reilly' },
      { move: 'status', to: 'open' },
      { move: 'status', to: 'pending' },
    ],
  },
  {
    customer: 'Aiko Tanaka',
    category: 'Hardware',
    priority: 'high',
    raisedHoursAgo: 50,
    subject: 'Scanner arrived with a cracked lid',
    body:
      'The box was fine but the hinge on the lid is snapped. It scans if I hold it closed. '
      + 'I would rather have a replacement lid than send the whole unit back, if that is possible.',
    walk: [
      { move: 'assign', to: 'Sofía Martínez' },
      { move: 'status', to: 'open' },
    ],
  },
  {
    customer: 'Priya Raman',
    category: 'Onboarding',
    priority: 'normal',
    raisedHoursAgo: 30,
    subject: 'Two of my team cannot see the shared inbox',
    body:
      'Six of us were set up on Monday. Four can see the shared inbox and two cannot. '
      + 'The two who cannot are on the same plan as the rest as far as I can tell.',
    walk: [
      { move: 'assign', to: 'Kenji Watanabe' },
      { move: 'status', to: 'open' },
      { move: 'status', to: 'resolved', note: 'Both accounts were missing the inbox permission. Added, and they confirmed access.' },
    ],
  },
  {
    customer: 'Rafael Duarte',
    category: 'Bug report',
    priority: 'normal',
    raisedHoursAgo: 96,
    subject: 'Export produces an empty file when the date range crosses a month',
    body:
      'Exporting 25 July to 5 August gives a file with headers and no rows. '
      + 'Staying inside one month works. It is reproducible and I can send the exact ranges.',
    walk: [
      { move: 'assign', to: 'Amina Diallo' },
      { move: 'status', to: 'open' },
      { move: 'status', to: 'resolved', note: 'The range filter compared month and day separately. Fixed and released.' },
      { move: 'status', to: 'closed' },
    ],
  },
  {
    customer: 'Ingrid Larsen',
    category: 'Feature request',
    priority: 'low',
    raisedHoursAgo: 120,
    subject: 'Let me filter the queue by the person a ticket is waiting on',
    body:
      'We often want the list of tickets waiting on the customer rather than on us. '
      + 'Today that means opening each one. It would save the morning stand-up ten minutes.',
    walk: [
      { move: 'assign', to: 'Tomáš Novák' },
      { move: 'status', to: 'open' },
      { move: 'status', to: 'resolved', note: 'Shipped in the queue filters. Told Ingrid where it is.' },
      { move: 'status', to: 'reopened' },
    ],
  },
  {
    customer: 'Walk-in counter',
    category: null,
    priority: 'low',
    raisedHoursAgo: 3,
    subject: 'Somebody left a laptop at the front desk',
    body:
      'A black laptop with a red sticker was handed in this morning. No name on it. '
      + 'Holding it at reception until somebody asks. Raising this so it is written down somewhere.',
    // No category on purpose: the column is nullable and a ticket taken at a
    // counter often has nowhere obvious to file it. It is also unassigned, so
    // the queue's "unassigned" filter has more than one row to find.
    walk: [],
  },
];
