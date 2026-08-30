import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { useAuth } from '../auth-context';
import { useTheme } from '../theme-context';
import { useTranslation } from '../../shared/i18n';
import { useMe } from '../../shared/session/use-me';
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
  const { isAdmin } = useMe();
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
        <Link to="/tickets" className="desk-shell__nav-item">
          {t.shell.navQueue}
        </Link>
        <Link to="/tickets/new" className="desk-shell__nav-item">
          {t.shell.navRaiseTicket}
        </Link>
        {/* Your own account, and the last item because it is about you rather
            than about the work. Without a way in, the screen exists and
            nothing reaches it — the defect the customer screen and the add
            form each had to fix. */}
        <Link to="/account/password" className="desk-shell__nav-item">
          {t.shell.navPassword}
        </Link>
        {/* Only for an admin, and only once we know they are one. Undefined
            means the answer has not arrived: drawing the item then taking it
            away is worse than drawing it a moment late, and drawing nothing
            for an admin is worse still — so it waits rather than guesses.
            Courtesy, not enforcement: the API refuses a non-admin whether or
            not this link is here. */}
        {isAdmin === true ? (
          <Link to="/accounts/set-password" className="desk-shell__nav-item">
            {t.shell.navSetPassword}
          </Link>
        ) : null}
      </nav>

      <main className="desk-shell__main">{children}</main>
    </div>
  );
}
