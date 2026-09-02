// The periods a report screen offers. No calendar and no date library: three
// presets answer the questions an admin actually asks, and a free-form range
// is a control nobody has asked for.
// `all` first, and it is the default, because it is what these two screens
// meant before this story: the queue by status is the QUEUE, and the share of
// promises kept is the desk's record. Defaulting to today would have quietly
// turned "the queue by status" into "raised today, by status" — the same
// numbers rendered by the same page, answering a different question.
export const PERIODS = ['all', 'today', 'last7', 'last30'] as const;
export type PeriodKey = (typeof PERIODS)[number];

export type Period = { key: PeriodKey; from?: string; to?: string };

// Six and twenty-nine, not seven and thirty, and the difference is deliberate:
// "the last seven days" includes today, so it reaches six days back. Written
// down because it is exactly the kind of off-by-one a later reader silently
// corrects.
const DAYS_BACK: Record<PeriodKey, number | null> = { all: null, today: null, last7: 6, last30: 29 };

const DAY_MS = 24 * 60 * 60 * 1000;

// The calendar date at an instant, in a zone. 'en-CA' formats as YYYY-MM-DD.
const dayInZone = (ms: number, timeZone: string) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date(ms));

export function buildPeriod(key: PeriodKey, timeZone: string, nowMs = Date.now()): Period {
  const back = DAYS_BACK[key];
  // `today` sends no dates at all: the API's own clock decides which day that
  // is, and asking it to agree with the browser's would be two clocks deciding
  // one thing. `all` sends nothing whatever, not even a zone — see below.
  if (back === null) return { key };
  return {
    key,
    from: dayInZone(nowMs - back * DAY_MS, timeZone),
    to: dayInZone(nowMs, timeZone),
  };
}

// The query a report is asked with. The zone always travels; the dates only
// when the preset has them. Validation is the API's — an unknown zone comes
// back as a 422 naming the field, and the client inventing its own opinion
// about which zones exist would be a second answer to that.
export function periodQuery({ key, from, to }: Period, timeZone: string): string {
  // `all` asks with no zone at all, which is how the API says "no window":
  // sending one would make the report about a day, and a day is not what this
  // preset means. It is also exactly the request every caller written before
  // this story made, so the answer does not move under them.
  if (key === 'all') return '';
  const params = new URLSearchParams({ timeZone });
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  return `?${params.toString()}`;
}
