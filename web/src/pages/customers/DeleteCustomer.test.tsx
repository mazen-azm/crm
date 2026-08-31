// Proves scripts/criteria/customers.md section CUSTOMERS-8-WEB.
import { afterEach, expect, test, vi } from 'vitest';
import { Route, Routes } from 'react-router-dom';

import { renderWithProviders, screen, userEvent, waitFor } from '../../testing/render';
import { CustomerScreenPage } from './CustomerScreenPage';
import { en } from '../../shared/i18n/en';
import { ar } from '../../shared/i18n/ar';

const json = (body: unknown, status = 200) => () =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const SCREEN = {
  customer: {
    id: 'c-1',
    name: 'Leila Mansour',
    email: 'leila.mansour@example.com',
    phone: '+20 2 5555 0177',
    hasSignIn: false,
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
  },
  tickets: { items: [], total: 0, limit: 20, offset: 0 },
  notes: { items: [], total: 0, limit: 20, offset: 0 },
};

// `me` is deliberately slow to answer in one test, so the "we do not know yet"
// state can be observed rather than raced past.
function desk({
  role = 'admin',
  deleted = json({ id: 'c-1', deletedAt: '2026-08-31T00:00:00.000Z' }),
  me = null as null | (() => Promise<Response>),
} = {}) {
  const calls: Array<{ method: string; path: string }> = [];
  const fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input), 'http://desk.test');
    calls.push({ method: init?.method ?? 'GET', path: url.pathname });
    if (url.pathname === '/api/v1/me') {
      return me ? me() : Promise.resolve(json({ id: 'u-1', role, name: 'An Admin' })());
    }
    if (url.pathname.startsWith('/api/v1/assignees')) {
      return Promise.resolve(json({ items: [], total: 0, limit: 100, offset: 0 })());
    }
    if (init?.method === 'DELETE') return Promise.resolve(deleted());
    return Promise.resolve(json(SCREEN)());
  });
  vi.stubGlobal('fetch', fetch);
  return { fetch, calls };
}

afterEach(() => vi.unstubAllGlobals());

// A real route table, so navigating away lands somewhere and the test can say
// where. The customers list is stubbed to a marker rather than rendered.
const at = (language?: 'en' | 'ar') =>
  renderWithProviders(
    <Routes>
      <Route path="/customers/:id" element={<CustomerScreenPage />} />
      <Route path="/customers" element={<p>the customers list</p>} />
    </Routes>,
    { route: '/customers/c-1', signedIn: 'tok', language },
  );

const deleteButton = (t = en) => screen.getByRole('button', { name: t.customerScreen.deleteCustomer });

async function ready(language?: 'en' | 'ar') {
  at(language);
  await waitFor(() => expect(screen.getByDisplayValue('Leila Mansour')).toBeInTheDocument());
}

test('it asks first, and cancelling writes nothing', async () => {
  const { calls } = desk();
  await ready();

  await userEvent.click(await screen.findByRole('button', { name: en.customerScreen.deleteCustomer }));

  // Deleting is the one action on this screen that no screen can undo.
  expect(screen.getByText(en.customerScreen.deleteConfirm)).toBeInTheDocument();
  expect(calls.some((c) => c.method === 'DELETE')).toBe(false);

  await userEvent.click(screen.getByRole('button', { name: en.customerScreen.deleteCancel }));
  expect(screen.queryByText(en.customerScreen.deleteConfirm)).not.toBeInTheDocument();
  expect(calls.some((c) => c.method === 'DELETE')).toBe(false);
  // And the way back in is still there.
  expect(deleteButton()).toBeInTheDocument();
});

test('confirming deletes, and leaves a screen whose subject is gone', async () => {
  const { calls } = desk();
  await ready();

  await userEvent.click(await screen.findByRole('button', { name: en.customerScreen.deleteCustomer }));
  await userEvent.click(screen.getByRole('button', { name: en.customerScreen.deleteConfirmYes }));

  await waitFor(() => expect(screen.getByText('the customers list')).toBeInTheDocument());
  const sent = calls.filter((c) => c.method === 'DELETE');
  expect(sent).toHaveLength(1);
  expect(sent[0].path).toBe('/api/v1/customers/c-1');
});

test('a non-admin is told, rather than shown a control that will be refused', async () => {
  const { calls } = desk({ role: 'agent' });
  await ready();

  expect(await screen.findByText(en.customerScreen.deleteNotAdmin)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: en.customerScreen.deleteCustomer })).not.toBeInTheDocument();
  // Courtesy, not enforcement: the API refuses an agent whatever this draws
  // (SC-2), and a test on that side says so.
  expect(calls.some((c) => c.method === 'DELETE')).toBe(false);
});

test('while we do not yet know who is asking, neither is drawn', async () => {
  let answer: (r: Response) => void = () => {};
  const pending = new Promise<Response>((resolve) => { answer = resolve; });
  desk({ me: () => pending });
  at();

  await waitFor(() => expect(screen.getByDisplayValue('Leila Mansour')).toBeInTheDocument());
  // "Not an admin" and "we do not know yet" are different. Drawing the refusal
  // for the second tells an admin they are not one for as long as a request
  // takes; drawing the button would flash it at somebody who may not have it.
  expect(screen.queryByRole('button', { name: en.customerScreen.deleteCustomer })).not.toBeInTheDocument();
  expect(screen.queryByText(en.customerScreen.deleteNotAdmin)).not.toBeInTheDocument();

  answer(json({ id: 'u-1', role: 'admin', name: 'An Admin' })());
  expect(await screen.findByRole('button', { name: en.customerScreen.deleteCustomer })).toBeInTheDocument();
});

test('a refusal is reported with the shared sentence, and the screen stays', async () => {
  desk({ deleted: json({ code: 'FORBIDDEN', requestId: 'r-1' }, 403) });
  await ready();

  await userEvent.click(await screen.findByRole('button', { name: en.customerScreen.deleteCustomer }));
  await userEvent.click(screen.getByRole('button', { name: en.customerScreen.deleteConfirmYes }));

  expect(await screen.findByText(en.customerScreen.deleteFailed)).toBeInTheDocument();
  expect(screen.getByText(en.errors.FORBIDDEN)).toBeInTheDocument();
  // Still here: leaving would be leaving for a screen whose subject is not
  // gone, and the reader would have to find their way back.
  expect(screen.queryByText('the customers list')).not.toBeInTheDocument();
  expect(screen.getByDisplayValue('Leila Mansour')).toBeInTheDocument();
});

test('a second press while the first is in flight is not a second delete', async () => {
  let answer: (r: Response) => void = () => {};
  const pending = new Promise<Response>((resolve) => { answer = resolve; });
  const { calls } = desk({ deleted: () => pending as unknown as Response });
  await ready();

  await userEvent.click(await screen.findByRole('button', { name: en.customerScreen.deleteCustomer }));
  await userEvent.click(screen.getByRole('button', { name: en.customerScreen.deleteConfirmYes }));

  const busy = await screen.findByRole('button', { name: en.customerScreen.deleting });
  expect(busy).toBeDisabled();
  await userEvent.click(busy, { pointerEventsCheck: 0 });
  expect(calls.filter((c) => c.method === 'DELETE')).toHaveLength(1);

  answer(json({ id: 'c-1', deletedAt: '2026-08-31T00:00:00.000Z' })());
  await waitFor(() => expect(screen.getByText('the customers list')).toBeInTheDocument());
});

test('every string comes from the resource file, in both languages', async () => {
  desk();
  await ready('ar');

  await userEvent.click(await screen.findByRole('button', { name: ar.customerScreen.deleteCustomer }));
  expect(screen.getByText(ar.customerScreen.deleteConfirm)).toBeInTheDocument();
  expect(ar.customerScreen.deleteConfirm).not.toBe(en.customerScreen.deleteConfirm);
});
