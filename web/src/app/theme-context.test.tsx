// Proves scripts/criteria/platform.md section PLATFORM-12-WEB's second bullet:
// the theme choice survives a reload. A reload is a fresh render reading the
// same storage, which is what every test here does.
import { expect, test, vi } from 'vitest';

import { render, renderWithProviders, screen, userEvent } from '../testing/render';
import { THEME_KEY, useTheme } from './theme-context';

function ThemeProbe() {
  const { theme, toggleTheme } = useTheme();
  return (
    <button type="button" onClick={toggleTheme}>
      {theme}
    </button>
  );
}

const attribute = () => document.documentElement.getAttribute('data-theme');

test('a stored theme is read on the first render, not corrected a frame later', () => {
  localStorage.setItem(THEME_KEY, 'dark');
  renderWithProviders(<ThemeProbe />);
  // No waitFor: the point of reading storage in the state initialiser is that
  // the right palette is on before anything paints. An assertion that had to
  // wait would be passing on the flash this exists to prevent.
  expect(screen.getByRole('button')).toHaveTextContent('dark');
});

test('nothing stored means light', () => {
  renderWithProviders(<ThemeProbe />);
  expect(screen.getByRole('button')).toHaveTextContent('light');
});

test('a stored value that is not a theme means light, not data-theme="sepia"', () => {
  localStorage.setItem(THEME_KEY, 'sepia');
  renderWithProviders(<ThemeProbe />);
  expect(screen.getByRole('button')).toHaveTextContent('light');
  expect(attribute()).not.toBe('sepia');
});

test('toggling writes the choice to storage, which is what survives the reload', async () => {
  const user = userEvent.setup();
  renderWithProviders(<ThemeProbe />);

  await user.click(screen.getByRole('button'));
  expect(attribute()).toBe('dark');
  expect(localStorage.getItem(THEME_KEY)).toBe('dark');

  await user.click(screen.getByRole('button'));
  expect(attribute()).toBe('light');
  expect(localStorage.getItem(THEME_KEY)).toBe('light');
});

test('two quick toggles do not read a stale theme', async () => {
  const user = userEvent.setup();
  renderWithProviders(<ThemeProbe />);
  await user.click(screen.getByRole('button'));
  await user.click(screen.getByRole('button'));
  // A toggleTheme captured in its own useCallback over `theme` would have
  // gone dark, then dark again.
  expect(attribute()).toBe('light');
});

test('storage that throws leaves the visitor with a working theme for this tab', async () => {
  const user = userEvent.setup();
  const blocked = vi
    .spyOn(Storage.prototype, 'setItem')
    .mockImplementation(() => {
      throw new Error('site data blocked');
    });
  try {
    renderWithProviders(<ThemeProbe />);
    await user.click(screen.getByRole('button'));
    // The choice did not persist, and that is allowed. A blank screen is not.
    expect(attribute()).toBe('dark');
  } finally {
    blocked.mockRestore();
  }
});

test('useTheme outside its provider names the mistake instead of rendering nothing', () => {
  // The raw renderer, deliberately: renderWithProviders would supply the
  // provider and there would be nothing to prove.
  const quiet = vi.spyOn(console, 'error').mockImplementation(() => {});
  try {
    expect(() => render(<ThemeProbe />)).toThrow(/useTheme\(\) was called outside ThemeProvider/);
  } finally {
    quiet.mockRestore();
  }
});
