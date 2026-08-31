// Proves scripts/criteria/customers.md section CUSTOMERS-7-WEB.
import { afterEach, expect, test, vi } from 'vitest';
import { Route, Routes } from 'react-router-dom';

import { renderWithProviders, screen, userEvent, waitFor } from '../../testing/render';
import { CustomerScreenPage } from './CustomerScreenPage';
import { en } from '../../shared/i18n/en';
import { ar } from '../../shared/i18n/ar';

const json = (body: unknown, status = 200) => () =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const CUSTOMER = {
  id: 'c-1',
  name: 'Leila Mansour',
  email: 'leila.mansour@example.com',
  phone: '+20 2 5555 0177',
  hasSignIn: false,
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
};

const SCREEN = {
  customer: CUSTOMER,
  tickets: { items: [], total: 0, limit: 20, offset: 0 },
  notes: { items: [], total: 0, limit: 20, offset: 0 },
};

// Every PATCH body is recorded, so a test can say what was sent rather than
// inferring it from what is on the screen.
function desk({ patched = json({ ...CUSTOMER, name: 'Leila Mansour-Aziz' }) } = {}) {
  const sent: Array<Record<string, unknown>> = [];
  const reads: string[] = [];
  const fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input), 'http://desk.test');
    if (url.pathname.startsWith('/api/v1/assignees')) {
      return Promise.resolve(json({ items: [], total: 0, limit: 100, offset: 0 })());
    }
    if (init?.method === 'PATCH') {
      sent.push(JSON.parse(String(init.body)));
      return Promise.resolve(patched());
    }
    reads.push(url.pathname);
    return Promise.resolve(json(SCREEN)());
  });
  vi.stubGlobal('fetch', fetch);
  return { fetch, sent, reads };
}

afterEach(() => vi.unstubAllGlobals());

const at = (language?: 'en' | 'ar') =>
  renderWithProviders(
    <Routes>
      <Route path="/customers/:id" element={<CustomerScreenPage />} />
    </Routes>,
    { route: '/customers/c-1', signedIn: 'tok', language },
  );

const field = (label: string) => screen.getByLabelText(label);
const save = (t = en) => screen.getByRole('button', { name: t.customerScreen.contactsSave });

async function ready(language?: 'en' | 'ar') {
  at(language);
  await waitFor(() => expect(screen.getByDisplayValue('Leila Mansour')).toBeInTheDocument());
}

test('only the field that was edited is sent', async () => {
  const { sent } = desk();
  await ready();

  await userEvent.clear(field(en.customerScreen.nameLabel));
  await userEvent.type(field(en.customerScreen.nameLabel), 'Leila Mansour-Aziz');
  await userEvent.click(save());

  await waitFor(() => expect(sent).toHaveLength(1));
  // Not all three. The API leaves absent fields alone, and a screen that sent
  // everything would overwrite two fields to change one — and make the audit
  // diff say three things changed when one did.
  expect(sent[0]).toEqual({ name: 'Leila Mansour-Aziz' });
});

test('the screen shows the correction without reading the customer again', async () => {
  const { sent, reads } = desk({ patched: json({ ...CUSTOMER, phone: '+20 2 5555 0199' }) });
  await ready();
  const before = reads.length;

  await userEvent.clear(field(en.customerScreen.phoneLabel));
  await userEvent.type(field(en.customerScreen.phoneLabel), '+20 2 5555 0199');
  await userEvent.click(save());

  await waitFor(() => expect(sent).toHaveLength(1));
  // The write answers with the customer, so the card follows the answer. A
  // reload would also throw away a half-typed note in the composer below.
  await waitFor(() => expect(field(en.customerScreen.phoneLabel)).toHaveValue('+20 2 5555 0199'));
  expect(reads.length).toBe(before);
});

test('the fields are re-seeded from the answer, not from what was typed', async () => {
  // The API trims. A screen that kept the typed value would show something
  // the server does not hold, and the difference would only appear on the
  // next reload.
  const { sent } = desk({ patched: json({ ...CUSTOMER, name: 'Leila Mansour-Aziz' }) });
  await ready();

  await userEvent.clear(field(en.customerScreen.nameLabel));
  await userEvent.type(field(en.customerScreen.nameLabel), '  Leila Mansour-Aziz  ');
  await userEvent.click(save());

  await waitFor(() => expect(sent).toHaveLength(1));
  await waitFor(() => expect(field(en.customerScreen.nameLabel)).toHaveValue('Leila Mansour-Aziz'));
  // And the heading follows too — one customer, read from one place.
  expect(screen.getByRole('heading', { name: 'Leila Mansour-Aziz' })).toBeInTheDocument();
});

test('a blank field is a cleared value, not an omitted one', async () => {
  const { sent } = desk({ patched: json({ ...CUSTOMER, phone: null }) });
  await ready();

  await userEvent.clear(field(en.customerScreen.phoneLabel));
  await userEvent.click(save());

  // null on the wire — the shape the API treats as an ordinary value, and the
  // same one the ticket controls use for nobody and no category. An omitted
  // field would mean "leave it alone", which is the opposite.
  await waitFor(() => expect(sent).toHaveLength(1));
  expect(sent[0]).toEqual({ phone: null });
});

test('nothing to save is not offered', async () => {
  const { sent } = desk();
  await ready();

  // Untouched.
  expect(save()).toBeDisabled();

  await userEvent.type(field(en.customerScreen.nameLabel), 'x');
  expect(save()).toBeEnabled();

  // And typing back to what it was disables it again — the button follows the
  // value, not the fact that somebody touched the field.
  await userEvent.clear(field(en.customerScreen.nameLabel));
  await userEvent.type(field(en.customerScreen.nameLabel), 'Leila Mansour');
  expect(save()).toBeDisabled();
  expect(sent).toEqual([]);
});

test('an empty field that was already empty is not a change', async () => {
  const { sent } = desk();
  vi.unstubAllGlobals();
  const bare = { ...SCREEN, customer: { ...CUSTOMER, email: null, phone: null } };
  vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input), 'http://desk.test');
    if (url.pathname.startsWith('/api/v1/assignees')) {
      return Promise.resolve(json({ items: [], total: 0, limit: 100, offset: 0 })());
    }
    if (init?.method === 'PATCH') { sent.push(JSON.parse(String(init.body))); return Promise.resolve(json(CUSTOMER)()); }
    return Promise.resolve(json(bare)());
  }));
  await ready();

  // A null value and an empty box are the same thing, so opening the screen
  // and pressing nothing must not look like a correction.
  expect(field(en.customerScreen.emailLabel)).toHaveValue('');
  expect(save()).toBeDisabled();
});

test('a field the API named is marked, with the shared sentence', async () => {
  desk({ patched: json({ code: 'VALIDATION_FAILED', fields: ['email'], requestId: 'r-1' }, 422) });
  await ready();

  await userEvent.clear(field(en.customerScreen.emailLabel));
  await userEvent.type(field(en.customerScreen.emailLabel), 'not-an-address');
  await userEvent.click(save());

  await waitFor(() => expect(field(en.customerScreen.emailLabel)).toHaveAttribute('aria-invalid', 'true'));
  expect(screen.getByText(en.errors.VALIDATION_FAILED)).toBeInTheDocument();
  // Marked on the field rather than reported as a failure of the screen: the
  // value is what has to change.
  expect(screen.queryByText(en.customerScreen.contactsFailed)).not.toBeInTheDocument();
  // And what was typed is still there to correct.
  expect(field(en.customerScreen.emailLabel)).toHaveValue('not-an-address');
});

test('a refusal that names no field is reported as one', async () => {
  desk({ patched: json({ code: 'INTERNAL', requestId: 'r-1' }, 500) });
  await ready();

  await userEvent.type(field(en.customerScreen.nameLabel), 'x');
  await userEvent.click(save());

  expect(await screen.findByText(en.customerScreen.contactsFailed)).toBeInTheDocument();
  expect(screen.getByText(en.errors.INTERNAL)).toBeInTheDocument();
});

test('the API owns the rules, so the browser is not asked to enforce any', async () => {
  desk();
  await ready();

  for (const label of [en.customerScreen.nameLabel, en.customerScreen.emailLabel, en.customerScreen.phoneLabel]) {
    for (const attribute of ['required', 'pattern', 'minlength', 'maxlength']) {
      expect(field(label)).not.toHaveAttribute(attribute);
    }
    // type="email" is the one that has already caused this: the browser
    // refuses to submit, the API's rule never runs, and the sentence somebody
    // reads is the browser's — wrong language and outside the resource files
    // (L-55).
    expect(field(label)).not.toHaveAttribute('type', 'email');
  }
});

test('every string comes from the resource file, in both languages', async () => {
  desk();
  await ready('ar');

  expect(screen.getByLabelText(ar.customerScreen.emailLabel)).toBeInTheDocument();
  expect(save(ar)).toBeInTheDocument();
  expect(ar.customerScreen.contactsSave).not.toBe(en.customerScreen.contactsSave);
});
