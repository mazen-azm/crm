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
// instead of completeness. What must match is the key set, and this does that.
export type Messages = {
  [Section in keyof typeof en]: { [Key in keyof (typeof en)[Section]]: string };
};
