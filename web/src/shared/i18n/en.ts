// English resource file. Every user-facing string a primitive or a page
// renders lives here (BR-6, scripts/rules.txt line 10). Language switching and
// the full library are LANGUAGES-1-WEB's story; this ships the resource files
// and the reader the primitives call.
import type { ApiErrorCode } from '../api/errors';

export const en = {
  signIn: {
    heading: 'Sign in',
    emailLabel: 'Email',
    passwordLabel: 'Password',
    submit: 'Sign in',
    submitting: 'Signing in…',
    // Keyed by the code the API answers with. The API deliberately gives one
    // refusal for a wrong password, an unknown address and a disabled
    // account, so there is one sentence for all three — being more specific
    // here would undo on the screen what the API refused to reveal.
    errorUnauthenticated: 'That email and password do not match an account.',
    errorValidationFailed: 'Check the highlighted fields and try again.',
    errorInternal: 'Something went wrong at our end. Try again.',
    errorUnknown: 'Sign-in failed.',
  },
  shell: {
    navLabel: 'Primary',
    navHome: 'Home',
    switchToDark: 'Dark theme',
    switchToLight: 'Light theme',
  },
  home: {
    heading: 'Support Desk',
    signOut: 'Sign out',
  },
  // What each documented code MEANS, for any screen whose load failed.
  //
  // `satisfies Record<ApiErrorCode, string>` is the point: ApiErrorCode mirrors
  // the API's frozen catalogue, so a ninth code arriving without a sentence
  // fails tsc — and vitest does not typecheck, so npm run build is where that
  // shows up (L-15).
  //
  // Sign-in deliberately does NOT read these. It answers one sentence for
  // UNAUTHENTICATED, VALIDATION_FAILED and everything else, because the API
  // refuses to say which of a wrong password, an unknown address and a
  // disabled account it was. See the comment on messageFor in SignInPage.
  errors: {
    BAD_REQUEST: 'That request could not be read. Reload and try again.',
    UNAUTHENTICATED: 'Your session has ended. Sign in again to continue.',
    FORBIDDEN: 'Your account does not have access to this.',
    NOT_FOUND: 'That is not here. It may have been moved or removed.',
    CONFLICT: 'Somebody changed this while you were working. Reload to see it.',
    VALIDATION_FAILED: 'Check the highlighted fields and try again.',
    RATE_LIMITED: 'Too many attempts. Wait a moment and try again.',
    INTERNAL: 'Something went wrong at our end. Try again.',
  } satisfies Record<ApiErrorCode, string>,
  states: {
    loading: 'Loading',
    errorTitle: 'That did not load',
    retry: 'Try again',
  },
};

// The value types are widened to string on purpose. With `as const` the
// literal "Sign in" becomes the type, and the Arabic file would then be
// required to contain the English words — a type that enforces sameness
// instead of completeness. What must match is the key set.
export type Messages = {
  [Section in keyof typeof en]: { [Key in keyof (typeof en)[Section]]: string };
};

// Messages alone catches a MISSING key: a required property cannot be absent.
// It does not catch an EXTRA one, because a wider object still satisfies a
// narrower type — and an extra key is a translator's typo that then never
// renders anywhere, in any language.
//
// A generic sees the literal shape of what was passed, which a type
// annotation cannot, so the surplus keys can be named and forbidden.
export function defineLocale<T extends Messages>(
  locale: T & Record<Exclude<keyof T, keyof Messages>, never> & {
    [Section in keyof Messages]: Record<
      Exclude<keyof T[Section], keyof Messages[Section]>,
      never
    >;
  },
): Messages {
  return locale;
}
