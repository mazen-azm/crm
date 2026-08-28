// Proves scripts/criteria/languages.md section LANGUAGES-2-WEB: the switch
// flips text, direction and alignment in the same render, and the choice
// survives a reload.
import { expect, test, vi } from 'vitest';

import { renderWithProviders, screen, userEvent } from '../../testing/render';
import { DeskShell } from '../../app/desk-shell/DeskShell';
import { LANGUAGE_KEY } from './index';
import { en } from './en';
import { ar } from './ar';

const dir = () => document.documentElement.getAttribute('dir');
const lang = () => document.documentElement.getAttribute('lang');

const shell = (options = {}) =>
  renderWithProviders(<DeskShell>{null}</DeskShell>, { signedIn: true, ...options });

test('switching flips the text and the direction without a reload', async () => {
  const user = userEvent.setup();
  shell();

  expect(dir()).toBe('ltr');
  expect(screen.getByRole('heading', { name: en.home.heading })).toBeInTheDocument();

  await user.click(screen.getByRole('button', { name: en.shell.switchToArabic }));

  // Same render tree, no navigation, no reload.
  expect(dir()).toBe('rtl');
  expect(lang()).toBe('ar');
  expect(screen.getByRole('heading', { name: ar.home.heading })).toBeInTheDocument();
  expect(screen.getByRole('navigation', { name: ar.shell.navLabel })).toBeInTheDocument();
});

test('the language a visitor chose survives a reload', async () => {
  const user = userEvent.setup();
  const first = shell();
  await user.click(screen.getByRole('button', { name: en.shell.switchToArabic }));
  expect(localStorage.getItem(LANGUAGE_KEY)).toBe('ar');
  first.unmount();

  // A reload is a fresh render reading the same storage, and no prop.
  shell();
  expect(dir()).toBe('rtl');
  expect(screen.getByRole('heading', { name: ar.home.heading })).toBeInTheDocument();
});

test('the button names the language you would move to, in that language', async () => {
  const user = userEvent.setup();
  shell();

  expect(screen.getByRole('button', { name: 'العربية' })).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'العربية' }));
  // Now it offers the way back, and still names that language in its own words.
  expect(screen.getByRole('button', { name: 'English' })).toBeInTheDocument();
});

test('two quick clicks land where one would not', async () => {
  const user = userEvent.setup();
  shell();
  await user.click(screen.getByRole('button', { name: en.shell.switchToArabic }));
  await user.click(screen.getByRole('button', { name: en.shell.switchToEnglish }));
  // A toggle closing over a stale language would have gone to Arabic twice.
  expect(dir()).toBe('ltr');
});

test('an explicit language prop beats what is in storage', () => {
  localStorage.setItem(LANGUAGE_KEY, 'ar');
  shell({ language: 'en' });
  // The harness passing a language is a test stating intent. If storage won,
  // every test that sets a language would be at the mercy of whatever an
  // earlier interaction happened to persist.
  expect(dir()).toBe('ltr');
});

test('a stored value nobody recognises falls back rather than loading nothing', () => {
  localStorage.setItem(LANGUAGE_KEY, 'fr');
  shell();
  expect(dir()).toBe('ltr');
  expect(lang()).toBe('en');
});

test('storage that throws still lets the visitor switch for this tab', async () => {
  const user = userEvent.setup();
  const blocked = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('site data blocked');
  });
  try {
    shell();
    await user.click(screen.getByRole('button', { name: en.shell.switchToArabic }));
    expect(dir()).toBe('rtl');
  } finally {
    blocked.mockRestore();
  }
});
