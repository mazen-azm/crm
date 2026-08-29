import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { useAuth } from '../auth-context';
import { useTheme } from '../theme-context';
import { useTranslation } from '../../shared/i18n';
import { Button, Heading, Stack } from '../../shared/ui';
import './DeskShell.css';

// The one frame every authenticated desk screen renders inside. It owns the
// navigation, the header and the theme control, so no screen re-implements
// them — which is the whole story: the second desk screen must be able to be
// only its own content.
//
// Direction and language are not here. I18nProvider puts dir and lang on
// <html> and every rule below uses logical properties, so Arabic mirrors this
// layout without a second copy of it.
export function DeskShell({ children }: { children: ReactNode }) {
  const { t, language, toggleLanguage } = useTranslation();
  const { signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const themeLabel = theme === 'dark' ? t.shell.switchToLight : t.shell.switchToDark;
  const languageLabel = language === 'ar' ? t.shell.switchToEnglish : t.shell.switchToArabic;

  return (
    <div className="desk-shell">
      <header className="desk-shell__header">
        <Heading level={1}>{t.home.heading}</Heading>
        <Stack direction="row" gap={2} align="start">
          <Button variant="secondary" onClick={toggleLanguage}>
            {languageLabel}
          </Button>
          <Button variant="secondary" onClick={toggleTheme}>
            {themeLabel}
          </Button>
          <Button variant="secondary" onClick={signOut}>
            {t.home.signOut}
          </Button>
        </Stack>
      </header>

      <nav className="desk-shell__nav" aria-label={t.shell.navLabel}>
        {/* Navigation items arrive with the screens they point at.

            Link, not <a href>: a bare anchor makes the browser fetch the
            document again, throwing away the router, the session and the
            theme to reach the page you are already on. */}
        <Link to="/" className="desk-shell__nav-item">
          {t.shell.navHome}
        </Link>
        <Link to="/customers" className="desk-shell__nav-item">
          {t.shell.navCustomers}
        </Link>
      </nav>

      <main className="desk-shell__main">{children}</main>
    </div>
  );
}
