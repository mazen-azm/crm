// A message has one field that can be wrong, and one way to be wrong: absent,
// nothing but space, or longer than a ticket's body may be.
//
// The ceiling is the tickets feature's MAX_BODY, restated here as a number
// rather than imported: importing it would be this feature reaching into
// another's rules, which verify-architecture refuses, and widening tickets'
// index for a constant would publish a number nothing else needs. The
// duplication is named so a reader knows the two are meant to agree.
const MAX_BODY = 10_000; // tickets.rules.js:18

export const KINDS = Object.freeze(['public', 'internal']);

export function validateMessage({ body }) {
  if (typeof body !== 'string') return ['body'];
  const trimmed = body.trim();
  if (trimmed === '' || trimmed.length > MAX_BODY) return ['body'];
  return [];
}

// Stored trimmed, the way a customer note is: " ok " and "ok" are the same
// message, and the difference only ever shows up as a puzzling diff later.
export const normaliseMessage = (body) => String(body).trim();
