// A phone number is a left-to-right run inside a paragraph that may be
// right-to-left. Unisolated, the browser reorders it — +20 2 5555 0177 renders
// as 0177 5555 2 20+ — which is the bidi algorithm working correctly on text
// nobody told it to isolate.
//
// jsdom does no bidi, so this cannot assert the rendering. What it CAN assert
// is that the element which prevents it is there, which is the whole of the
// fix. The rendering itself was checked in a browser (L-46).
import { afterEach, expect, test, vi } from 'vitest';

import { renderWithProviders, screen } from '../../testing/render';
import { Isolated } from './Isolated';

afterEach(() => vi.unstubAllGlobals());

test('the content is wrapped in the element that isolates direction', () => {
  const { container } = renderWithProviders(<Isolated>+20 2 5555 0177</Isolated>);
  const bdi = container.querySelector('bdi');
  expect(bdi).not.toBeNull();
  expect(bdi?.textContent).toBe('+20 2 5555 0177');
});

test('a customer row isolates the phone number and the address', async () => {
  const { CustomersPage } = await import('../../pages/customers/CustomersPage');
  const page = {
    items: [
      {
        id: 'c-1',
        name: 'Leila Mansour',
        email: 'leila.mansour@example.com',
        phone: '+20 2 5555 0177',
        createdAt: '2026-08-01T00:00:00.000Z',
        updatedAt: '2026-08-01T00:00:00.000Z',
      },
    ],
    total: 1,
    limit: 20,
    offset: 0,
  };
  vi.stubGlobal(
    'fetch',
    vi.fn(() =>
      Promise.resolve(
        new Response(JSON.stringify(page), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    ),
  );

  const { container } = renderWithProviders(<CustomersPage />, { signedIn: 'tok' });
  await screen.findByText('Leila Mansour');

  const isolated = [...container.querySelectorAll('bdi')].map((e) => e.textContent);
  expect(isolated).toContain('+20 2 5555 0177');
  expect(isolated).toContain('leila.mansour@example.com');
});
