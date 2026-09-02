// Proves scripts/criteria/reports.md section REPORTS-1-WEB.
import { afterEach, expect, test, vi } from 'vitest';

import { renderWithProviders, screen, userEvent, waitFor, within } from '../../testing/render';
import { AppRoutes } from '../../app/routes';
import { en } from '../../shared/i18n/en';
import { ar } from '../../shared/i18n/ar';

const json = (body: unknown, status = 200) => () =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const COUNTS = (over: Record<string, number> = {}) => ({
  new: 3, open: 12, pending: 0, resolved: 5, closed: 104, reopened: 0, ...over,
});

// The stub echoes a window when a zone is asked for, exactly as the API does —
// that echo is what the screen's period label is read from, so a stub that
// dropped it would be testing a screen the API never talks to.
const windowFor = (url: URL) => {
  const timeZone = url.searchParams.get('timeZone');
  if (!timeZone) return null;
  return {
    timeZone,
    from: url.searchParams.get('from') ?? '2026-09-03',
    to: url.searchParams.get('to') ?? '2026-09-03',
    startUtc: '2026-09-02T21:00:00.000Z',
    endUtc: '2026-09-03T21:00:00.000Z',
  };
};

function desk({ role = 'admin', answer }: { role?: string; answer?: () => Response } = {}) {
  const asked: string[] = [];
  const fetch = vi.fn((input: RequestInfo | URL) => {
    const url = new URL(String(input), 'http://desk.test');
    if (url.pathname === '/api/v1/me') {
      return Promise.resolve(json({ id: 'u-1', role, name: 'Nadia Haddad' })());
    }
    if (url.pathname === '/api/v1/reports/queue-by-status') {
      asked.push(url.search);
      const counts = COUNTS();
      const total = Object.values(counts).reduce((a, b) => a + b, 0);
      return Promise.resolve((answer ?? json({ counts, total, window: windowFor(url) }))());
    }
    throw new Error(`this screen must not call ${url.pathname}`);
  });
  vi.stubGlobal('fetch', fetch);
  return { fetch, asked };
}

afterEach(() => vi.unstubAllGlobals());

const open = (route = '/reports/queue-by-status', language?: 'en' | 'ar') =>
  renderWithProviders(<AppRoutes />, { signedIn: true, route, language });

// Each row is a name and its number; assertions are scoped to the row so a
// label appearing elsewhere on the page cannot stand in for it.
const rowFor = async (label: string) =>
  within((await screen.findByText(label)).closest('.queue-report__row')!);

test('every status is shown, and the ones nobody is in show zero', async () => {
  desk();
  open();

  // The point of the story. A report whose empty statuses were missing would
  // read as a report with nothing wrong in it, and `pending: 0` is the number
  // that says the desk is not stalling anybody.
  expect((await rowFor(en.queueReport.statusPending)).getByText('0')).toBeInTheDocument();
  expect((await rowFor(en.queueReport.statusReopened)).getByText('0')).toBeInTheDocument();
  expect((await rowFor(en.queueReport.statusOpen)).getByText('12')).toBeInTheDocument();
  expect((await rowFor(en.queueReport.statusClosed)).getByText('104')).toBeInTheDocument();
});

test('a status is a word from the resource file, never the raw key', async () => {
  desk();
  open();
  await screen.findByText(en.queueReport.statusPending);

  for (const raw of ['pending', 'reopened', 'resolved']) {
    expect(screen.queryByText(raw)).not.toBeInTheDocument();
  }
});

test('a desk with nothing in it says so, and still shows the six zeros', async () => {
  const empty = { new: 0, open: 0, pending: 0, resolved: 0, closed: 0, reopened: 0 };
  desk({ answer: json({ counts: empty, total: 0 }) });
  open();

  expect(await screen.findByText(en.queueReport.nothingInTheQueue)).toBeInTheDocument();
  // Above the zeros, not instead of them: the numbers are the answer, and a
  // screen that replaced them would put back the idea the API removed.
  const zeros = document.querySelectorAll('.queue-report__row dd');
  expect(zeros).toHaveLength(6);
  expect([...zeros].every((cell) => cell.textContent === '0')).toBe(true);
});

test('a failure is a designed state with a way back', async () => {
  const { asked } = desk({ answer: json({ code: 'INTERNAL', requestId: 'r-1' }, 500) });
  open();

  expect(await screen.findByText(en.queueReport.errorTitle)).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: en.states.retry }));
  await waitFor(() => expect(asked.length).toBeGreaterThan(1));
});

test('somebody who is not an admin is told so, and nothing is asked on their behalf', async () => {
  const { fetch } = desk({ role: 'agent' });
  open();

  expect(await screen.findByText(en.queueReport.adminOnlyTitle)).toBeInTheDocument();
  const paths = fetch.mock.calls.map((call) => new URL(String(call[0]), 'http://desk.test').pathname);
  // The refusal would have been correct, and would have been a 403 for
  // somebody who did nothing wrong (L-63).
  expect(paths).not.toContain('/api/v1/reports/queue-by-status');
});

test('the numbers are the reader\'s, in both languages', async () => {
  desk();
  open('/reports/queue-by-status', 'ar');

  expect(await screen.findByText(ar.queueReport.title)).toBeInTheDocument();
  const row = await rowFor(ar.queueReport.statusClosed);
  // ar-EG, deliberately: format.ts:12 explains why bare 'ar' does not satisfy
  // the criterion, and says not to simplify it back.
  expect(row.getByText('١٠٤')).toBeInTheDocument();
});

// scripts/criteria/reports.md, section REPORTS-4-WEB.

test('the first load asks with no zone at all, so the report still means what it meant', async () => {
  const { asked } = desk();
  open();
  await screen.findByText(en.queueReport.statusOpen);

  // "Everything" is the default, and it is the request every caller written
  // before the window existed made. Defaulting to today would have quietly
  // turned this screen into a different report.
  await waitFor(() => expect(asked.at(-1)).toBe(''));
  // And with no window there is no period to state.
  expect(screen.queryByText(new RegExp(en.reportPeriod.zoneLabel))).not.toBeInTheDocument();
});

test('choosing a period sends the reader\'s zone, and the label comes back from the answer', async () => {
  const { asked } = desk();
  open();
  await screen.findByText(en.queueReport.statusOpen);

  await userEvent.click(screen.getByRole('button', { name: en.reportPeriod.today }));

  await waitFor(() => expect(asked.at(-1)).toContain('timeZone='));
  // The label is read from the window the API echoed, never from what the
  // client asked for — one source, so the period and the numbers cannot
  // disagree.
  expect(await screen.findByText(/Africa\/Cairo/)).toBeInTheDocument();
});

test('a number is never left standing under a period it does not belong to', async () => {
  // The second request never resolves, so the screen stays in the state it
  // enters when a period changes — which is the state under test.
  let calls = 0;
  const fetch = vi.fn((input: RequestInfo | URL) => {
    const url = new URL(String(input), 'http://desk.test');
    if (url.pathname === '/api/v1/me') {
      return Promise.resolve(json({ id: 'u-1', role: 'admin', name: 'Nadia Haddad' })());
    }
    calls += 1;
    if (calls === 1) return Promise.resolve(json({ counts: COUNTS(), total: Object.values(COUNTS()).reduce((a, b) => a + b, 0) })());
    return new Promise<Response>(() => {});
  });
  vi.stubGlobal('fetch', fetch);
  open();
  const shown = await screen.findByText(en.queueReport.statusOpen);
  expect(shown).toBeInTheDocument();

  await userEvent.click(screen.getByRole('button', { name: en.reportPeriod.last7 }));

  // Gone, not stale. The figures for "everything" must not sit under a label
  // that now says the last seven days.
  await waitFor(() => expect(screen.queryByText(en.queueReport.statusOpen)).not.toBeInTheDocument());
  expect(screen.getByRole('button', { name: en.reportPeriod.last7 })).toHaveAttribute('aria-pressed', 'true');
});
