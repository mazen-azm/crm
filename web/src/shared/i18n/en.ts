// English resource file. Every user-facing string a primitive or a page
// renders lives here (BR-6, scripts/rules.txt line 10). Language switching and
// the full library are LANGUAGES-1-WEB's story; this ships the resource files
// and the reader the primitives call.
export const en = {
  signIn: {
    heading: 'Sign in',
    emailLabel: 'Email',
    passwordLabel: 'Password',
    submit: 'Sign in',
    stubNotice: 'Real sign-in is not implemented yet — IDENTITY-1-API replaces this stub.',
  },
  home: {
    heading: 'Support Desk',
    signOut: 'Sign out',
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
