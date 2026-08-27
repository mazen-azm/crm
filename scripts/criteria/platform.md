# platform — acceptance criteria

## PLATFORM-1-ALL

Three roots in one repository, with the conventions written down before anything
is built on them.

*Acceptance criteria*
- Given a fresh clone, when I read the README, then it names the three roots and
  how to start each one.
- Given `.gitignore`, when I add a root-level note file, then it is ignored, and
  the README is not.
- Given a commit on `main`, when the branch conventions are read, then they say
  what is cut from what and what merges where.
- Given any commit in this repository, when its message is read, then it carries
  no AI attribution of any kind. This is checked, not trusted.

*Out of scope*
- CI. That is PLATFORM-13-ALL.

## PLATFORM-2-API

The schema, and migrations that can be run twice without changing anything.

*Acceptance criteria*
- Given an empty database, when migrations run, then every table in the schema
  exists and the run is recorded.
- Given a database already migrated, when migrations run a second time, then
  nothing changes and nothing throws.
- Given the queue's four filters, when a query plan is read, then each uses an
  index rather than a scan.
- Given `customers`, when two rows share an email and one is hidden, then the
  insert succeeds — the email index is partial, because nothing is hard-deleted.
- Given `sla_breaches`, when the same ticket and clock are inserted twice, then
  the second insert is refused by a unique constraint.
- Given `escalations`, when the same breach is escalated twice, then the second
  is refused by a unique constraint.

*Out of scope*
- Any business rule. This story creates tables and nothing that writes to them.

## PLATFORM-3-API

One error shape, one place that decides the status code, and a request id on
everything.

*Acceptance criteria*
- Given any error, when it reaches the client, then the body carries a code, a
  request id, and no stack trace.
- Given an unknown route, when it is called, then the response is the same
  documented shape as every other error.
- Given a request with no id, when it is handled, then one is generated and
  returned in the response headers.
- Given a request that carries an id, when it is handled, then that id is used
  rather than a new one.
- Given a thrown error anywhere in a service, when it surfaces, then exactly one
  middleware decided its status code.
- Given the response, when its security headers are read, then the standard set
  is present.

*Out of scope*
- Translating codes into sentences. The API returns codes; clients translate.

## PLATFORM-6-API

The prefix, the page ceiling, health, and logs that say what actually happened.

*Acceptance criteria*
- Given any route, when it is called without the `/api/v1` prefix, then it is not
  found.
- Given a list endpoint, when it is called with a limit above the maximum, then
  it is refused rather than silently clamped.
- Given the health endpoint, when it is called by a stranger, then it answers
  without authentication.
- Given a request to `/api/v1/users`, when the log line is read, then the path it
  logs is `/api/v1/users` and not `/users`. Express restores `baseUrl` before the
  finish event, and a log field that is quietly wrong is worse than a missing one.
- Given a log line, when it is read, then it carries the request id that the
  client was given.

## PLATFORM-7-API

An API document that cannot drift, because the suite compares it to the router.

*Acceptance criteria*
- Given the running application, when the suite runs, then every served route
  appears in the OpenAPI document.
- Given a route added without documentation, when the suite runs, then it fails
  and names the route.
- Given a documented route that is no longer served, when the suite runs, then it
  fails and names it.
- Given the request collection, when it is imported into a client, then every
  request in it resolves against the running application.

## PLATFORM-8-API

A seed that fills what is empty and can be run twice.

*Acceptance criteria*
- Given an empty database, when the seed runs, then staff, customers, categories
  and service-level targets exist.
- Given a seeded database, when the seed runs again, then no row is duplicated.
- Given the seed has run, when it finishes, then it prints the password it set,
  because an admin who cannot sign in has been handed nothing.
- Given the seed, when it is read, then it builds its own services rather than
  importing the application's. It is a second composition root, on purpose.
- Given `npm run seed`, when it is typed after any file move, then it runs. The
  package scripts are checked by PLATFORM-15-ALL.

*Out of scope*
- Tickets. They need rules that do not exist yet, and putting the deadline
  arithmetic in the seed would place a second copy of the promise in the codebase.
  That is PLATFORM-17-API.

## PLATFORM-17-API

Tickets that were walked through the real state machine, not inserted.

*Acceptance criteria*
- Given the seed, when tickets are created, then each moved through the real
  state machine rather than being written directly at its final status.
- Given the seeded queue, when it is read, then every status and every priority
  appears at least once.
- Given the seeded queue, when it is read, then some tickets are unassigned and
  some are already past their promise — otherwise the service-level screens have
  nothing to show.
- Given the seeded tickets, when their text is read, then they are written, not
  generated. Fifty rows of "Ticket 37" fill the same screen and demonstrate
  nothing.

## PLATFORM-9-WEB

The skeleton every screen is built on.

*Acceptance criteria*
- Given the application, when it starts, then the router resolves and an
  unauthenticated visitor lands on sign-in.
- Given a signed-in session, when the page is reloaded, then the session survives.
- Given an API call, when it returns an error code, then the client surfaces the
  code rather than a generic failure.
- Given a slow request, when it is in flight, then the loading state is
  observable, and the hook that owns it is used by every screen rather than
  reimplemented.
- Given the layers, when an import points upward, then the structure check fails.

## PLATFORM-11-WEB

A test setup, and enough first tests to prove it goes red.

*Acceptance criteria*
- Given the test command, when it runs, then it runs without network access.
- Given a deliberately broken component, when the suite runs, then it fails.
- Given the environment, when a test touches `localStorage`, then it works —
  Node 26 defines a global that throws unless started with a flag, and jsdom's
  returns `undefined`, so the setup provides its own.
- Given a render helper, when a test uses it, then providers, router and
  translations are all in place without the test repeating them.

*Out of scope*
- Broad coverage. This story proves the setup, and every story after it carries
  its own tests.

## PLATFORM-13-ALL

The suite runs on every push, and a red suite blocks a merge.

*Acceptance criteria*
- Given a push, when it lands, then the API suite, the web suite and every check
  script run.
- Given a failing test, when a merge is attempted, then it is blocked.
- Given a run, when it finishes, then the duration of each suite is reported. An
  intermittent test is a report, not noise, and the duration is the first thing
  read.
- Given a hanging test, when the ceiling is reached, then it reports itself
  rather than stopping the run.

## PLATFORM-15-ALL

The structure enforced by a script, from the first feature rather than after nine
violations.

*Acceptance criteria*
- Given the API, when a feature imports another feature's internals, then the
  check fails and names both.
- Given the API, when `shared` or `platform` imports a feature, then it fails.
- Given a service or repository holding `req` or `res`, then it fails.
- Given SQL outside a repository, then it fails.
- Given the web, when a layer imports upward, then it fails.
- Given two sibling slices, when one imports the other outside `@x`, then it
  fails.
- Given Android, when model or data code imports Compose, then it fails.
- Given a screen taking a navigator, then it fails.
- Given a package script naming a file that does not exist, then it fails.
- Given a variable `.env.example` declares that nothing reads, then it fails.
- Given any check, when it passes, then it prints how many files it read. A check
  that passes over an empty set is worse than no check.

## PLATFORM-14-ALL

The names and the citations checked, because the previous attempt's confusion was
entirely a naming problem.

*Acceptance criteria*
- Given a feature folder in any root, when it is not in `docs/taxonomy.md`, then
  the check fails.
- Given a slug in the taxonomy that owns code, when its folder is missing, then
  the check fails.
- Given a path cited in any document, when it does not exist and is not declared
  as future work, then the check fails and names the document and the line.
- Given a story id anywhere, when its prefix is not in the taxonomy, then it
  fails.
- Given a story id, when it carries no layer suffix, then it fails.

## PLATFORM-18-MOB

The Android skeleton, from an empty directory.

*Acceptance criteria*
- Given the application, when it starts on an emulator, then it reads one
  endpoint and renders what came back.
- Given the emulator, when a request is made, then it resolves over IPv4 — the
  emulator does not route IPv6.
- Given cleartext HTTP to the local server, when a request is made, then it is
  permitted for the loopback host only, and for no other host.
- Given the network configuration is absent, when the application runs, then the
  failure is loud rather than silent. It fails silently by default, which is why
  this criterion exists.
- Given the structure, when model or data code is read, then it imports nothing
  from Compose.

*Out of scope*
- Any screen a user works in. Those are the `-MOB` halves of their own features.

## PLATFORM-19-ALL

Hardening, once everything it inspects exists.

*Acceptance criteria*
- Given every route, when the sweep runs, then none is unthrottled.
- Given every error path, when it is exercised, then none leaks a stack trace or
  an internal identifier.
- Given the README, when it is followed on a clean machine, then the application
  starts.
- Given the screenshots, when they are read, then they show the application as it
  actually is.

<!-- The sections above keep their original line positions — plans cite them by
     line. The five sections below were appended 2026-08-27, when the file was
     reconciled with scripts/backlog.txt: the file had been ported from the
     first attempt and four stories had no criteria at all. -->

## PLATFORM-4-API

Permission is decided in middleware, before any service runs (SC-2).

*Acceptance criteria*
- Given a guarded route and no subject, when it is called, then the answer is
  401 with code UNAUTHENTICATED, in the same documented error shape as every
  other failure.
- Given a guarded route and a subject the policy refuses, when it is called,
  then the answer is 403 with code FORBIDDEN.
- Given a policy that accepts, when the route is called, then the service runs
  and its result returns unchanged.
- Given a refused request, when the service is instrumented, then it was never
  invoked — the decision happened before it, not inside it.
- Given the chain, when its order is read, then the subject is attached before
  any feature seam, once per request.

*Out of scope*
- Loading a real subject from a token or session. That is IDENTITY-1-API.

## PLATFORM-5-API

Every failure returns its documented code, and one shape (E-1, E-2).

*Acceptance criteria*
- Given any failure, when it reaches the client, then its status is one of
  400 401 403 404 409 422 429 500 and its body carries the documented code.
- Given a malformed request body, when it is parsed, then the answer is 400 —
  not 500.
- Given input that is well-formed but invalid, when it is validated, then the
  answer is 422 and the body says which field.
- Given an error the code never mapped, when it surfaces, then the answer is
  500 with code INTERNAL and no internal detail leaks.
- Given the catalogue, when a response carries a code outside it, then the
  suite fails.

## PLATFORM-10-WEB

One palette, one file: tokens and primitives, both directions (D-1, BR-6).

*Acceptance criteria*
- Given the tokens file, when any component needs a colour, then it consumes a
  token — no colour literal exists outside the tokens file, in any root.
- Given the primitives, when the document direction flips, then they render
  correctly in both directions.
- Given user-facing text in a primitive, when it is read, then it comes from a
  resource file in both languages, never hardcoded.
- Given a new screen, when it is built, then it can be assembled from the
  primitives without restating spacing, radius or type scale.

## PLATFORM-12-WEB

The desk has one shell: navigation, header, theme.

*Acceptance criteria*
- Given any desk screen, when it renders, then it renders inside the one shell —
  navigation, header and theme are never re-implemented per screen.
- Given the theme, when it is switched, then the choice survives a reload.
- Given the language, when it changes, then the shell's direction follows it.
- Given the shell, when its styles are read, then every colour is a token
  (D-1).

## PLATFORM-16-WEB

Empty, loading and error states are designed, not accidental (D-2).

*Acceptance criteria*
- Given a list with no rows, when it renders, then the empty state says why it
  is empty and offers the next action — not a blank region.
- Given a failed load, when it renders, then the error state shows the
  documented code's meaning and offers retry.
- Given a request in flight, when the screen renders, then the loading state is
  the shared primitive, not a layout jump.
- Given any new screen, when it ships, then all three states exist and the
  review can point at each.
