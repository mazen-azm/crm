// The rules in isolation. The integration suite proves a percent sign typed
// into the search box behaves; this proves the two things that make that work
// and the one ordering mistake that would quietly break it.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { ESCAPE_CHAR, digitsOf, escapeLike, phoneDigits } from './customers.rules.js';

test('a percent sign is escaped, so it means itself', () => {
  assert.equal(escapeLike('50% Ltd'), '50\\% Ltd');
});

test('an underscore is escaped too — it matches any single character otherwise', () => {
  // Untested until now, and the quieter of the two: without this, searching
  // for "a_b" also finds "axb", which looks like a match rather than a bug.
  assert.equal(escapeLike('a_b'), 'a\\_b');
});

test('a backslash is escaped first, or it would escape the escapes', () => {
  // Doing this in the other order turns '\' into '\\' after the wildcards are
  // already prefixed, and the prefix stops meaning what it meant.
  assert.equal(escapeLike('a\\b'), 'a\\\\b');
  assert.equal(escapeLike('\\%'), '\\\\\\%');
});

test('ordinary text passes through untouched', () => {
  assert.equal(escapeLike('Leila Mansour'), 'Leila Mansour');
  assert.equal(escapeLike('leila.mansour@example.com'), 'leila.mansour@example.com');
});

test('nothing is a string, not a crash', () => {
  assert.equal(escapeLike(undefined), '');
  assert.equal(escapeLike(null), '');
});

test('the escape character is the one the SQL declares', () => {
  // The repository interpolates this constant into ESCAPE '…'. If they ever
  // disagree the escaping silently stops working, and every result comes back
  // wrong in a way no error mentions.
  assert.equal(ESCAPE_CHAR, '\\');
});

test('digits are pulled out of however a number was written', () => {
  assert.equal(digitsOf('+20 2 5555 0177'), '20255550177');
  assert.equal(digitsOf('(415) 555-0142'), '4155550142');
});

test('a term with no digits skips the phone leg entirely', () => {
  assert.equal(phoneDigits('Leila'), null);
  assert.equal(phoneDigits(''), null);
  assert.equal(phoneDigits('555'), '555');
});
