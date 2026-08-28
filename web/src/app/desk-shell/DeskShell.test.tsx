// Proves scripts/criteria/platform.md section PLATFORM-12-WEB: one shell owns
// the navigation, the header and the theme, and it adds no direction logic of
// its own.
import { expect, test } from 'vitest';

import { renderWithProviders, screen, userEvent } from '../../testing/render';
import { THEME_KEY } from '../theme-context';
import { DeskShell } from './DeskShell';

const attribute = () => document.documentElement.getAttribute('data-theme');

test('the shell renders the header, the navigation landmark and the screen inside it', () => {
  renderWithProviders(
    <DeskShell>
      <p>screen content</p>
    </DeskShell>,
    { signedIn: true },
  );

  expect(screen.getByRole('heading', { name: 'Support Desk' })).toBeInTheDocument();
  expect(screen.getByRole('navigation', { name: 'Primary' })).toBeInTheDocument();
  expect(screen.getByRole('main')).toBeInTheDocument();
  expect(screen.getByText('screen content')).toBeInTheDocument();
});

test('the theme control is in the shell, and switching it persists', async () => {
  const user = userEvent.setup();
  renderWithProviders(<DeskShell>{null}</DeskShell>, { signedIn: true });

  await user.click(screen.getByRole('button', { name: 'Dark theme' }));
  expect(attribute()).toBe('dark');
  expect(localStorage.getItem(THEME_KEY)).toBe('dark');
  // The control now offers the way back, rather than repeating itself.
  expect(screen.getByRole('button', { name: 'Light theme' })).toBeInTheDocument();
});

test('the shell adds no direction logic — Arabic mirrors through <html> alone', () => {
  renderWithProviders(<DeskShell>{null}</DeskShell>, { signedIn: true, language: 'ar' });

  // Set by I18nProvider, not by anything in this feature.
  expect(document.documentElement.getAttribute('dir')).toBe('rtl');
  expect(screen.getByRole('navigation', { name: 'التنقل الرئيسي' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'تسجيل الخروج' })).toBeInTheDocument();
});

test('the home link is a router link, not a document fetch', () => {
  renderWithProviders(<DeskShell>{null}</DeskShell>, { signedIn: true });
  const link = screen.getByRole('link', { name: 'Home' });
  // react-router renders an href, but it also intercepts the click. A bare
  // anchor would reload the document and throw away the session and the
  // theme; asserting the click is defaultPrevented is what tells them apart.
  const event = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
  link.dispatchEvent(event);
  expect(event.defaultPrevented).toBe(true);
});
