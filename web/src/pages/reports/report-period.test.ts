// Proves the period half of scripts/criteria/reports.md section REPORTS-4-WEB.
import { expect, test } from 'vitest';

import { buildPeriod, periodQuery } from './report-period';

const NOON = Date.parse('2026-09-02T12:00:00Z');

test('everything asks with no zone at all, which is how the API says "no window"', () => {
  // The request every caller written before this story made. Sending a zone
  // here would make the report about a day, and a day is not what this preset
  // means — "the queue by status" is the queue.
  expect(periodQuery(buildPeriod('all', 'Africa/Cairo', NOON), 'Africa/Cairo')).toBe('');
});

test('today sends the zone and no dates, so the API\'s own clock picks the day', () => {
  const query = periodQuery(buildPeriod('today', 'Africa/Cairo', NOON), 'Africa/Cairo');

  expect(query).toBe('?timeZone=Africa%2FCairo');
  // Two clocks deciding one thing is how a label and its numbers come to
  // disagree.
  expect(query).not.toContain('from=');
});

test('the last seven days includes today, so it reaches six days back', () => {
  const period = buildPeriod('last7', 'Africa/Cairo', NOON);

  expect(period.to).toBe('2026-09-02');
  expect(period.from).toBe('2026-08-27');
  // Off by one in either direction is exactly the kind of thing a later reader
  // silently corrects, which is why it is asserted rather than assumed.
  const span = (Date.parse(period.to!) - Date.parse(period.from!)) / 86_400_000;
  expect(span).toBe(6);
});

test('the last thirty reach twenty-nine days back, for the same reason', () => {
  const period = buildPeriod('last30', 'Africa/Cairo', NOON);
  const span = (Date.parse(period.to!) - Date.parse(period.from!)) / 86_400_000;
  expect(span).toBe(29);
});

test('the dates are the reader\'s calendar days, not UTC\'s', () => {
  // 22:30Z on the 2nd is already 01:30 on the 3rd in Cairo.
  const late = Date.parse('2026-09-02T22:30:00Z');

  expect(buildPeriod('last7', 'Africa/Cairo', late).to).toBe('2026-09-03');
  expect(buildPeriod('last7', 'America/New_York', late).to).toBe('2026-09-02');
});

test('an unknown zone is passed through, because deciding that is the API\'s job', () => {
  // A client with its own opinion about which zones exist would be a second
  // answer to a question the API already answers with a 422 naming the field.
  expect(periodQuery({ key: 'today' }, 'Middle/Earth')).toBe('?timeZone=Middle%2FEarth');
});
