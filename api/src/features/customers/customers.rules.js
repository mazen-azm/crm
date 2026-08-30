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

// A shape test, not a validation of deliverability — nothing here can know
// whether an address accepts mail, and a regex that pretends to is a regex
// that rejects somebody's real address. One @, something either side, and a
// dot in the domain. Kept local for the reason escapeLike is: a dependency for
// four lines is a dependency to keep up to date.
const EMAIL_SHAPE = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

// A customer needs a name. Everything else is optional, because somebody who
// telephones may have neither an address nor a number worth keeping, and a
// desk still needs them on file.
//
// Absent and blank are the same thing here: '' is not an email address and not
// a phone number, and normaliseCustomer collapses both to null so the partial
// unique index on email keeps meaning "one live customer per address".
export function validateCustomer({ name, email, phone }) {
  const fields = [];
  if (typeof name !== 'string' || name.trim() === '') fields.push('name');
  // Trimmed before the emptiness test, not after: '' was accepted and '   '
  // was refused as malformed, which are the same thing typed differently.
  // normaliseCustomer collapses both to null, so the validator has to agree
  // with it or a form that pads a blank field gets a 422 nobody can act on.
  const address = typeof email === 'string' ? email.trim() : email;
  if (address !== undefined && address !== null && address !== '' && !EMAIL_SHAPE.test(address)) {
    fields.push('email');
  }
  if (phone !== undefined && phone !== null && typeof phone !== 'string') fields.push('phone');
  return fields;
}

// Resolution requires an address, because the address is the key it resolves by
// (I-4). validateCustomer above deliberately accepts a customer with no email —
// "somebody who telephones may not have one" — so the two rules disagree on
// purpose, and one shared validator would have to pick a meaning and betray the
// other caller.
//
// The name is checked here too, and only for its type. Resolution takes a name
// from whoever is on the other end of a public form, so it may be absent — but
// a number or an object arriving where a string was assumed reaches
// normaliseCustomer's .trim() and becomes a 500 that says the caller's bad
// input was our fault. The same reasoning the category check in tickets records.
export function validateResolveInput({ email, name }) {
  const fields = [];
  const address = typeof email === 'string' ? email.trim() : email;
  if (typeof address !== 'string' || address === '' || !EMAIL_SHAPE.test(address)) {
    fields.push('email');
  }
  if (name !== undefined && name !== null && typeof name !== 'string') fields.push('name');
  return fields;
}

export const normaliseCustomer = ({ name, email, phone }) => {
  const orNull = (value) => {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    return trimmed === '' ? null : trimmed;
  };
  return { name: name.trim(), email: orNull(email), phone: orNull(phone) };
};
