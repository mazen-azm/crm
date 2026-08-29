// Proves scripts/criteria/tickets.md section TICKETS-1-WEB.
import { afterEach, expect, test, vi } from 'vitest';

import { renderWithProviders, screen, userEvent, waitFor } from '../../testing/render';
import { RaiseTicketPage } from './RaiseTicketPage';
import { en } from '../../shared/i18n/en';

// A FRESH Response per call. A body can be read once, so handing the same
// instance to a second caller makes its .json() throw — which surfaces as a
// screen stuck loading and a test that waits out its timeout (L-30).
const json = (body: unknown, status = 200) => () =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const CATEGORIES = [
  { id: 'cat-billing', name: 'Billing', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'cat-bug', name: 'Bug report', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
];

const categoryPage = (items = CATEGORIES) =>
  json({ items, total: items.length, limit: 100, offset: 0 });

const TICKET = {
  id: 'ticket-1',
  status: 'new',
  priority: 'normal',
  categoryId: 'cat-billing',
  subject: 'The invoice is wrong',
  body: 'It says 400 and should say 40.',
  createdAt: '2026-08-29T09:00:00.000Z',
};

// Routes a call by its path, so a test says what each endpoint answers rather
// than counting calls in order.
const routing = (routes: Record<string, () => Response>) =>
  vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    void init;
    const path = new URL(String(input), 'http://desk.test').pathname;
    const match = Object.keys(routes).find((key) => path.startsWith(key));
    if (!match) throw new Error(`no stub for ${path}`);
    return Promise.resolve(routes[match]());
  });

afterEach(() => vi.unstubAllGlobals());

async function fillTheForm() {
  await userEvent.type(screen.getByLabelText(en.raiseTicket.customerId), 'customer-1');
  await userEvent.type(screen.getByLabelText(en.raiseTicket.subject), 'The invoice is wrong');
  await userEvent.type(screen.getByLabelText(en.raiseTicket.body), 'It says 400.');
}

test('the categories offered come from the API', async () => {
  vi.stubGlobal('fetch', routing({ '/api/v1/ticket-categories': categoryPage() }));
  renderWithProviders(<RaiseTicketPage />);

  const select = await screen.findByLabelText(en.raiseTicket.category);
  await waitFor(() => expect(screen.getByRole('option', { name: 'Billing' })).toBeInTheDocument());
  expect(screen.getByRole('option', { name: 'Bug report' })).toBeInTheDocument();
  // No category is a real choice: the column is nullable and the API takes null.
  expect(screen.getByRole('option', { name: en.raiseTicket.categoryNone })).toBeInTheDocument();
  expect(select).toBeInTheDocument();
});

test('a category the API does not return is not offered', async () => {
  // A retired category is absent from the list rather than flagged, so the
  // screen has nothing to filter — this pins that it adds no filter of its own
  // and shows exactly what it was given.
  vi.stubGlobal('fetch', routing({ '/api/v1/ticket-categories': categoryPage([CATEGORIES[1]]) }));
  renderWithProviders(<RaiseTicketPage />);

  await waitFor(() => expect(screen.getByRole('option', { name: 'Bug report' })).toBeInTheDocument());
  expect(screen.queryByRole('option', { name: 'Billing' })).not.toBeInTheDocument();
});

test('every page of categories is read, not just the first', async () => {
  const pages = [
    json({ items: [CATEGORIES[0]], total: 2, limit: 100, offset: 0 }),
    json({ items: [CATEGORIES[1]], total: 2, limit: 100, offset: 1 }),
  ];
  let call = 0;
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.resolve(pages[Math.min(call++, pages.length - 1)]())),
  );
  renderWithProviders(<RaiseTicketPage />);

  await waitFor(() => expect(screen.getByRole('option', { name: 'Bug report' })).toBeInTheDocument());
  expect(screen.getByRole('option', { name: 'Billing' })).toBeInTheDocument();
});

test('the field the API names is the field the screen marks', async () => {
  vi.stubGlobal(
    'fetch',
    routing({
      '/api/v1/ticket-categories': categoryPage(),
      '/api/v1/tickets': json({ code: 'VALIDATION_FAILED', requestId: 'rq', fields: ['subject'] }, 422),
    }),
  );
  renderWithProviders(<RaiseTicketPage />);
  await waitFor(() => expect(screen.getByRole('option', { name: 'Billing' })).toBeInTheDocument());

  await fillTheForm();
  await userEvent.click(screen.getByRole('button', { name: en.raiseTicket.submit }));

  await waitFor(() =>
    expect(screen.getByLabelText(en.raiseTicket.subject)).toHaveAttribute('aria-invalid', 'true'),
  );
  // The other inputs are untouched: the API named one field and one is marked.
  expect(screen.getByLabelText(en.raiseTicket.customerId)).not.toHaveAttribute('aria-invalid');
  expect(screen.getByLabelText(en.raiseTicket.body)).not.toHaveAttribute('aria-invalid');
  // And the sentence is the shared one for the code, not built from the names.
  expect(screen.getAllByText(en.errors.VALIDATION_FAILED).length).toBeGreaterThan(0);
});

test('the submit control cannot be pressed twice', async () => {
  let resolve: (value: Response) => void = () => {};
  const inFlight = new Promise<Response>((r) => {
    resolve = r;
  });
  const fetchStub = vi.fn((input: RequestInfo | URL) => {
    const path = new URL(String(input), 'http://desk.test').pathname;
    if (path.startsWith('/api/v1/ticket-categories')) return Promise.resolve(categoryPage()());
    return inFlight;
  });
  vi.stubGlobal('fetch', fetchStub);
  renderWithProviders(<RaiseTicketPage />);
  await waitFor(() => expect(screen.getByRole('option', { name: 'Billing' })).toBeInTheDocument());

  await fillTheForm();
  const submit = screen.getByRole('button', { name: en.raiseTicket.submit });
  await userEvent.click(submit);

  // This POST creates a row, so a second press is a second ticket and not a
  // retry. The control is disabled and the shared in-flight label is shown.
  await waitFor(() =>
    expect(screen.getByRole('button', { name: en.raiseTicket.submitting })).toBeDisabled(),
  );
  await userEvent.click(screen.getByRole('button', { name: en.raiseTicket.submitting }));

  const posts = fetchStub.mock.calls.filter((c) =>
    new URL(String(c[0]), 'http://desk.test').pathname.endsWith('/tickets'),
  );
  expect(posts).toHaveLength(1);
  resolve(json(TICKET, 201)());
});

test('the ticket itself is shown, not a message saying it worked', async () => {
  vi.stubGlobal(
    'fetch',
    routing({
      '/api/v1/ticket-categories': categoryPage(),
      '/api/v1/tickets': json(TICKET, 201),
    }),
  );
  renderWithProviders(<RaiseTicketPage />);
  await waitFor(() => expect(screen.getByRole('option', { name: 'Billing' })).toBeInTheDocument());

  await fillTheForm();
  await userEvent.click(screen.getByRole('button', { name: en.raiseTicket.submit }));

  await waitFor(() => expect(screen.getByText(TICKET.id)).toBeInTheDocument());
  expect(screen.getByText(TICKET.subject)).toBeInTheDocument();
  expect(screen.getByText('Billing')).toBeInTheDocument();
  expect(screen.getByText(en.raiseTicket.priorityNormal)).toBeInTheDocument();
});

test('the no-category option sends null rather than an empty string', async () => {
  const fetchStub = routing({
    '/api/v1/ticket-categories': categoryPage(),
    '/api/v1/tickets': json(TICKET, 201),
  });
  vi.stubGlobal('fetch', fetchStub);
  renderWithProviders(<RaiseTicketPage />);
  await waitFor(() => expect(screen.getByRole('option', { name: 'Billing' })).toBeInTheDocument());

  await fillTheForm();
  await userEvent.click(screen.getByRole('button', { name: en.raiseTicket.submit }));

  await waitFor(() => expect(screen.getByText(TICKET.id)).toBeInTheDocument());
  const post = fetchStub.mock.calls.find((c) =>
    new URL(String(c[0]), 'http://desk.test').pathname.endsWith('/tickets'),
  )!;
  // '' would be a category id that cannot exist and would come back a 422.
  expect(JSON.parse(String(post[1]?.body)).categoryId).toBeNull();
});

test('a failure that loses the categories offers to load them again', async () => {
  let fail = true;
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.resolve(fail ? json({ code: 'INTERNAL', requestId: 'rq' }, 500)() : categoryPage()())),
  );
  renderWithProviders(<RaiseTicketPage />);

  await waitFor(() => expect(screen.getByText(en.raiseTicket.categoryError)).toBeInTheDocument());
  fail = false;
  await userEvent.click(screen.getByRole('button', { name: en.states.retry }));
  await waitFor(() => expect(screen.getByRole('option', { name: 'Billing' })).toBeInTheDocument());
});
