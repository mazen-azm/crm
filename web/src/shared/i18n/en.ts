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
    navCustomers: 'Customers',
    navQueue: 'The queue',
    navRaiseTicket: 'Raise a ticket',
    navPassword: 'Your password',
    navSetPassword: 'Set a password',
    navMyTickets: 'Your tickets',
    navHome: 'Home',
    switchToDark: 'Dark theme',
    switchToLight: 'Light theme',
    // Each language is named in its own words, in BOTH files on purpose: the
    // button says which language you would switch TO, so it reads the same
    // whichever way round you are. Do not "translate" these.
    switchToArabic: 'العربية',
    switchToEnglish: 'English',
  },
  account: {
    passwordTitle: 'Change your password',
    passwordSubtitle: 'You need the one you use now.',
    passwordCurrent: 'Current password',
    passwordNew: 'New password',
    passwordConfirm: 'New password again',
    passwordSubmit: 'Change it',
    passwordSubmitting: 'Changing…',
    // This screen's own sentence for a 401, not the shared one. t.errors
    // .UNAUTHENTICATED says the session has ended and to sign in again — true
    // of every other 401 in this product and false of this one, where the
    // session is fine and the password was wrong. Telling somebody to sign in
    // again while they are signed in is worse than saying nothing.
    passwordWrongCurrent: 'That is not the password you use now.',
    passwordMismatch: 'The two new passwords are not the same.',
    passwordChanged: 'Your password has been changed.',
    // Said out loud because the opposite is what people expect.
    passwordStillSignedIn: 'You are still signed in here.',
    passwordAgain: 'Change it again',
    passwordFailed: 'That change did not go through',
  },
  setPassword: {
    title: "Set somebody's password",
    subtitle: 'For a colleague who cannot sign in. They will need the one you type here.',
    adminOnly: 'Only an admin can set somebody else’s password.',
    // An id typed in rather than a person picked: the people screen is a later
    // story, and a label promising a search that is not here is worse than one
    // asking for what the screen actually takes.
    userId: 'User id',
    password: 'New password',
    confirm: 'New password again',
    submit: 'Set it',
    submitting: 'Setting…',
    mismatch: 'The two new passwords are not the same.',
    done: 'The password has been set.',
    doneFor: 'For the account',
    doneRead: 'Read it out to them. Nothing here can show it again.',
    another: 'Set another',
    failed: 'That password was not set',
  },
  portalRaise: {
    title: 'Tell us what happened',
    subtitle: 'No account needed. We will use your email address to find you.',
    email: 'Your email address',
    name: 'Your name (optional)',
    subject: 'What is it about',
    body: 'What happened',
    bodyPlaceholder: 'What you were doing, and what went wrong.',
    submit: 'Send it',
    submitting: 'Sending…',
    sentTitle: 'We have it',
    // The reference IS the confirmation. A sentence saying it worked, with
    // nothing to quote, leaves somebody with nothing to say when they
    // telephone about it.
    reference: 'Your reference',
    sentBody: 'Keep this. Quote it if you get in touch about the same thing.',
    another: 'Send another',
    failed: 'That did not send',
    // The intake's own sentence for a 429, not the shared one. The shared one
    // says "Too many attempts", and this is told to somebody who may have made
    // exactly one: the intake counts every arrival from a network address, so
    // a first-time visitor can meet the ceiling because of somebody else
    // behind the same connection. Telling them they tried too often would be
    // untrue, and there is nothing they could do about it.
    tooMany: 'We are getting a lot of requests from your connection right now. Try again in a minute.',
  },
  myTickets: {
    title: 'Your tickets',
    emptyTitle: 'Nothing open',
    emptyBody: 'You have not told us about anything yet.',
    raiseOne: 'Tell us about something',
    errorTitle: 'Your tickets did not load',
    previous: 'Previous',
    next: 'Next',
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
    NOT_IMPLEMENTED: 'That is not something this system does yet.',
    REVISION_MISMATCH: 'Somebody changed this while you were working. Reload to see it, then try again.',
    ILLEGAL_TRANSITION: 'That is not a move this ticket can make from where it is.',
    STATUS_UNCHANGED: 'The ticket already has that status.',
    REOPEN_WINDOW_CLOSED: 'This was resolved more than two weeks ago. Send us a new request instead.',
  } satisfies Record<ApiErrorCode, string>,
  customers: {
    title: 'Customers',
    searchLabel: 'Find a customer',
    searchPlaceholder: 'Name, email address or phone number',
    search: 'Search',
    searching: 'Searching…',
    // Keyed by Intl.PluralRules. English uses two of the six categories.
    // One key per plural category, because every value in these files is a
    // string — Messages says so, and defineLocale's key check depends on it.
    // English uses two of the six; the rest repeat, which is what English does.
    resultCountOne: 'customer found',
    resultCountTwo: 'customers found',
    resultCountFew: 'customers found',
    resultCountMany: 'customers found',
    resultCount: 'customers found',
    emptyTitle: 'No customer matched that',
    emptyBody: 'Check the spelling, or try part of a phone number instead.',
    emptyAction: 'Clear the search',
    errorTitle: 'That search did not run',
    noEmail: 'No email address',
    noPhone: 'No phone number',
    previous: 'Previous',
    next: 'Next',
    // The add form. It lives in this namespace rather than one of its own
    // because it is the same subject, and because the two "none" sentences
    // above are the ones its success card needs — a second pair saying the
    // same thing would drift the first time one of them is reworded.
    addTitle: 'Add a customer',
    addSubtitle: 'For somebody on the phone who is not on file yet.',
    addLink: 'Add a customer',
    name: 'Name',
    email: 'Email address',
    phone: 'Phone number',
    // Optional in the label, because the API asks for a name and nothing more.
    // A field that is optional and does not say so gets filled with something
    // invented to fill it.
    emailOptional: 'Email address (optional)',
    phoneOptional: 'Phone number (optional)',
    add: 'Add the customer',
    adding: 'Adding…',
    addAnother: 'Add another',
    createdTitle: 'Customer added',
    createdId: 'Customer id',
    createdAt: 'Added',
  },
  raiseTicket: {
    title: 'Raise a ticket',
    subtitle: 'For a customer who reached us another way.',
    customerId: 'Customer id',
    category: 'Category',
    categoryNone: 'No category',
    categoryError: 'The categories did not load',
    priority: 'Priority',
    priorityLow: 'Low',
    priorityNormal: 'Normal',
    priorityHigh: 'High',
    priorityUrgent: 'Urgent',
    subject: 'Subject',
    body: 'Description',
    submit: 'Raise the ticket',
    submitting: 'Raising…',
    raiseAnother: 'Raise another',
    createdTitle: 'The ticket is raised',
    createdId: 'Reference',
    createdStatus: 'Status',
    createdCategory: 'Category',
    createdPriority: 'Priority',
    createdSubject: 'Subject',
    createdAt: 'Raised',
  },
  ticketQueue: {
    title: 'The queue',
    newestFirst: 'Newest first.',
    filterStatus: 'Status',
    filterPriority: 'Priority',
    filterCategory: 'Category',
    filterAssignee: 'Assignee',
    any: 'Any',
    unassigned: 'Unassigned',
    apply: 'Apply',
    clear: 'Clear the filters',
    resultCountOne: 'ticket',
    resultCountTwo: 'tickets',
    resultCountFew: 'tickets',
    resultCountMany: 'tickets',
    resultCount: 'tickets',
    emptyTitle: 'No ticket matched',
    // The filters are named in the body so an agent can see which one is
    // hiding the queue. An empty region over two hundred tickets, with a
    // status filter somebody forgot, is what this exists for.
    emptyFiltered: 'These filters are active:',
    emptyUnfiltered: 'There is nothing in the queue yet.',
    errorTitle: 'The queue did not load',
    previous: 'Previous',
    next: 'Next',
    statusNew: 'New',
    statusOpen: 'Open',
    statusPending: 'Pending',
    statusResolved: 'Resolved',
    statusClosed: 'Closed',
    statusReopened: 'Reopened',
    priorityLow: 'Low',
    priorityNormal: 'Normal',
    priorityHigh: 'High',
    priorityUrgent: 'Urgent',
  },
  ticketAssign: {
    label: 'Assign to',
    submit: 'Assign',
    assigning: 'Assigning…',
    staleTitle: 'This ticket changed while you were looking at it',
    reload: 'Reload the queue',
    failedTitle: 'That assignment did not go through',
  },
  ticketStatus: {
    label: 'Move to',
    choose: 'Choose a status',
    submit: 'Move',
    moving: 'Moving…',
    noMoves: 'This ticket cannot be moved any further.',
    noteLabel: 'Resolution note',
    notePlaceholder: 'What was done, and what the customer was told.',
    noteRequired: 'Resolving needs a note. Say what was done.',
    resolvedNote: 'Resolution',
    failedTitle: 'That move did not go through',
    staleTitle: 'This ticket changed while you were looking at it',
    reload: 'Reload the queue',
  },
  ticketHistory: {
    heading: 'History',
    show: 'Show the history',
    hide: 'Hide the history',
    emptyTitle: 'Nothing has happened yet',
    emptyBody: 'This ticket has not been touched since it was raised.',
    errorTitle: 'The history did not load',
    loadMore: 'Load more',
    loading: 'Loading…',
    // The same word as customerScreen.noteBySystem, in a second namespace.
    // One shared place for it would be better and no story owns that move;
    // the two are authored sentences rather than a mapping, so a rewording of
    // one leaves the other saying the same thing differently, not wrongly.
    systemActor: 'the system',
    // Whole sentences with named slots. Never a verb glued to a value: the
    // Arabic forms below put the actor, the source and the target in a
    // different order, and concatenation cannot express that.
    created: '{actor} raised this ticket.',
    statusChanged: '{actor} moved this from {from} to {to}.',
    assigned: '{actor} assigned this to {to}.',
    unassigned: '{actor} took this off {from}.',
    reassigned: '{actor} moved this from {from} to {to}.',
    // A verb written before its sentence was. Legible, and it names the verb
    // so whoever added it can see what is missing.
    unknownVerb: '{actor} did something recorded as {verb}.',
  },
  customerScreen: {
    contacts: 'Contact',
    noEmail: 'No email address',
    noPhone: 'No phone number',
    openTickets: 'Open tickets',
    noOpenTickets: 'Nothing open for this customer',
    noOpenTicketsBody: 'Everything they have raised is resolved or closed.',
    raiseOne: 'Raise a ticket',
    notes: 'Notes',
    noNotes: 'No notes yet',
    noteLabel: 'Add a note',
    notePlaceholder: 'What was said, and what happens next.',
    noteRequired: 'A note needs something in it.',
    noteSubmit: 'Add the note',
    noteSubmitting: 'Adding…',
    noteFailed: 'That note was not added',
    noteBy: 'by',
    noteBySystem: 'the system',
    errorTitle: 'That customer did not load',
    retired: 'This customer has been removed. Their history is kept.',
    signInHeading: 'Sign-in',
    signInNone: 'This customer cannot sign in yet.',
    signInGrant: 'Give them a sign-in',
    signInGranting: 'Setting it up…',
    signInAlready: 'This customer already has a sign-in.',
    signInFailed: 'That sign-in was not created',
    // The one screen in this product that shows a password. It is shown once,
    // in full, because the agent is on the phone and has to read it out — and
    // it is never fetchable again, which the sentence has to say plainly
    // enough that nobody closes the tab expecting to come back to it.
    signInReady: 'Read this out now. It is not shown again.',
    signInEmail: 'They sign in with',
    signInPassword: 'First password',
  },
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
