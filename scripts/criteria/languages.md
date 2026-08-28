# Languages — acceptance criteria

Two languages, both directions, in resource files. Rule BR-6
(`scripts/rules.txt` line 10) is the whole feature: never hardcoded, always
both.

Written 2026-08-28, when LANGUAGES-1-WEB was planned and the feature turned
out to have no criteria file at all — the same gap that let an earlier plan
invent its own acceptance.

## LANGUAGES-1-WEB

Every string a user reads comes from a resource file, in both languages.

*Acceptance criteria*
- Given any screen, when its source is read, then no user-facing string is
  written in it — every one comes from a resource file.
- Given the two resource files, when their keys are compared, then they carry
  the same set, and a key in one and not the other is a build failure rather
  than a blank on a screen.
- Given a string that a person will read, when it is added, then it is added
  to both files in the same change. A language that lags is a language that
  ships half-translated.
- Given the reader, when a screen asks for a string, then it asks by key and
  never by index or position, so a reordered file changes nothing.

*Out of scope*
- Switching language while the application runs — LANGUAGES-2-WEB.
- Dates, numbers and currency — LANGUAGES-3-WEB.
- The check that fails the build on a missing key — LANGUAGES-4-ALL. This
  story makes it a type error; that story makes it a check.

## LANGUAGES-1-MOB

The same rule, in the Android root: every string in `strings.xml`, in both
languages, and none in a Composable.

*Acceptance criteria*
- Given any Composable, when its source is read, then it contains no literal a
  user reads.
- Given `values/strings.xml` and `values-ar/strings.xml` (planned), when
  their names are compared, then they match. The Android root is built in
  sprint 10.
- Given the application in Arabic, when a screen is opened, then it reads
  right to left because the layout uses start and end, not left and right.

## LANGUAGES-2-WEB

Switching to Arabic flips the interface, without a restart.

*Acceptance criteria*
- Given the interface in English, when the language is switched, then the
  text, the direction and the alignment all change without a reload.
- Given the switch, when the page is reloaded, then the chosen language
  survives.
- Given the flipped interface, when it is read, then nothing is mirrored by a
  second stylesheet — the direction comes from the same rules as the first.

## LANGUAGES-2-MOB

The same switch on Android, without recreating the activity by hand.

*Acceptance criteria*
- Given the application in English, when the language is switched, then every
  visible screen redraws in Arabic.
- Given the choice, when the application is reopened, then it is remembered.

## LANGUAGES-3-WEB

Dates and numbers read the way the reader's locale writes them (BR-3).

*Acceptance criteria*
- Given a date, when it is displayed, then it is formatted for the active
  locale rather than by a hand-written pattern.
- Given a number, when it is displayed in Arabic, then its digits and its
  grouping follow the locale.
- Given a duration, when it is displayed, then it is expressed in the reader's
  language, not as a raw count of minutes.

## LANGUAGES-4-ALL

A key missing from one language fails the build.

*Acceptance criteria*
- Given a key added to one language and not the other, when the check runs,
  then it fails and names the key and the file that lacks it.
- Given the check, when it passes, then it prints how many keys it compared —
  a check that passes over an empty set is worse than no check.
- Given all three roots, when the check runs, then it covers each one that
  carries resource files.
