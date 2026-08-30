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

// The fields a ticket is made of, minus who it is for. Split out because the
// public intake has to refuse a malformed ticket BEFORE it resolves a customer
// — otherwise a request with a blank subject leaves a customer row behind and
// nothing else — and at that moment it has no customerId to check. The
// alternative was a second copy of these rules in the channels feature, or
// passing a placeholder id to a validator whose whole job is to refuse
// placeholders.
export function validateTicketFields({ subject, body, priority, categoryId }) {
  const fields = [];

  if (!present(subject) || subject.trim().length > MAX_SUBJECT) fields.push('subject');
  if (!present(body) || body.trim().length > MAX_BODY) fields.push('body');

  // undefined means "not stated" and takes the default. Anything else must be
  // one of the four.
  if (priority !== undefined && !PRIORITIES.includes(priority)) fields.push('priority');


  // Optional, but not optionally shaped: null means none, a string must be one.
  if (categoryId !== undefined && categoryId !== null && !present(categoryId)) fields.push('categoryId');

  return fields;
}

export function validateRaisedTicket({ customerId, ...rest }) {
  const fields = present(customerId) ? [] : ['customerId'];
  return [...fields, ...validateTicketFields(rest)];
}

// The desk is where a ticket comes from unless somebody says otherwise. It is
// this feature's default and not a list: which channel names are valid belongs
// to the channels feature, and a copy of that list here would be a second
// answer maintained by a different story (and an import verify-architecture
// refuses — a feature reaches another only through its index).
export const DESK_CHANNEL = 'desk';

export const normaliseRaisedTicket = ({ subject, body, priority, categoryId, channel }) => ({
  subject: subject.trim(),
  body: body.trim(),
  priority: priority ?? DEFAULT_PRIORITY,
  categoryId: categoryId ?? null,
  // Only the type is checked. A ticket's channel is provenance recorded by
  // whoever raised it, and the caller that knows the names is the one that
  // validated them before calling.
  channel: typeof channel === 'string' && channel.trim() !== '' ? channel.trim() : DESK_CHANNEL,
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

// The third BR-5 write's shape check.
//
// `null` is accepted and means no category — the column allows it and a ticket
// may legitimately have none. Everything else must be a present string, which
// refuses undefined, '' and non-strings alike.
//
// This began with a separate `categoryId === undefined` branch and a comment
// arguing that a missing field and an explicit null are different requests.
// They are — but `present` already refuses undefined, so the branch was dead
// code with an explanation attached, which is worse than neither. A mutation
// that deleted it changed no behaviour, which is how it was found.
export function validateCategoryChange({ categoryId, revision }) {
  const fields = [];
  if (categoryId !== null && !present(categoryId)) fields.push('categoryId');
  if (!Number.isInteger(revision) || revision < 1) fields.push('revision');
  return fields;
}

// T-7 asks a refusal to name what would have worked, which means the machine
// has to be data rather than a chain of ifs — you cannot list the legal moves
// from a branch you did not take.
//
// The brief pins five edges and leaves the rest, so this table is a decision:
//
//   new → open        T-2, the first public reply
//   new → resolved    T-3, in as many words — answered on the spot, closeable
//   resolved → reopened   T-5, a reply within the 14-day window
//   resolved → closed     T-6, automatically after 14 days
//   pending exists        S-4, time waiting on the customer is not counted
//
// The rest follow from those: pending is a pause in ordinary work, so it is
// reachable from and returns to open; reopened is a ticket that is being
// worked again, so it moves onward exactly as open does.
// T-5's window, in days. Named here beside the transitions table because it is
// the same kind of fact: a rule about when a move is legal, rather than a
// number some code picked.
//
// T-6 closes a resolved ticket after the same fourteen days, which is why the
// two are one number and not two — the moment reopening stops being possible
// is the moment the ticket closes itself.
export const REOPEN_WINDOW_DAYS = 14;

// A category has one field and one way to be wrong. The ceiling matches a
// ticket's subject: a category name is a label on a picker, and one longer
// than a subject line is a label nobody can read anyway.
export function validateCategoryName({ name }) {
  if (typeof name !== 'string') return ['name'];
  const trimmed = name.trim();
  if (trimmed === '' || trimmed.length > MAX_SUBJECT) return ['name'];
  return [];
}

// Stored trimmed, the way a note and a message are: "Billing " and "Billing"
// are one category, and the difference shows up later as two rows the unique
// index was supposed to prevent.
export const normaliseCategoryName = (name) => String(name).trim();

export const TRANSITIONS = Object.freeze({
  new: Object.freeze(['open', 'pending', 'resolved']),
  open: Object.freeze(['pending', 'resolved']),
  pending: Object.freeze(['open', 'resolved']),
  resolved: Object.freeze(['closed', 'reopened']),
  // closed is terminal, and this is the edge worth arguing about. T-5 gives
  // reopening a 14-day window and T-6 closes a resolved ticket after 14 days,
  // so by the time a ticket is closed that window has already passed. An edge
  // back out of closed would make the window unbounded, and a window that any
  // status change resets is not a window. Revisiting a closed ticket is a new
  // ticket, not a mutation of the old one.
  closed: Object.freeze([]),
  reopened: Object.freeze(['open', 'pending', 'resolved']),
});

// The table and the enum are two statements of one fact, so they are checked
// against each other at import rather than trusted to stay in step. A status
// added to STATUSES with no row here would otherwise fail as "nothing is
// legal" at run time, which reads like a product decision and is a typo.
{
  const missing = STATUSES.filter((s) => !Object.hasOwn(TRANSITIONS, s));
  const extra = Object.keys(TRANSITIONS).filter((s) => !STATUSES.includes(s));
  if (missing.length > 0 || extra.length > 0) {
    throw new Error(
      `TRANSITIONS and STATUSES disagree: missing ${missing}, unknown ${extra}`,
    );
  }
}

// Read through this rather than the map, so the service and the tests cannot
// disagree about what an unknown status means.
export function allowedFrom(status) {
  return TRANSITIONS[status] ?? [];
}

// A status change says which status, and which version of the ticket the
// caller was looking at — same two questions as an assignment, same reason.
export function validateStatusChange({ status, revision, note }) {
  const fields = [];
  if (!STATUSES.includes(status)) fields.push('status');
  if (!Number.isInteger(revision) || revision < 1) fields.push('revision');
  // T-4, and only T-4: resolving needs a note. The rule names resolving and no
  // other edge, so closing or reopening is left alone rather than tidied into
  // the same shape. `present` is the raise validator's test, so whitespace is
  // emptiness here for the same reason it is there.
  if (status === 'resolved' && !present(note)) fields.push('note');
  return fields;
}

// The categories a form offers. Sorted by name because that is the order a
// person reads a dropdown in; created_at is there because BR-4 asks a list to
// be sortable and seeding order is the only other order anyone would want.
export const CATEGORY_SORTS = ['name', 'created_at'];
export const DEFAULT_CATEGORY_SORT = 'name';

export function validateCategoryQuery({ q, sort }) {
  const fields = [];
  // A ceiling on the search term, for the reason every ceiling exists: an
  // unbounded LIKE pattern is a request the database cannot refuse.
  if (q !== undefined && (typeof q !== 'string' || q.length > 100)) fields.push('q');
  if (sort !== undefined && !CATEGORY_SORTS.includes(sort)) fields.push('sort');
  return fields;
}
