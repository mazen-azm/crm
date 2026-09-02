import { unprocessable } from '../../platform/http/errors.js';

// BR-4 applied where it belongs on an aggregate: the ceiling is on the INPUT.
// A report's body is a fixed size, so paging it means nothing; the thing that
// can be unbounded is the range it is asked about.
//
// A quarter, because that is the longest span an admin reads on one screen and
// the number has to be some number. It is a policy figure, not a rule, so it is
// named here rather than made configurable — a knob nobody has asked to turn is
// a knob with no argument behind its default.
export const MAX_WINDOW_DAYS = 92;

// Whether this runtime can read a clock in that zone.
//
// This was written first as `new Set(Intl.supportedValuesOf('timeZone')).has(tz)`,
// which is cheaper and reads better and is WRONG for the most obvious input
// anybody will send: `UTC` is not in that list — nor is `Etc/UTC` — while
// `Intl.DateTimeFormat` accepts it perfectly well. `supportedValuesOf` returns
// the canonical IANA zone names, and the fixed-offset aliases are not among
// them.
//
// So the check is "can Intl actually do it", which is the question being asked.
// The exception is caught once per request and is not a control flow anybody
// has to read past.
//
// An unknown zone is refused and never quietly treated as UTC (E-2,
// scripts/rules.txt line 28). A report confidently answering about the wrong
// day is worse than one that refuses, because nothing about it looks wrong.
export function isKnownTimeZone(timeZone) {
  if (typeof timeZone !== 'string' || timeZone === '') return false;
  try {
    new Intl.DateTimeFormat('en-CA', { timeZone });
    return true;
  } catch {
    return false;
  }
}

const DAY_MS = 24 * 60 * 60 * 1000;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// What the wall clock reads in `timeZone` at instant `ms`, as a UTC instant of
// the same wall-clock numbers. The difference between the two is the zone's
// offset at that moment.
//
// 'en-CA' because it formats as YYYY-MM-DD, and hour12: false because 'en-CA'
// otherwise returns 24 for midnight, which Date.UTC reads as the next day.
const wallClockAt = (ms, timeZone) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(new Date(ms));
  const at = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return Date.UTC(
    Number(at.year), Number(at.month) - 1, Number(at.day),
    Number(at.hour) % 24, Number(at.minute), Number(at.second),
  );
};

// The instant at which a given local day begins in a given zone.
//
// Two passes, and the second is not superstition. The offset AT MIDNIGHT UTC on
// a date is not always the offset AT MIDNIGHT LOCAL on that date: on the day a
// zone changes, they differ by an hour, and a single-pass subtraction lands
// sixty minutes into the wrong side of the boundary. So: guess, measure the
// offset where the guess landed, shift, then measure again where the shift
// landed and correct once more.
//
// This is also why an offset is not a zone and cannot be stored as one. A zone
// changes offset twice a year; a number does not.
function startOfLocalDay(day, timeZone) {
  const target = Date.parse(`${day}T00:00:00Z`);
  let guess = target;
  for (let pass = 0; pass < 2; pass += 1) {
    guess = target - (wallClockAt(guess, timeZone) - guess);
  }
  return guess;
}

// The calendar date after this one. Plain date arithmetic in UTC, where a day
// is always 86,400,000 ms — the zone has no say in what tomorrow's DATE is,
// only in when it begins.
function nextDay(day) {
  return new Date(Date.parse(`${day}T00:00:00Z`) + DAY_MS).toISOString().slice(0, 10);
}

// The local calendar date at an instant, in a zone.
const localDay = (ms, timeZone) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date(ms));

/**
 * The window a report was asked about, as two UTC instants.
 *
 * Storage stays UTC — every stamp in this database is
 * `new Date(now() * 1000).toISOString()`. The zone moves the boundary; it never
 * rewrites a row. That is the whole of BR-3 on the query side.
 *
 * The concrete case this exists for: a reader at UTC+3 asks for today at 01:30
 * their time. The ticket they are looking for is stored `22:30Z` on the
 * PREVIOUS UTC day. `date(created_at)` puts it in yesterday and the report is
 * missing their morning.
 *
 * Returns null when no `timeZone` was given — the parameter is optional and its
 * absence means the report answers as it always has, which is what keeps every
 * caller written before this story working.
 */
export function resolveReportWindow(query, { now }) {
  const timeZone = query?.timeZone;
  if (timeZone === undefined || timeZone === '') {
    // Absent means absent. A report with no window is the snapshot it was
    // before this parameter existed, and the document says so.
    if (query?.from !== undefined || query?.to !== undefined) {
      // A range without a zone is a range whose boundaries nobody can compute.
      throw unprocessable(['timeZone']);
    }
    return null;
  }
  if (!isKnownTimeZone(timeZone)) throw unprocessable(['timeZone']);

  const today = localDay(now() * 1000, timeZone);
  const from = query.from ?? today;
  const to = query.to ?? today;
  const wrong = [];
  if (typeof from !== 'string' || !ISO_DATE.test(from)) wrong.push('from');
  if (typeof to !== 'string' || !ISO_DATE.test(to)) wrong.push('to');
  if (wrong.length > 0) throw unprocessable(wrong);

  const start = startOfLocalDay(from, timeZone);
  // Exclusive: the instant the day AFTER `to` begins. An inclusive upper bound
  // on a timestamp would have to be the last millisecond of the day, and every
  // stamp here is a whole second, so `< next midnight` is both simpler and
  // exactly right.
  //
  // The day after is computed as a CALENDAR date and resolved through the same
  // two-pass boundary, not as `start of to + 24 hours`. That was the first
  // draft, and it is the very defect the two passes exist to avoid, put back
  // at the other end: on the day a zone springs forward the local day is 23
  // hours long, so adding a fixed 24 lands an hour into the next one and the
  // window silently swallows it.
  const end = startOfLocalDay(nextDay(to), timeZone);
  if (Number.isNaN(start) || Number.isNaN(end)) throw unprocessable(['from', 'to']);
  // Both edges, because neither of them is at fault on its own — the span is,
  // and a screen highlighting one of the two would be pointing at the wrong
  // control.
  if (end <= start) throw unprocessable(['from', 'to']);
  if (end - start > MAX_WINDOW_DAYS * DAY_MS) throw unprocessable(['from', 'to']);

  return {
    timeZone,
    from,
    to,
    startUtc: new Date(start).toISOString(),
    endUtc: new Date(end).toISOString(),
  };
}
