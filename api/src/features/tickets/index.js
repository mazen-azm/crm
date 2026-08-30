// The only way into this feature from outside it.
export { ticketsRouter } from './tickets.routes.js';
export { createTicketsService } from './tickets.service.js';
export { PRIORITIES, STATUSES, DEFAULT_PRIORITY } from './tickets.rules.js';
// The public intake refuses a malformed ticket before it resolves a customer,
// and needs this feature's rule to do it rather than a second copy of it. The
// door widens by one pure function; it does not learn a table.
export { validateTicketFields } from './tickets.rules.js';
