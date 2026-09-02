// Proves scripts/criteria/reports.md section REPORTS-2-WEB.
import { afterEach, expect, test, vi } from 'vitest';

import { renderWithProviders, screen, userEvent, waitFor } from '../../testing/render';
import { AppRoutes } from '../../app/routes';
import { en } from '../../shared/i18n/en';
import { ar } from '../../shared/i18n/ar';

const json = (body: unknown, status = 200) => () =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const KINDS = (over: Record<string, unknown> = {}) => ({
  first_response: { met: 41, breached: 9, settled: 50, share: 41 / 50 },
  resolution: { met: 0, breached: 0, settled: 0, share: null },
  ...over,
});

function desk({ role = 'admin', answer }: { role?: string; answer?: () => Response } = {}) {
  const asked: string[] = [];
  const fetch = vi.fn((input: RequestInfo | URL) => {
    const url = new URL(String(input), 'http://desk.test');
    if (url.pathname === '/api/v1/me') {
      return Promise.resolve(json({ id: 'u-1', role, name: 'Nadia Haddad' })());
    }
    if (url.pathname === '/api/v1/reports/promise-share') {
      asked.push(url.pathname);
      return Promise.resolve((answer ?? json({ kinds: KINDS() }))());
    }
    throw new Error(`this screen must not call ${url.pathname}`);
  });
  vi.stubGlobal('fetch', fetch);
  return { fetch, asked };
}

afterEach(() => vi.unstubAllGlobals());

const open = (route = '/reports/promise-share', language?: 'en' | 'ar') =>
  renderWithProviders(<AppRoutes />, { signedIn: true, route, language });

test('the share is shown with the counts it rests on', async () => {
  desk();
  open();

  // 82% (41 of 50). The percentage alone cannot be acted on: 100% of two
  // tickets and 100% of two hundred are different facts that look identical.
  const line = await screen.findByText(/82%/);
  expect(line).toHaveTextContent('41');
  expect(line).toHaveTextContent('50');
});

test('each promise is labelled as the promise it is, and never as an acronym', async () => {
  desk();
  open();

  expect(await screen.findByText(en.promiseReport.firstResponseLabel)).toBeInTheDocument();
  expect(screen.getByText(en.promiseReport.resolutionLabel)).toBeInTheDocument();
  // "SLA" is a word for the mechanism. The reader is being told whether the
  // desk answered people and whether it fixed their problem.
  expect(document.body.textContent).not.toMatch(/\bSLA\b/);
});

test('a kind with nothing settled says so in words, and shows no share at all', async () => {
  desk();
  open();
  await screen.findByText(/82%/);

  // Resolution has settled nothing. Nothing settled is not a desk that missed
  // everything, and 0% would say it did.
  expect(screen.getByText(en.promiseReport.noData)).toBeInTheDocument();
  // Exactly one share on the page — asserted by counting the shares, not by
  // looking for the absence of a '%' character, which under ar-EG is ٪ and
  // would make the assertion pass on a page that was showing one.
  expect(screen.getAllByText(/—/)).toHaveLength(1);
});

test('a desk that missed everything says nought per cent, which is a different answer', async () => {
  desk({ answer: json({ kinds: {
    first_response: { met: 0, breached: 7, settled: 7, share: 0 },
    resolution: { met: 0, breached: 0, settled: 0, share: null },
  } }) });
  open();

  expect(await screen.findByText(/0%/)).toHaveTextContent('7');
  // And the other kind still says there is nothing to report, in the same
  // answer — which is why one number averaging the two would say nothing true.
  expect(screen.getByText(en.promiseReport.noData)).toBeInTheDocument();
});

test('the numbers are the reader\'s, in both languages', async () => {
  desk();
  open('/reports/promise-share', 'ar');

  expect(await screen.findByText(ar.promiseReport.title)).toBeInTheDocument();
  // ar-EG digits, deliberately (format.ts:12).
  const line = await screen.findByText(/٨٢/);
  expect(line).toHaveTextContent('٤١');
  expect(line).toHaveTextContent('٥٠');
});

test('a failure is a designed state with a way back', async () => {
  const { asked } = desk({ answer: json({ code: 'INTERNAL', requestId: 'r-1' }, 500) });
  open();

  expect(await screen.findByText(en.promiseReport.errorTitle)).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: en.states.retry }));
  await waitFor(() => expect(asked.length).toBeGreaterThan(1));
});

test('somebody who is not an admin is told so, and nothing is asked on their behalf', async () => {
  const { fetch } = desk({ role: 'agent' });
  open();

  expect(await screen.findByText(en.promiseReport.adminOnlyTitle)).toBeInTheDocument();
  const paths = fetch.mock.calls.map((call) => new URL(String(call[0]), 'http://desk.test').pathname);
  expect(paths).not.toContain('/api/v1/reports/promise-share');
});
