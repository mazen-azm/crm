// A search term is text a person typed. Nothing here validates it into
// submission: an empty term means "list them all", which the criteria ask for,
// and there is no shape a term can be wrong.
//
// What is worth deriving is the digits, because a phone number stored as
// '+20 100 123 4567' has to be findable by somebody typing '1001234567'.
// Measured on this SQLite: without stripping, it is not.
const NOT_A_DIGIT = /\D+/g;

export const digitsOf = (term) => String(term ?? '').replace(NOT_A_DIGIT, '');

// A term with no digit in it cannot match a phone number, so the phone leg is
// skipped rather than run against every row for nothing.
export const phoneDigits = (term) => {
  const digits = digitsOf(term);
  return digits === '' ? null : digits;
};

// LIKE has two wildcards of its own, and a person typing them means them
// literally: somebody searching for a customer called "50% Ltd" should not get
// everybody. Binding the value stops SQL injection; it does not stop LIKE from
// reading % and _ as wildcards, so they are escaped and the statement declares
// the escape character.
//
// Backslash first, or escaping the others would escape its escapes.
export const ESCAPE_CHAR = '\\';
export const escapeLike = (term) =>
  String(term ?? '').replace(/\\/g, '\\\\').replace(/[%_]/g, (c) => `\\${c}`);

// A note has one field and one way to be wrong: absent, or nothing but space.
// The name of the field travels in the 422; the value never does.
export function validateNote({ body }) {
  if (typeof body !== 'string' || body.trim() === '') return ['body'];
  return [];
}

// Stored trimmed. A note that is " ok " and a note that is "ok" are the same
// note, and the difference only ever shows up as a puzzling diff later.
export const normaliseNote = (body) => String(body).trim();
