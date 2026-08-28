# Story 06 — Every failure returns its documented code and one shape (Story: CRM-20)

## Prerequisites

- **PLATFORM-3-API-request-chain (CRM-18)** completed: `HttpError`,
  `notFoundHandler`, `errorHandler` exist in `api/src/platform/http/errors.js`
  and are composed by `createApp` in `api/src/app.js`. This story extends that
  one file and the chain around it; it does **not** add a second place that
  shapes an error body.
- **PLATFORM-4-API-permission-middleware (CRM-19)** completed:
  `api/src/platform/http/permission.js` throws
  `new HttpError(401, 'UNAUTHENTICATED')` and `new HttpError(403, 'FORBIDDEN')`.
  Those two call sites stay exactly as they are — their codes are already the
  catalogue's canonical codes for 401/403.
- Story branch `CRM-20-error-contract` cut from `sprint-0` (see `docs/git.md`
  lines 13–22). `sprint-0` already exists — it is the current branch — so no
  bootstrap step is needed (contrast Story 05, which had to create it).
- **No database.** This story is HTTP-only. There is no engine question here
  (lesson **L-5**); nothing in the plan opens `node:sqlite` or touches
  `api/src/platform/db/`.

---

## Story Goal

Give the API a **single documented catalogue** of failure statuses and make
every path that ends in an error land inside it, in one body shape. The rules
this story owns are **E-1** (`scripts/rules.txt:27` — one shape, every failure,
no stack trace) and **E-2** (`scripts/rules.txt:28` — every failure returns its
documented code: 400 401 403 404 409 422 429 500).

Concretely:

1. `api/src/platform/http/errors.js` gains a frozen catalogue — the eight
   statuses (400 401 403 404 409 422 429 500), each with a canonical `code`
   string — and `HttpError`'s constructor **throws** when handed a status
   outside it. The constructor guard is the whole structural enforcement; one
   unit test on it is the whole proof. A comment carries
   `TODO(CHANNELS-2-API/CRM-119)`: 501 joins the map in that story (it owns
   rule **E-3**) and will hit this guard until it does.
2. A malformed JSON request body returns **400 `MALFORMED_BODY`**, not the
   500 it produces today (the `express.json()` `SyntaxError` is not an
   `HttpError`, so `errorHandler` currently coerces it to `INTERNAL`).
3. A **422** carrier exists — `ValidationError` / `unprocessable(fields)` —
   whose body is `{ code: 'VALIDATION_FAILED', requestId, fields }`, where
   `fields` is a list of **field names only — never a submitted value**. A
   value can be a password or personal data; it must not travel back to the
   client or into a log. `fields` is the only shape variation E-1 permits, and
   only at 422. This story ships the carrier; it validates no real endpoint.
4. **429** has a catalogue entry (`RATE_LIMITED`). No rate limiter is built
   here.

### Not in scope

- Any real subject/token loading behind the 401 — **IDENTITY-1-API (CRM-41)**.
- Structured logging of `err.cause` / where the 500's internal detail goes —
  **PLATFORM-6-API (CRM-21)**.
- The `/api/v1` prefix, the page-size ceiling, `/health` — **PLATFORM-6-API
  (CRM-21)**. The `100kb` body cap and its `413` are that story's ceiling
  work too (`api/src/app.js` lines 22–24); see **Edge Cases**.
- The OpenAPI document that lists each code per route — **PLATFORM-7-API
  (CRM-22)**.
- Adding `501` to the catalogue and its behaviour ("named and deliberately not
  built", rule E-3) — **CHANNELS-2-API (CRM-119)**. This story's constructor
  guard will reject `new HttpError(501, …)` until then, by design; the comment
  beside `DOCUMENTED` flags it.
- A source-text scan of `new HttpError(` call sites across the tree — the
  structural enforcement here is the constructor guard, not a grep of call
  sites. A file-content structure check is **PLATFORM-15-ALL-structure-check
  (CRM-30)**'s job.
- Any rate limiter that emits 429 — **IDENTITY-4-API (CRM-47)**,
  **CHANNELS-3-API (CRM-120)**, **PLATFORM-19-ALL (CRM-34)**.
- Per-endpoint validation rules (which fields, which constraints) — each
  feature's own `<slug>.schema.js` / `<slug>.service.js` (`docs/architecture.md`
  lines 36–37). CRM-20 ships only the type they throw.
- Web rendering of the documented code + retry affordance — **PLATFORM-16-WEB
  (CRM-31)**.

---

## Context — Read These Files First

1. `api/src/platform/http/errors.js` **lines 1–46** (whole file) — `HttpError(status, code, cause)`, `notFoundHandler`, `errorHandler`. Note line 3 comment ("this shape is public … must not change it"), the `res.headersSent` delegate path (lines 34–39), and the `TODO(PLATFORM-5-API/CRM-20)` at lines 29–31 — **this story removes that TODO** by doing what it describes. The `errorHandler` still stays the one place a status is chosen.
2. `api/src/platform/http/errors.test.js` **lines 1–73** (whole file) — the stub-`req`/`res`/`next` unit pattern. Note the test at lines 53–60 asserts the body has **exactly** `['code', 'requestId']` for a plain `Error` and a 404 `HttpError`; that assertion must keep passing (neither case is a 422 with `fields`). Add new cases, do not weaken this one.
3. `api/src/app.js` **lines 1–42** (whole file) — the composition root. Order today: `requestId()` → `securityHeaders()` → `express.json({ limit: '100kb' })` → `attachSubject(deps.subjectResolver)` → optional `mountTestRoutes(app)` → `notFoundHandler()` → `errorHandler()`. The new JSON-parse error mapper mounts **immediately after** `express.json(...)` and **before** `attachSubject`.
4. `api/src/app.test.js` **lines 1–129** (whole file) — the `start(mountTestRoutes, subjectResolver)` helper boots a real listener on port 0 and asserts over `fetch`. Line 11 has the `UUID` matcher. Lines 58–67 already throw `new HttpError(409, 'REVISION_MISMATCH')` from a route — the precedent for the 422 e2e test. Reuse the helper; do not add a new one.
5. `api/src/platform/http/permission.js` **lines 30–63** — the two `new HttpError(401, 'UNAUTHENTICATED')` and one `new HttpError(403, 'FORBIDDEN')` call sites. They already use canonical codes; **leave them unchanged**. They are also proof the constructor guard is safe (401, 403 are in the eight).
6. `api/src/platform/http/request-id.js` and `api/src/platform/http/security-headers.js` **(whole, ~26 and ~33 lines)** — the house style for a small `platform/http/` module: module-level `const` for narrow inputs, `Object.freeze` for constant maps, a header comment that explains *why*, single quotes, 2-space indent. The catalogue map and the new mapper match this.
7. `scripts/criteria/platform.md` **lines 272–286** — the section `## PLATFORM-5-API`. Verified: its id equals this story's backlog id (checked per lesson **L-7** — the file was realigned to the backlog in commit `6319ed1`), and its five acceptance bullets are the source of `## Done Criteria` below.
8. `scripts/rules.txt` **lines 27–29** — `E-1`, `E-2`, `E-3`. This story owns **E-1 and E-2**. `E-3` (501) is **CHANNELS-2-API (CRM-119)** — do not implement it here; name it in the `TODO(CHANNELS-2-API/CRM-119)` comment beside `DOCUMENTED` as the reason 501 is absent.
9. `scripts/backlog.txt` **line 24** — `STORY 5|error-contract|client|every failure returns its documented code and one shape|API:0:3|E-1 E-2|PLT-3-API`. Confirms sprint 0, 3 points, rules `E-1 E-2`, predecessor `PLT-3-API` (backlog's own prefix scheme; the full-slug form is **PLATFORM-3-API-request-chain (CRM-18)**, per lesson **L-1**).
10. `docs/architecture.md` **lines 26–43** — the API tree. `platform/http/` is "error middleware, request id, security headers" (line 30) — the catalogue and the JSON-parse mapper belong there. Lines 36–37 already declare `<slug>.schema.js  well-formed → 422` and `<slug>.service.js  allowed → 409 · validation lives here` — the 422/409 semantics this story provides types for are already the documented architecture.
11. [`05-story-CRM-19.md`](05-story-CRM-19.md) — the immediately prior platform story; match its section shapes, its "Not in scope" bullet style, and its explicit "leave the chain order alone" discipline.

Grep first, read second:

- `grep -rn "new HttpError(" api/src` — the full list of call sites the constructor guard must not break (four today: `errors.js:22`, `permission.js:33,51,57`, plus `app.test.js:61`).
- `grep -rn "MALFORMED_BODY\|VALIDATION_FAILED\|RATE_LIMITED\|ValidationError\|unprocessable\|DOCUMENTED" api/src` — must return **no matches** before this story, so the executor can prove the additions are new.
- `grep -rn "entity.parse.failed" api/node_modules/body-parser/lib/read.js` — confirms the error `type` string the mapper switches on (line 166 today).

---

## Product rules (from story)

- **Current behaviour:** the body shape `{ code, requestId }` and the 401/403/404/500 statuses exist (CRM-18, CRM-19). But (a) nothing names the full set of allowed statuses or stops a future `new HttpError(418, …)`; (b) a malformed JSON body yields **500 `INTERNAL`**; (c) there is no 422 carrier and no way to say *which field* failed; (d) 429 has no code.
- **New behaviour:** one frozen catalogue in `errors.js` names all eight statuses; `HttpError`'s constructor refuses any other status; malformed JSON is **400 `MALFORMED_BODY`**; a `ValidationError` produces **422 `VALIDATION_FAILED`** with a `fields` array of **field names only**. The public body is `{ code, requestId }` for every failure, plus `fields` **only** on a 422.

---

## Implementation tasks

### 1 — Add the documented catalogue and guard the constructor

**File:** `api/src/platform/http/errors.js`

Add, above `class HttpError`, a frozen map from status to canonical code, with a
comment citing `E-2` and a forward-looking `TODO` for 501 in the same
`TODO(<full-id>/<key>)` form the codebase already uses (the very
`TODO(PLATFORM-5-API/CRM-20)` this story removes):

```javascript
// E-2 (scripts/rules.txt line 28): every failure returns its documented code.
// This is the whole set — a status outside it is a bug, and the HttpError
// constructor (below) throws on it. That guard is the enforcement; one unit
// test on it is the proof.
// TODO(CHANNELS-2-API/CRM-119): 501 joins this map in that story. It owns rule
// E-3 ("named and deliberately not built"), and until the entry exists the
// constructor guard rejects new HttpError(501, ...).
export const DOCUMENTED = Object.freeze({
  400: 'BAD_REQUEST',
  401: 'UNAUTHENTICATED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  422: 'VALIDATION_FAILED',
  429: 'RATE_LIMITED',
  500: 'INTERNAL',
});
```

In the `HttpError` constructor, after `super(code)` and before assigning
`this.status`, reject an undocumented status:

```javascript
constructor(status, code, cause) {
  super(code);
  if (!Object.hasOwn(DOCUMENTED, status)) {
    throw new RangeError(`HttpError: ${status} is not a documented status`);
  }
  this.status = status;
  this.code = code;
  this.cause = cause;
}
```

- Keep the third positional `cause` param — no call site passes it today
  (`grep` confirms) and PLATFORM-6-API (CRM-21) is expected to read it.
- A **specific** code at a documented status stays legal — `new HttpError(409,
  'REVISION_MISMATCH')` still works; only the *status* is checked. This mirrors
  how the codebase already uses a domain code at 409.
- `DOCUMENTED[500]` is `'INTERNAL'` and `DOCUMENTED[404]` is `'NOT_FOUND'` —
  identical to the strings `errorHandler` and `notFoundHandler` already emit,
  so no existing behaviour changes.

### 2 — Add the 422 carrier

**File:** `api/src/platform/http/errors.js`

Add a subclass so the extra structure is discoverable and `errorHandler` has a
single `instanceof` to test:

```javascript
// well-formed but invalid (docs/architecture.md line 36: schema layer -> 422).
// `fields` is a list of FIELD NAMES ONLY — never a submitted value. A value
// can be a password or personal data; it must not return to the client or
// enter a log. The constructor enforces this: it keeps only strings and drops
// anything else. This is the one shape variation E-1 allows, and only at 422.
// Feature schema layers construct this; this story only defines it.
export class ValidationError extends HttpError {
  constructor(fields, cause) {
    super(422, 'VALIDATION_FAILED', cause);
    this.fields = Array.isArray(fields)
      ? fields.filter((f) => typeof f === 'string')
      : [];
  }
}

export function unprocessable(fields, cause) {
  return new ValidationError(fields, cause);
}
```

- If a future story needs a per-field reason (`required`, `too_long`), it
  widens `fields` to `{ field, rule }` with `rule` drawn from a **fixed
  vocabulary** — never interpolated from input — and takes its own review.
  This story ships names only.

### 3 — Serialise `fields` on a 422, and only there

**File:** `api/src/platform/http/errors.js`, inside `errorHandler`

The body assembly (currently `res.status(status).json({ code, requestId: req.id ?? null })`)
becomes:

```javascript
const body = { code, requestId: req.id ?? null };
if (err instanceof ValidationError && err.fields.length > 0) {
  body.fields = err.fields;
}
res.setHeader('Content-Type', 'application/json; charset=utf-8');
res.status(status).json(body);
```

- No `fields` key for any non-422 error, and none for a 422 with an empty
  list — the existing "exactly `['code', 'requestId']`" test keeps passing.
- The `res.headersSent` delegate path (lines 34–39) is untouched.
- The unknown-error coercion (`known ? … : 500 / 'INTERNAL'`) is untouched —
  an error the catalogue never mapped is still `500 INTERNAL` with nothing
  else (`## Done Criteria`: "an error the catalogue never mapped").
- Delete the `TODO(PLATFORM-5-API/CRM-20)` comment at lines 29–31 now that it
  is done; replace it with one line stating services throw `HttpError` /
  `ValidationError` and this handler is still the only status decider.

### 4 — Map a malformed JSON body to 400

**Create file:** `api/src/platform/http/json-errors.js`

An Express **error-handling** middleware (4-arity) that catches `express.json()`'s
parse failure and rethrows it as a documented `HttpError`. Match the
`platform/http/` house style (header comment explaining *why*, factory that
returns the middleware, no `express` import):

```javascript
import { HttpError } from './errors.js';

// express.json() rejects a bad body with a SyntaxError carrying
// err.type === 'entity.parse.failed' (body-parser/lib/read.js). It is not an
// HttpError, so without this it reaches errorHandler as an unknown error and
// becomes 500. E-2 says a malformed body is a client fault: 400.
// Charset/encoding faults on the body are the same class of "we could not read
// what you sent" and map here too. A too-large body (err.type
// 'entity.too.large', 413) is NOT remapped here — the body ceiling and its
// response are PLATFORM-6-API (CRM-21); today it still falls through to 500.
const MALFORMED = new Set([
  'entity.parse.failed',
  'charset.unsupported',
  'encoding.unsupported',
]);

export function jsonBodyErrors() {
  return (err, _req, _res, next) => {
    if (err && MALFORMED.has(err.type)) {
      next(new HttpError(400, 'MALFORMED_BODY', err));
      return;
    }
    next(err);
  };
}
```

### 5 — Mount the mapper in the chain

**File:** `api/src/app.js`

- Add `import { jsonBodyErrors } from './platform/http/json-errors.js';`
  alongside the other `platform/http/*` imports (lines 3–6).
- Insert `app.use(jsonBodyErrors());` on the line **immediately after**
  `app.use(express.json({ limit: '100kb' }));` (currently line 24) and **before**
  `app.use(attachSubject(deps.subjectResolver));` (currently line 30). An
  error-handling middleware placed here only runs when `express.json` calls
  `next(err)`; on the happy path it is skipped.
- Do **not** touch the order or presence of `requestId`, `securityHeaders`,
  `express.json`, `attachSubject`, `mountTestRoutes`, `notFoundHandler`,
  `errorHandler`.

### 6 — Unit tests for the new `errors.js` surface

**File:** `api/src/platform/http/errors.test.js`

The constructor guard is the structural enforcement; these cases are its whole
proof. **No source-text scan of `new HttpError(` call sites** — a file-content
structure check is PLATFORM-15-ALL-structure-check (CRM-30)'s concern, not
this story's.

Add `test(...)` cases (stub `req`/`res`/`next`, no listener — match the file):

1. `new HttpError(418, 'TEAPOT')` throws `RangeError`; `new HttpError(501, 'NOT_IMPLEMENTED')` also throws (proves 501 is not yet in the catalogue); `new HttpError(429, 'RATE_LIMITED')` does not throw.
2. `new HttpError(409, 'REVISION_MISMATCH')` still constructs (a specific code at a documented status).
3. `DOCUMENTED` has exactly the keys `[400, 401, 403, 404, 409, 422, 429, 500]` (`Object.keys(DOCUMENTED).map(Number).sort((a, b) => a - b)` deep-equals that list) and is frozen (`Object.isFrozen(DOCUMENTED)`). A future edit that adds `418` or drops `429` fails here.
4. `unprocessable(['email'])` is an `instanceof HttpError` and `instanceof ValidationError`, `status === 422`, `code === 'VALIDATION_FAILED'`, `fields` deep-equals `['email']`.
5. `unprocessable(['email', 42, { field: 'name' }])` keeps only the string — `fields` deep-equals `['email']` (proves no non-string, hence no submitted value, survives).
6. `errorHandler` on `unprocessable(['email'])` writes body with keys sorted `['code', 'fields', 'requestId']`, `body.fields` deep-equals `['email']`, `statusCode === 422`.
7. `errorHandler` on `unprocessable([])` (empty list) writes **no** `fields` key — keys `['code', 'requestId']`.

### 7 — Unit test for `json-errors.js`

**Create file:** `api/src/platform/http/json-errors.test.js`

Match `errors.test.js`'s stub style. Cases:

1. Given `err = Object.assign(new SyntaxError('bad'), { type: 'entity.parse.failed', status: 400 })`, the middleware calls `next(e)` where `e instanceof HttpError`, `e.status === 400`, `e.code === 'MALFORMED_BODY'`, and `e.cause === err`.
2. Given `err = { type: 'entity.too.large', status: 413 }`, the middleware calls `next(err)` **unchanged** (413 is not this story's concern).
3. Given no error (`next()` path is not exercised — this is an error middleware) — instead: given `err = new Error('unrelated')` with no `type`, it calls `next(err)` unchanged.

### 8 — End-to-end tests through `createApp`

**File:** `api/src/app.test.js`

Reuse `start(mountTestRoutes, subjectResolver)` (lines 16–21) and `UUID`
(line 11). Add:

1. `test('a malformed JSON body returns 400 MALFORMED_BODY in the documented shape')` — `fetch(url + '/anything', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{ not json' })`. No route need be mounted — the parse error fires before routing. Assert `res.status === 400`, body keys exactly `['code', 'requestId']`, `body.code === 'MALFORMED_BODY'`, `body.requestId` matches `UUID`, and the `X-Request-Id` response header is present.
2. `test('a well-formed JSON body still reaches the handler')` — mount `app.post('/echo', (req, res) => res.json(req.body))`; POST `{"a":1}` with the JSON content type; assert `200` and body `{ a: 1 }`. Guards against the mapper swallowing good requests.
3. `test('a route that throws a ValidationError returns 422 with field names only')` — mount `app.get('/v', () => { throw unprocessable(['name', 'email']); })`; assert `res.status === 422`, `body.code === 'VALIDATION_FAILED'`, `body.fields` deep-equals `['name', 'email']`, `body.requestId` matches `UUID`. Import `unprocessable` from `./platform/http/errors.js`.
4. `test('the request id on a 400 malformed-body error is the client-supplied one')` — send `X-Request-Id: trace-body`; assert the response header and `body.requestId` are both `trace-body`. Mirrors lines 122–128.

---

## Edge Cases & Failure Modes

- **Malformed body, no `Content-Type: application/json`** — `express.json()`
  does not parse, no error is raised, the request proceeds with `req.body`
  undefined. Correct: there is no body to be malformed. The e2e test sends the
  JSON content type so the parser actually runs.
- **Oversized body (`> 100kb`)** — body-parser raises `entity.too.large` /
  status 413. `json-errors.js` deliberately does **not** remap it, so it still
  reaches `errorHandler` as an unknown error → `500 INTERNAL`. 413 is not one
  of the eight and the body ceiling is **PLATFORM-6-API (CRM-21)**'s contract
  (`api/src/app.js` lines 22–24); inventing a mapping now would pre-empt it.
  Recorded here so the executor does not "fix" it.
- **`new HttpError(status, code)` with a non-integer or string status** —
  `Object.hasOwn(DOCUMENTED, status)` is `false` for `NaN` and for a mistyped
  status; the constructor throws `RangeError`. (`'400'` as a string key *does*
  match — `Object.hasOwn` coerces — which is harmless: it still resolves to a
  documented status.) A caller should pass the numeric literal. Covered by
  Task 6 case 1.
- **`new HttpError(501, …)` before CHANNELS-2-API (CRM-119)** — the constructor
  throws, by design. The `TODO(CHANNELS-2-API/CRM-119)` beside `DOCUMENTED`
  says why and who lifts it. Covered by Task 6 case 1.
- **`unprocessable(undefined)` / `unprocessable('oops')` / `unprocessable([42, {v:1}])`** —
  `fields` falls back to `[]` or is filtered to strings only, so `errorHandler`
  emits no `fields` key or a names-only list, never a submitted value. Covered
  by Task 6 cases 4–5.
- **`res.headersSent` already true when a `ValidationError` surfaces** — the
  existing delegate branch (lines 34–39) runs first and `next(err)` hands off
  to Express's finaliser; no `fields` body is written. Unchanged by this story.
- **`errorHandler` gates `body.fields` on `instanceof ValidationError`, not on
  `status === 422`** — deliberate: `ValidationError`'s constructor hard-codes
  `super(422, 'VALIDATION_FAILED', …)`, so the two cannot disagree without
  someone mutating `err.status` after construction, which no code path does.

---

## Test Plan

New unit test file:

1. `api/src/platform/http/json-errors.test.js` — 3 cases (Task 7), stub style
   from `errors.test.js`.

Extended test files:

2. `api/src/platform/http/errors.test.js` — 7 new cases (Task 6), including the
   constructor-guard proof and the exact-keys pin for `DOCUMENTED`. The
   existing 4 tests are unchanged; the "exactly `['code', 'requestId']`" test
   at lines 53–60 must still pass.
3. `api/src/app.test.js` — 4 new cases (Task 8), reusing `start(...)` and
   `UUID`. The existing 9 tests are unchanged.

There is **no** tree-walk / source-scan test — the constructor guard is the
enforcement (see Task 6); a file-content check belongs to
PLATFORM-15-ALL-structure-check (CRM-30).

Regression:

4. Run the whole `api` suite. Baseline is **40 tests** (`cd api && npm test`).
   Expected after this story: 40 + 7 + 3 + 4 = **54**. No existing test is
   edited; if one needs editing, the change is out of scope and belongs in its
   own commit.

Assert on **exact** statuses (`400`, `422`) and **exact** codes
(`MALFORMED_BODY`, `VALIDATION_FAILED`). A test that only checks `>= 400`
accepts the regression this story refuses.

---

## Verification Steps

1. **Backend tests:**
   ```
   cd api && npm test
   ```
   All 54 pass. `json-errors.test.js` is new; `errors.test.js` and
   `app.test.js` gained cases; nothing regressed.
2. **The malformed-body path by hand:**
   ```
   cd api && node --test src/app.test.js
   ```
   `a malformed JSON body returns 400 MALFORMED_BODY in the documented shape`
   passes — the status is 400, not 500, and the body is `{ code, requestId }`.
3. **The catalogue guard by hand:**
   ```
   cd api && node --input-type=module -e "import('./src/platform/http/errors.js').then(m => { try { new m.HttpError(418, 'X'); console.log('NO GUARD'); } catch (e) { console.log('guarded:', e.constructor.name); } })"
   ```
   Prints `guarded: RangeError`.
4. **Grep — the additions are new and contained:**
   ```
   grep -rn "MALFORMED_BODY\|VALIDATION_FAILED\|RATE_LIMITED\|ValidationError\|DOCUMENTED" api/src
   ```
   Matches only in `errors.js`, `json-errors.js`, their `.test.js` files, and
   the new `app.test.js` cases. Nothing under `api/src/features/` (none exists
   yet).
5. **Chain order unchanged:**
   Read `api/src/app.js` end to end. The order is `requestId` →
   `securityHeaders` → `express.json` → `jsonBodyErrors` → `attachSubject` →
   `mountTestRoutes?` → `notFoundHandler` → `errorHandler`. The parse mapper is
   the only insertion.
6. **No AI attribution on the branch:**
   ```
   git log --format='%B' CRM-20-error-contract ^sprint-0 | grep -iE 'co-authored-by|generated with|claude|anthropic|copilot|chatgpt|🤖'
   ```
   Prints nothing.

---

## Migration / Rollback

No schema, no data, no config change. Rollback is `git revert` of the story
merge; the only externally visible change is that a malformed JSON body returns
400 instead of 500 and a 422 body may carry a `fields` array — both additive to
the contract, neither breaks an existing consumer (there are no HTTP consumers
yet; `web` is not built until PLATFORM-9-WEB / CRM-24).

---

## Done Criteria

- [x] `api/src/platform/http/errors.js` exports a frozen `DOCUMENTED` map of exactly `{400,401,403,404,409,422,429,500}` → canonical code, carrying a comment that cites `E-2` and a `TODO(CHANNELS-2-API/CRM-119)` for the not-yet-added 501.
- [x] `HttpError`'s constructor throws `RangeError` for any status not in `DOCUMENTED` (501 included, for now); `new HttpError(409, 'REVISION_MISMATCH')` and the three `permission.js` call sites still work unchanged. One unit test is the whole proof — there is no source-text scan of call sites (that is CRM-30's job).
- [x] `ValidationError` / `unprocessable(fields)` exist; `fields` is field **names only** — the constructor drops every non-string, so no submitted value can reach the body or a log. A thrown `ValidationError` produces `422` with `{ code: 'VALIDATION_FAILED', requestId, fields }`, and `fields` appears **only** for a non-empty 422.
- [x] A plain `Error` and every non-422 `HttpError` still produce a body of exactly `{ code, requestId }` — the `errors.test.js` keys test is untouched and green.
- [x] A malformed JSON request body returns `400 MALFORMED_BODY` in the documented shape, with the client's `X-Request-Id` when supplied; a well-formed body still reaches its handler.
- [x] An error the catalogue never mapped still returns `500 INTERNAL` with no internal detail.
- [x] `api/src/platform/http/json-errors.js` is mounted in `createApp` immediately after `express.json(...)` and before `attachSubject(...)`; no other chain step moved.
- [x] `429` resolves to `RATE_LIMITED` in `DOCUMENTED`; no limiter, middleware, or config for rate limiting was added.
- [x] The `TODO(PLATFORM-5-API/CRM-20)` comment in `errors.js` is gone, replaced by a line stating services throw `HttpError` / `ValidationError` and `errorHandler` remains the only status decider.
- [x] `cd api && npm test` reports 54 passing, 0 failing; no pre-existing test file lost a case.
- [x] Story branch `CRM-20-error-contract` cut from `sprint-0` and merged back with `--no-ff`; `git log` on the branch shows no AI attribution (`docs/git.md` lines 50–56).

**STOP HERE. Report to the user and wait for confirmation before proceeding to Story 07.**
