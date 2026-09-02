// Proves the label half of scripts/criteria/reports.md section REPORTS-4-WEB.
import { expect, test } from 'vitest';

import { renderWithProviders, screen } from '../../testing/render';
import { en } from '../../shared/i18n/en';
import { ar } from '../../shared/i18n/ar';
import { PeriodSentence } from './period-sentence';

const CAIRO_TODAY = {
  timeZone: 'Africa/Cairo',
  from: '2026-09-03',
  to: '2026-09-03',
  startUtc: '2026-09-02T21:00:00.000Z',
  endUtc: '2026-09-03T21:00:00.000Z',
};

test('a snapshot has no period, so it says nothing', () => {
  const { container } = renderWithProviders(<PeriodSentence window={null} />, { signedIn: true });
  // Null is the ordinary answer when nothing was asked for. A label over a
  // snapshot would be a period that does not exist.
  expect(container.textContent).toBe('');
});

test('a one-day window names the day and the zone it was read in', () => {
  const { container } = renderWithProviders(<PeriodSentence window={CAIRO_TODAY} />, { signedIn: true });

  expect(container.textContent).toContain('Africa/Cairo');
  // 21:00Z on the 2nd is the 3rd in Cairo — the label names the reader's day,
  // not the UTC one the instant falls in.
  expect(container.textContent).toContain('Sep 3, 2026');
  expect(container.textContent).toContain(en.reportPeriod.oneDay);
});

test('a range names its last day, not the instant after it', () => {
  renderWithProviders(
    <PeriodSentence window={{ ...CAIRO_TODAY, from: '2026-08-28', to: '2026-09-03', startUtc: '2026-08-27T21:00:00.000Z' }} />,
    { signedIn: true },
  );

  // The end instant is the start of the day AFTER the last one included, so a
  // label built from it directly would name a day the report does not cover.
  expect(screen.getByText('Sep 3, 2026')).toBeInTheDocument();
  expect(screen.queryByText('Sep 4, 2026')).not.toBeInTheDocument();
});

test('the day is the one the REPORT\'s zone is in, not the one the browser is in', () => {
  // 21:00Z on 2 September is 17:00 the same day in New York and past midnight
  // in this runner's own zone. Formatted in the browser's zone the label would
  // name the 3rd, three words away from a sentence saying it was read in New
  // York — a label arguing with itself.
  const { container } = renderWithProviders(
    <PeriodSentence window={{
      timeZone: 'America/New_York',
      from: '2026-09-02', to: '2026-09-02',
      startUtc: '2026-09-02T21:00:00.000Z', endUtc: '2026-09-03T04:00:00.000Z',
    }} />,
    { signedIn: true },
  );

  expect(container.textContent).toContain('Sep 2, 2026');
  expect(container.textContent).toContain('America/New_York');
});

test('the dates and the zone are isolated, so Arabic does not reorder them', () => {
  const { container } = renderWithProviders(<PeriodSentence window={CAIRO_TODAY} />, {
    signedIn: true, language: 'ar',
  });

  expect(container.textContent).toContain(ar.reportPeriod.zoneLabel);
  // A zone id is a left-to-right run with a slash in it. Without the isolate
  // the bidi algorithm takes the punctuation around it as part of the run and
  // moves it (L-51).
  const isolates = container.querySelectorAll('[dir], bdi');
  expect(isolates.length).toBeGreaterThanOrEqual(2);
});
