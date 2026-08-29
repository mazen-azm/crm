// Proves scripts/criteria/languages.md section LANGUAGES-3-WEB.
//
// These tests assert PROPERTIES the criteria name — the digit script, the
// presence of grouping, the year, English differing from Arabic — and never an
// exact formatted string. Two reasons, both of which have teeth:
//
//   ar-EG output embeds invisible RTL marks (U+200F), so an exact-match
//   assertion is unreadable in a diff and wrong in ways nobody can see.
//
//   ICU data moves between Node versions. A test pinned to today's wording is
//   a time bomb that fails on an upgrade for a reason that is not a defect.
//
// Do not "tighten" these into equality checks.
import { expect, test } from 'vitest';

import { formatDate, formatNumber, formatRelativeTime, localeTag, plural } from './format';

const ARABIC_INDIC = /[٠-٩]/;
const ARABIC_THOUSANDS = '٬';
const ANY_DIGIT = /[0-9٠-٩]/;

test('the locale tag is the one that makes digits follow the language', () => {
  // A fixed mapping, not formatter output — equality is the right assertion
  // here and only here.
  expect(localeTag('ar')).toBe('ar-EG');
  expect(localeTag('en')).toBe('en');
});

test('a number in Arabic is written in Arabic-Indic digits', () => {
  expect(formatNumber(1234567.89, 'ar')).toMatch(ARABIC_INDIC);
});

test('a number in Arabic is grouped, with the separator Arabic uses', () => {
  expect(formatNumber(1234567.89, 'ar')).toContain(ARABIC_THOUSANDS);
});

test('a number in English is written in Latin digits, grouped with commas', () => {
  const out = formatNumber(1234567.89, 'en');
  expect(out).toMatch(/^[0-9,.]+$/);
  expect(out).toContain(',');
});

test('the same number reads differently in each language', () => {
  expect(formatNumber(1234567.89, 'ar')).not.toBe(formatNumber(1234567.89, 'en'));
});

test('a date carries its year, in the digits of the language', () => {
  const stamped = '2026-08-28T12:00:00Z';
  expect(formatDate(stamped, 'en')).toContain('2026');
  expect(formatDate(stamped, 'ar')).toContain('٢٠٢٦');
});

test('a date reads differently in each language', () => {
  const stamped = '2026-08-28T12:00:00Z';
  expect(formatDate(stamped, 'ar')).not.toBe(formatDate(stamped, 'en'));
});

test('a caller that knows the zone can say so', () => {
  // The default is the browser's zone; the option is the escape for a caller
  // that already knows better.
  const utc = formatDate('2026-08-28T23:30:00Z', 'en', {
    dateStyle: 'medium',
    timeZone: 'UTC',
  });
  expect(utc).toContain('2026');
});

test('a duration is a sentence in the reader language, not a count', () => {
  const arabic = formatRelativeTime(-3, 'hour', 'ar');
  expect(arabic).toMatch(ARABIC_INDIC);
  expect(arabic.length).toBeGreaterThan(1);

  const english = formatRelativeTime(-3, 'hour', 'en');
  expect(english).not.toBe(arabic);
  expect(english).toMatch(/hour/);
});

test('numeric auto is in effect, so the near past gets a word', () => {
  // Asserting the absence of a digit proves the behaviour without pinning the
  // wording — "yesterday" is CLDR data like everything else here.
  expect(formatRelativeTime(-1, 'day', 'en')).not.toMatch(ANY_DIGIT);
  expect(formatRelativeTime(-1, 'day', 'ar')).not.toMatch(ANY_DIGIT);
});

test('a plain count still carries its number', () => {
  expect(formatRelativeTime(-9, 'day', 'en')).toMatch(ANY_DIGIT);
});


// "1 tickets" is what gluing a number to a fixed plural produces, and it was on
// the screen. English is the easy half: Arabic uses four categories at the
// sizes a list reaches, and Intl.PluralRules is what knows which.
const tickets = { one: 'ticket', two: 'tickets', few: 'tickets', many: 'tickets', other: 'tickets' };
const arabic = { one: 'تذكرة', two: 'تذكرتان', few: 'تذاكر', many: 'تذكرة', other: 'تذكرة' };

test('plural picks English singular and plural', () => {
  expect(plural(1, tickets, 'en')).toBe('ticket');
  expect(plural(0, tickets, 'en')).toBe('tickets');
  expect(plural(2, tickets, 'en')).toBe('tickets');
});

test('plural picks each category Arabic uses at these sizes', () => {
  expect(plural(1, arabic, 'ar')).toBe('تذكرة');
  expect(plural(2, arabic, 'ar')).toBe('تذكرتان');
  expect(plural(3, arabic, 'ar')).toBe('تذاكر');
  expect(plural(11, arabic, 'ar')).toBe('تذكرة');
});

test('plural falls back to other for a category the forms do not carry', () => {
  // `other` is the one category every locale defines, which is what makes it
  // a safe fallback rather than a guess.
  expect(plural(3, { other: 'tickets' }, 'ar')).toBe('tickets');
});
