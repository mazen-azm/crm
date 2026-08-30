// Proves scripts/criteria/customers.md section CUSTOMERS-4-WEB.
import { afterEach, expect, test, vi } from 'vitest';

import { renderWithProviders, screen, userEvent, waitFor } from '../../testing/render';
import { AddCustomerPage } from './AddCustomerPage';
import { en } from '../../shared/i18n/en';
import { ar } from '../../shared/i18n/ar';

// A FRESH Response per call. A body can be read once, so handing the same
// instance to a second caller makes its .json() throw — which surfaces as a
// screen stuck loading and a test that waits out its timeout (L-30).
const json = (body: unknown, status = 200) => () =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const CREATED = {
  id: 'cus-1',
  name: 'Nadia Farouk',
  email: 'nadia@example.com',
  phone: '+20 100 123 4567',
  createdAt: '2026-08-30T09:00:00.000Z',
  updatedAt: '2026-08-30T09:00:00.000Z',
};

// Records what was sent, so a test can say what the request was rather than
// only what the screen ended up showing.
const stub = (answer: () => Response) => {
  const bodies: string[] = [];
  const paths: string[] = [];
  const fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    paths.push(new URL(String(input), 'http://desk.test').pathname);
    bodies.push(String(init?.body ?? ''));
    return Promise.resolve(answer());
  });
  vi.stubGlobal('fetch', fetch);
  return { fetch, bodies, paths };
};

const sent = (bodies: string[]) => JSON.parse(bodies[0]) as Record<string, unknown>;

afterEach(() => vi.unstubAllGlobals());

async function fill({ email = '', phone = '' } = {}) {
  await userEvent.type(screen.getByLabelText(en.customers.name), 'Nadia Farouk');
  if (email) await userEvent.type(screen.getByLabelText(en.customers.emailOptional), email);
  if (phone) await userEvent.type(screen.getByLabelText(en.customers.phoneOptional), phone);
  await userEvent.click(screen.getByRole('button', { name: en.customers.add }));
}

test('the customer that came back is on the screen, not a sentence saying it worked', async () => {
  const { bodies, paths } = stub(json(CREATED, 201));
  renderWithProviders(<AddCustomerPage />);

  await fill({ email: 'nadia@example.com', phone: '+20 100 123 4567' });

  expect(await screen.findByText(CREATED.id)).toBeInTheDocument();
  expect(screen.getByText(CREATED.name)).toBeInTheDocument();
  expect(screen.getByText(CREATED.email)).toBeInTheDocument();
  expect(screen.getByText(CREATED.phone)).toBeInTheDocument();
  // The created-at is rendered through the shared formatter, so this asserts
  // the year is there rather than restating the formatter's output.
  expect(screen.getByText(/2026/)).toBeInTheDocument();
  // The form is gone — this is the customer, not a form with a banner over it.
  expect(screen.queryByLabelText(en.customers.name)).not.toBeInTheDocument();

  // /customers, not /api/v1/customers: request() already prefixes it, and
  // writing it twice gives /api/v1/api/v1/customers.
  expect(paths).toEqual(['/api/v1/customers']);
  expect(sent(bodies)).toEqual({
    name: 'Nadia Farouk',
    email: 'nadia@example.com',
    phone: '+20 100 123 4567',
  });
});

test('a blank optional field is ABSENT from the request, not an empty string', async () => {
  const { bodies } = stub(json({ ...CREATED, email: null, phone: null }, 201));
  renderWithProviders(<AddCustomerPage />);

  await fill();

  await screen.findByText(CREATED.id);
  const body = sent(bodies);
  // Presence, not value. `email: ''` and `email: null` both pass a truthiness
  // check and are both wrong: the API's unique index keys on the address, and
  // an empty string is an address that is not one.
  expect('email' in body).toBe(false);
  expect('phone' in body).toBe(false);
  expect(body).toEqual({ name: 'Nadia Farouk' });
});

test('a customer with no email or phone reads as that, rather than as two blanks', async () => {
  stub(json({ ...CREATED, email: null, phone: null }, 201));
  renderWithProviders(<AddCustomerPage />);

  await fill();

  expect(await screen.findByText(en.customers.noEmail)).toBeInTheDocument();
  expect(screen.getByText(en.customers.noPhone)).toBeInTheDocument();
});

test('a field the API named is marked, with the shared sentence and no banner', async () => {
  stub(json({ code: 'VALIDATION_FAILED', fields: ['email'] }, 422));
  renderWithProviders(<AddCustomerPage />);

  await fill({ email: 'already@example.com' });

  const email = await screen.findByLabelText(en.customers.emailOptional);
  await waitFor(() => expect(email).toHaveAttribute('aria-invalid', 'true'));
  expect(screen.getByRole('alert')).toHaveTextContent(en.errors.VALIDATION_FAILED);
  // The named field only. A refusal about the address does not mark the name.
  expect(screen.getByLabelText(en.customers.name)).not.toHaveAttribute('aria-invalid');
  // One sentence, beside the field it is about. A banner repeating it would
  // say nothing the mark has not.
  expect(screen.getAllByRole('alert')).toHaveLength(1);
  expect(screen.queryByText(en.states.errorTitle)).not.toBeInTheDocument();
});

test('a refusal that named no field shows the banner instead', async () => {
  stub(json({ code: 'INTERNAL' }, 500));
  renderWithProviders(<AddCustomerPage />);

  await fill();

  expect(await screen.findByText(en.states.errorTitle)).toBeInTheDocument();
  expect(screen.getByText(en.errors.INTERNAL)).toBeInTheDocument();
  expect(screen.getByLabelText(en.customers.name)).not.toHaveAttribute('aria-invalid');
});

test('a second press while the first is in flight is not a second customer', async () => {
  let release: (value: Response) => void = () => {};
  const pending = new Promise<Response>((resolve) => {
    release = resolve;
  });
  const fetch = vi.fn(() => pending);
  vi.stubGlobal('fetch', fetch);
  renderWithProviders(<AddCustomerPage />);

  await userEvent.type(screen.getByLabelText(en.customers.name), 'Nadia Farouk');
  await userEvent.click(screen.getByRole('button', { name: en.customers.add }));

  const button = await screen.findByRole('button', { name: en.customers.adding });
  expect(button).toBeDisabled();
  // Clicked through the disabled attribute, because the attribute is only the
  // first guard — the hook refuses a call while one is in flight, and that is
  // what a keyboard repeat would meet.
  await userEvent.click(button, { pointerEventsCheck: 0 });
  expect(fetch).toHaveBeenCalledTimes(1);

  release(
    new Response(JSON.stringify(CREATED), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
  expect(await screen.findByText(CREATED.id)).toBeInTheDocument();
  expect(fetch).toHaveBeenCalledTimes(1);
});

test('adding another starts from a blank form, not the last one', async () => {
  stub(json(CREATED, 201));
  renderWithProviders(<AddCustomerPage />);

  await fill({ email: 'nadia@example.com' });
  await screen.findByText(CREATED.id);

  await userEvent.click(screen.getByRole('button', { name: en.customers.addAnother }));

  expect(await screen.findByLabelText(en.customers.name)).toHaveValue('');
  expect(screen.getByLabelText(en.customers.emailOptional)).toHaveValue('');
  expect(screen.queryByText(CREATED.id)).not.toBeInTheDocument();
});

test('every string comes from the resource file, in both languages', async () => {
  renderWithProviders(<AddCustomerPage />, { language: 'ar' });

  expect(await screen.findByRole('heading', { name: ar.customers.addTitle })).toBeInTheDocument();
  expect(screen.getByLabelText(ar.customers.emailOptional)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: ar.customers.add })).toBeInTheDocument();
  // The two files differ, which is what proves the screen read one of them
  // rather than carrying the sentence itself.
  expect(ar.customers.addTitle).not.toBe(en.customers.addTitle);
});
