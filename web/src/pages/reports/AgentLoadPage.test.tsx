// Proves scripts/criteria/reports.md section REPORTS-3-WEB.
import { afterEach, expect, test, vi } from 'vitest';

import { renderWithProviders, screen, userEvent, waitFor, within } from '../../testing/render';
import { AppRoutes } from '../../app/routes';
import { en } from '../../shared/i18n/en';
import { ar } from '../../shared/i18n/ar';

const json = (body: unknown, status = 200) => () =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const REPORT = (over: Record<string, unknown> = {}) => ({
  agents: [
    { id: 'u-1', name: 'Grace Okafor', role: 'admin', load: 5 },
    { id: 'u-2', name: 'Omar Aziz', role: 'agent', load: 0 },
    { id: 'u-3', name: 'Sofia Martinez', role: 'agent', load: 2 },
  ],
  unassigned: 4,
  open: 11,
  unaccounted: 0,
  ...over,
});

function desk({ role = 'admin', answer }: { role?: string; answer?: () => Response } = {}) {
  const asked: string[] = [];
  const fetch = vi.fn((input: RequestInfo | URL) => {
    const url = new URL(String(input), 'http://desk.test');
    if (url.pathname === '/api/v1/me') {
      return Promise.resolve(json({ id: 'u-1', role, name: 'Grace Okafor' })());
    }
    if (url.pathname === '/api/v1/reports/agent-load') {
      asked.push(url.pathname);
      return Promise.resolve((answer ?? json(REPORT()))());
    }
    throw new Error(`this screen must not call ${url.pathname}`);
  });
  vi.stubGlobal('fetch', fetch);
  return { fetch, asked };
}

afterEach(() => vi.unstubAllGlobals());

const open = (route = '/reports/agent-load', language?: 'en' | 'ar') =>
  renderWithProviders(<AppRoutes />, { signedIn: true, route, language });

const rowFor = async (name: string) =>
  within((await screen.findByText(name)).closest('.agent-load__row')!);

test('the person holding nothing is in the list, in the same shape as the busiest', async () => {
  desk();
  open();

  // The whole point of the report. A list cut to the busy few, or a query
  // grouped over tickets, would leave out exactly who an admin is looking for.
  expect((await rowFor('Omar Aziz')).getByText('0')).toBeInTheDocument();
  expect((await rowFor('Grace Okafor')).getByText('5')).toBeInTheDocument();
  expect(document.querySelectorAll('.agent-load__row')).toHaveLength(3);
});

test('work nobody has taken is a figure, not a person', async () => {
  desk();
  open();
  await screen.findByText('Omar Aziz');

  expect(screen.getByText(en.agentLoadReport.unassignedLabel)).toBeInTheDocument();
  // Outside the list of people. A row called "nobody" among the names would
  // read as somebody.
  const rows = [...document.querySelectorAll('.agent-load__row')].map((r) => r.textContent ?? '');
  expect(rows.some((text) => /nobody|unassigned/i.test(text))).toBe(false);
});

test('a name is the person\'s own, and the label around it is not', async () => {
  desk({ answer: json(REPORT({ agents: [{ id: 'u-9', name: 'محمد صلاح', role: 'agent', load: 3 }] })) });
  open();

  // Rendered as stored, in an English interface.
  expect(await screen.findByText('محمد صلاح')).toBeInTheDocument();
  expect(screen.getByText(en.agentLoadReport.roleAgent)).toBeInTheDocument();
});

test('a desk with one agent is still a report', async () => {
  desk({ answer: json(REPORT({ agents: [{ id: 'u-1', name: 'Grace Okafor', role: 'admin', load: 1 }] })) });
  open();

  expect((await rowFor('Grace Okafor')).getByText('1')).toBeInTheDocument();
  expect(screen.queryByText(en.agentLoadReport.errorTitle)).not.toBeInTheDocument();
});

test('when the parts do not add up, the report says so', async () => {
  desk({ answer: json(REPORT({ unaccounted: 1 })) });
  open();

  // A ticket is open and held by somebody the report does not list. Said out
  // loud, because an admin adding up the rows would otherwise reach a number
  // below the open count with nothing to go on.
  expect(await screen.findByText(en.agentLoadReport.unaccountedLabel)).toBeInTheDocument();
});

test('when they do add up, the report does not say anything about it', async () => {
  desk();
  open();
  await screen.findByText('Omar Aziz');

  // A figure that always reads zero is a figure nobody reads. It appears when
  // it means something.
  expect(screen.queryByText(en.agentLoadReport.unaccountedLabel)).not.toBeInTheDocument();
});

test('the numbers are the reader\'s, in both languages', async () => {
  desk();
  open('/reports/agent-load', 'ar');

  expect(await screen.findByText(ar.agentLoadReport.title)).toBeInTheDocument();
  // ar-EG digits, deliberately (format.ts:12). The name beside them is not
  // translated.
  expect((await rowFor('Grace Okafor')).getByText('٥')).toBeInTheDocument();
});

test('a failure is a designed state with a way back', async () => {
  const { asked } = desk({ answer: json({ code: 'INTERNAL', requestId: 'r-1' }, 500) });
  open();

  expect(await screen.findByText(en.agentLoadReport.errorTitle)).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: en.states.retry }));
  await waitFor(() => expect(asked.length).toBeGreaterThan(1));
});

test('somebody who is not an admin is told so, and nothing is asked on their behalf', async () => {
  const { fetch } = desk({ role: 'agent' });
  open();

  expect(await screen.findByText(en.agentLoadReport.adminOnlyTitle)).toBeInTheDocument();
  const paths = fetch.mock.calls.map((call) => new URL(String(call[0]), 'http://desk.test').pathname);
  expect(paths).not.toContain('/api/v1/reports/agent-load');
});
