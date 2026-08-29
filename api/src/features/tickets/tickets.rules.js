// T-1's enumerations, spelled once. The column is TEXT with no CHECK — the
// schema says so at 0002__tickets.sql:16 — so this file is the enforcement.
export const STATUSES = Object.freeze(['new', 'open', 'pending', 'resolved', 'closed', 'reopened']);
export const PRIORITIES = Object.freeze(['low', 'normal', 'high', 'urgent']);

// A ticket raised with nothing said about urgency is a normal ticket. Requiring
// the field would force a channel — a form a customer fills in — to invent an
// urgency it cannot know. But a *stated* value outside the four is refused, not
// quietly corrected: absent and wrong are different, and only one of them is
// somebody's mistake.
export const DEFAULT_PRIORITY = 'normal';

const present = (value) => typeof value === 'string' && value.trim() !== '';

// Long enough for a real subject and a real description, short enough that the
// column is not a place to paste a log file.
const MAX_SUBJECT = 200;
const MAX_BODY = 10_000;

export function validateRaisedTicket({ customerId, subject, body, priority, categoryId }) {
  const fields = [];

  if (!present(customerId)) fields.push('customerId');
  if (!present(subject) || subject.trim().length > MAX_SUBJECT) fields.push('subject');
  if (!present(body) || body.trim().length > MAX_BODY) fields.push('body');

  // undefined means "not stated" and takes the default. Anything else must be
  // one of the four.
  if (priority !== undefined && !PRIORITIES.includes(priority)) fields.push('priority');


  // Optional, but not optionally shaped: null means none, a string must be one.
  if (categoryId !== undefined && categoryId !== null && !present(categoryId)) fields.push('categoryId');

  return fields;
}

export const normaliseRaisedTicket = ({ subject, body, priority, categoryId }) => ({
  subject: subject.trim(),
  body: body.trim(),
  priority: priority ?? DEFAULT_PRIORITY,
  categoryId: categoryId ?? null,
});
