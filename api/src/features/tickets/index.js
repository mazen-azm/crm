// The only way into this feature from outside it.
export { ticketsRouter } from './tickets.routes.js';
export { createTicketsService } from './tickets.service.js';
export { PRIORITIES, STATUSES, DEFAULT_PRIORITY } from './tickets.rules.js';
// T-5's window, in days. The conversation feature's reply reopens a resolved
// ticket inside it, so the number is a fact that feature reasons about — and
// reasoning about it from a copy would be two answers to when a resolution
// becomes final. The rule that USES it stays here; only the number leaves.
export { REOPEN_WINDOW_DAYS } from './tickets.rules.js';
// The public intake refuses a malformed ticket before it resolves a customer,
// and needs this feature's rule to do it rather than a second copy of it. The
// door widens by one pure function; it does not learn a table.
export { validateTicketFields } from './tickets.rules.js';
