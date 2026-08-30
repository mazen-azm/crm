// Proves scripts/criteria/customers.md section CUSTOMERS-3-WEB.
import { afterEach, expect, test, vi } from 'vitest';
import { Route, Routes } from 'react-router-dom';

import { renderWithProviders, screen, userEvent, waitFor } from '../../testing/render';
import { CustomerScreenPage } from './CustomerScreenPage';
import { en } from '../../shared/i18n/en';

const json = (body: unknown, status = 200) => () =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const STAFF = [{ id: 'u-1', name: 'Sofía Martínez', role: 'agent' }];

const SCREEN = {
  customer: { id: 'c-1', name: 'Leila Mansour', email: null, phone: null, createdAt: '2026-08-01T00:00:00.000Z', updatedAt: '2026-08-01T00:00:00.000Z' },
  tickets: { items: [], total: 0, limit: 20, offset: 0 },
  notes: {
    items: [
      { id: 'n-1', customerId: 'c-1', authorId: 'u-1', body: 'Rang about the invoice.', createdAt: '2026-08-02T00:00:00.000Z' },
      { id: 'n-2', customerId: 'c-1', authorId: null, body: 'Imported from the old desk.', createdAt: '2026-08-03T00:00:00.000Z' },
    ],
    total: 2,
  },
};

// Routes by path, and records what was POSTed so an assertion can read it.
const desk = (post: () => Response = json({ id: 'n-3', customerId: 'c-1', authorId: 'u-1', body: 'A new note.', createdAt: '2026-08-04T00:00:00.000Z' }, 201)) => {
  const calls: Array<{ path: string; method: string; body?: unknown }> = [];
  const stub = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const path = new URL(String(input), 'http://desk.test').pathname;
    calls.push({ path, method: init?.method ?? 'GET', body: init?.body ? JSON.parse(String(init.body)) : undefined });
    if (path.startsWith('/api/v1/assignees')) {
      return Promise.resolve(json({ items: STAFF, total: STAFF.length, limit: 100, offset: 0 })());
    }
    if (init?.method === 'POST') return Promise.resolve(post());
    return Promise.resolve(json(SCREEN)());
  });
  return { stub, calls };
};

const at = () =>
  renderWithProviders(
    <Routes>
      <Route path="/customers/:id" element={<CustomerScreenPage />} />
    </Routes>,
    { route: '/customers/c-1', signedIn: 'tok' },
  );

afterEach(() => vi.unstubAllGlobals());

const ready = () => waitFor(() => expect(screen.getByText('Leila Mansour')).toBeInTheDocument());
const field = () => screen.getByLabelText(en.customerScreen.noteLabel);
const submit = () => screen.getByRole('button', { name: en.customerScreen.noteSubmit });

test('a written note appears without reloading everything already held', async () => {
  const { stub, calls } = desk();
  vi.stubGlobal('fetch', stub);
  at();
  await ready();

  const readsBefore = calls.filter((c) => c.method === 'GET' && c.path === '/api/v1/customers/c-1').length;

  await userEvent.type(field(), 'A new note.');
  await userEvent.click(submit());

  await waitFor(() => expect(screen.getByText('A new note.')).toBeInTheDocument());
  // The POST answers with the note it made, so it is appended. Re-fetching the
  // whole screen to see one new line is what the criterion forbids.
  const readsAfter = calls.filter((c) => c.method === 'GET' && c.path === '/api/v1/customers/c-1').length;
  expect(readsAfter).toBe(readsBefore);
  // And what was already there is still there.
  expect(screen.getByText('Rang about the invoice.')).toBeInTheDocument();
});

test('the field is cleared after a note is added', async () => {
  const { stub } = desk();
  vi.stubGlobal('fetch', stub);
  at();
  await ready();

  await userEvent.type(field(), 'A new note.');
  await userEvent.click(submit());

  await waitFor(() => expect(field()).toHaveValue(''));
});

test('a blank note is refused before the API is called', async () => {
  const { stub, calls } = desk();
  vi.stubGlobal('fetch', stub);
  at();
  await ready();

  await userEvent.click(submit());
  await waitFor(() => expect(screen.getByText(en.customerScreen.noteRequired)).toBeInTheDocument());
  expect(calls.some((c) => c.method === 'POST')).toBe(false);
});

test('a note that is only whitespace is refused the way the API refuses it', async () => {
  const { stub, calls } = desk();
  vi.stubGlobal('fetch', stub);
  at();
  await ready();

  await userEvent.type(field(), '   ');
  await userEvent.click(submit());

  await waitFor(() => expect(screen.getByText(en.customerScreen.noteRequired)).toBeInTheDocument());
  expect(field()).toHaveAttribute('aria-invalid', 'true');
  expect(calls.some((c) => c.method === 'POST')).toBe(false);
});

test('each note says who wrote it and when', async () => {
  const { stub } = desk();
  vi.stubGlobal('fetch', stub);
  at();
  await ready();

  // A note nobody can attribute is a note nobody trusts (BR-2). The author is
  // an id on the wire; the name comes from the staff list this screen loads.
  await waitFor(() => expect(screen.getByText(/Sofía Martínez/)).toBeInTheDocument());
  // Null is the system, and reads as something rather than as a blank.
  expect(screen.getByText(new RegExp(en.customerScreen.noteBySystem))).toBeInTheDocument();
});

test('a failed write says what the code means and keeps the draft', async () => {
  const { stub } = desk(json({ code: 'INTERNAL', requestId: 'rq' }, 500));
  vi.stubGlobal('fetch', stub);
  at();
  await ready();

  await userEvent.type(field(), 'Will not go through.');
  await userEvent.click(submit());

  await waitFor(() => expect(screen.getByText(en.customerScreen.noteFailed)).toBeInTheDocument());
  expect(screen.getByText(en.errors.INTERNAL)).toBeInTheDocument();
  // Losing what somebody typed because the server failed is a second failure.
  expect(field()).toHaveValue('Will not go through.');
});
