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

// The sorts the queue names. Short on purpose: created_at is the only one any
// criterion needs, so adding another is a decision that needs its own argument.
// An unknown sort is refused rather than ignored — a queue in an order nobody
// asked for looks like data loss.
export const SORTS = Object.freeze(['created_at']);
export const DEFAULT_SORT = 'created_at';

// "unassigned", as a filter value. assignee_id IS NULL uses the partial index
// on assignee, so this is a filter the schema already supports. A reserved
// word rather than an id: assignee ids are UUIDs, so nothing can collide with
// it, and the alternative — a separate boolean parameter — would make
// "assigned to nobody" and "assigned to somebody" two different shapes of
// request for one question.
export const UNASSIGNED = 'none';

export function validateQueueQuery({ status, priority, assigneeId, categoryId, sort }) {
  const fields = [];
  if (status !== undefined && !STATUSES.includes(status)) fields.push('status');
  if (priority !== undefined && !PRIORITIES.includes(priority)) fields.push('priority');
  if (assigneeId !== undefined && assigneeId !== UNASSIGNED && !present(assigneeId)) fields.push('assigneeId');
  if (categoryId !== undefined && !present(categoryId)) fields.push('categoryId');
  if (sort !== undefined && !SORTS.includes(sort)) fields.push('sort');
  return fields;
}

// An assignment says who, and which version of the ticket the caller was
// looking at. Both are required: BR-5 is not optional for the writes it names,
// and a write with no revision is precisely the silent overwrite it forbids.
//
// assigneeId may be null — a ticket returning to nobody is an assignment, not
// a deletion — so `null` is a value here and `undefined` is a missing field.
export function validateAssignment({ assigneeId, revision }) {
  const fields = [];
  if (assigneeId !== null && !present(assigneeId)) fields.push('assigneeId');
  if (!Number.isInteger(revision) || revision < 1) fields.push('revision');
  return fields;
}
