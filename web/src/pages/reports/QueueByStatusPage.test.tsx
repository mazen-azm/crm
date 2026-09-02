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

function desk({ role = 'admin', answer }: { role?: string; answer?: () => Response } = {}) {
  const asked: string[] = [];
  const fetch = vi.fn((input: RequestInfo | URL) => {
    const url = new URL(String(input), 'http://desk.test');
    if (url.pathname === '/api/v1/me') {
      return Promise.resolve(json({ id: 'u-1', role, name: 'Nadia Haddad' })());
    }
    if (url.pathname === '/api/v1/reports/queue-by-status') {
      asked.push(url.pathname);
      const counts = COUNTS();
      const total = Object.values(counts).reduce((a, b) => a + b, 0);
      return Promise.resolve((answer ?? json({ counts, total }))());
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
