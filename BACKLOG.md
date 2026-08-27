# The backlog

Generated from `scripts/backlog.txt` by `scripts/generate.mjs`. Never edited by hand.

**15 features · 90 capabilities · 138 story units · 480 points · 13 blocks**

An id reads feature–number–layer; the folder adds what it does: `TCK-2-WEB-queue-filter-sort`.

## Blocks

| Block | Pts | Units | Roots | Features touched |
|---|---|---|---|---|
| 0 | 41 | 10 | ALL API WEB | Platform |
| 1 | 41 | 10 | ALL API WEB | Platform, Languages, Identity, Audit |
| 2 | 33 | 10 | ALL API WEB | Platform, Languages, Identity, Customers |
| 3 | 43 | 11 | API WEB | Tickets, Service levels |
| 4 | 31 | 9 | API WEB | Platform, Customers, Tickets |
| 5 | 40 | 12 | API WEB | Identity, Customers, Channels, Portal |
| 6 | 44 | 16 | API WEB | Tickets, Conversation, Portal |
| 7 | 32 | 10 | API WEB | Identity, Customers, Tickets, Notifications |
| 8 | 33 | 9 | API WEB | Service levels, Notifications, Audit |
| 9 | 28 | 9 | API WEB | Identity, Reports |
| 10 | 33 | 10 | MOB | Platform, Languages, Identity, Customers, Tickets, Conversation, Service levels |
| 11 | 40 | 10 | API WEB | Tickets, Knowledge base |
| 12 | 41 | 12 | ALL API WEB | Platform, Reports, Satisfaction, Assist |

## Features

### Platform · `platform` · PLT

The repository, the schema, the chain, the checks, and the design foundations

| Unit | Folder | Actor | Title | Block | Pts | Rules | Needs |
|---|---|---|---|---|---|---|---|
| `PLT-1-ALL` | `PLT-1-ALL-repo-conventions` | developer | the repository, its ignore rules and its branch conventions | 0 | 3 | — | — |
| `PLT-2-API` | `PLT-2-API-schema-migrations` | system | the schema, migrations that run once, and the four queue indexes | 0 | 5 | BR-1 | `PLT-1-ALL` |
| `PLT-3-API` | `PLT-3-API-request-chain` | system | the chain: wiring, one error middleware, a request id, security headers | 0 | 5 | E-1 | `PLT-2-API` |
| `PLT-4-API` | `PLT-4-API-permission-middleware` | system | permission is decided in middleware before any service runs | 0 | 5 | SC-2 | `PLT-3-API` |
| `PLT-5-API` | `PLT-5-API-error-contract` | client | every failure returns its documented code and one shape | 0 | 3 | E-1 E-2 | `PLT-3-API` |
| `PLT-6-API` | `PLT-6-API-api-versioning` | system | /api/v1, a maximum page size, health, and structured logging | 0 | 3 | BR-4 | `PLT-3-API` |
| `PLT-7-API` | `PLT-7-API-openapi-contract` | system | an API document checked against the routes actually served | 0 | 5 | — | `PLT-6-API` |
| `PLT-8-API` | `PLT-8-API-seed-reference-data` | system | the seed fills reference data and can be run twice | 0 | 2 | SC-3 | `PLT-2-API` |
| `PLT-9-WEB` | `PLT-9-WEB-react-skeleton` | developer | a React skeleton: router, auth context, client, loading hook | 0 | 5 | — | `PLT-6-API` |
| `PLT-10-WEB` | `PLT-10-WEB-design-tokens` | developer | one palette, one file: tokens and primitives, both directions | 0 | 5 | D-1 BR-6 | `PLT-9-WEB` |
| `PLT-11-WEB` | `PLT-11-WEB-web-test-setup` | developer | the web application has a test setup and its first tests | 1 | 5 | — | `PLT-9-WEB` |
| `PLT-12-WEB` | `PLT-12-WEB-desk-shell` | agent | the desk has one shell: navigation, header, theme | 2 | 5 | D-1 | `PLT-10-WEB` |
| `PLT-13-ALL` | `PLT-13-ALL-ci-pipeline` | developer | the suite runs on every push and a red suite blocks a merge | 1 | 3 | — | `PLT-11-WEB` |
| `PLT-14-ALL` | `PLT-14-ALL-backlog-check` | developer | the backlog, its rules and every cited path are checked by a script | 1 | 5 | — | `PLT-1-ALL` |
| `PLT-15-ALL` | `PLT-15-ALL-structure-check` | developer | the structure rules are enforced by a script, in every root | 2 | 5 | — | `PLT-13-ALL` |
| `PLT-16-WEB` | `PLT-16-WEB-designed-states` | agent | empty, loading and error states are designed, not accidental | 2 | 3 | D-2 | `PLT-12-WEB` |
| `PLT-17-API` | `PLT-17-API-seed-tickets` | system | the seed walks tickets through the real state machine | 4 | 3 | SC-3 | `TCK-4-API` |
| `PLT-18-MOB` | `PLT-18-MOB-compose-skeleton` | developer | a Compose skeleton: networking, injection, navigation, the same palette | 10 | 5 | D-1 | `IDN-1-API` |
| `PLT-19-ALL` | `PLT-19-ALL-hardening-sweep` | system | hardening: a rate-limit sweep, an error audit, the README, screenshots | 12 | 8 | — | — |

### Languages · `languages` · LNG

Two languages, both directions, in resource files

| Unit | Folder | Actor | Title | Block | Pts | Rules | Needs |
|---|---|---|---|---|---|---|---|
| `LNG-1-WEB` | `LNG-1-WEB-strings-in-resources` | developer | every string in a resource file, in both languages | 1 | 3 | BR-6 | `PLT-9-WEB` |
| `LNG-1-MOB` | `LNG-1-MOB-strings-in-resources` | developer | every string in a resource file, in both languages | 10 | 3 | BR-6 | `PLT-9-WEB` |
| `LNG-2-WEB` | `LNG-2-WEB-arabic-flip` | agent | switching to Arabic flips the interface without a restart | 2 | 3 | BR-6 | `LNG-1-WEB` |
| `LNG-2-MOB` | `LNG-2-MOB-arabic-flip` | agent | switching to Arabic flips the interface without a restart | 10 | 3 | BR-6 | `LNG-1-WEB` |
| `LNG-3-WEB` | `LNG-3-WEB-locale-formats` | agent | dates and numbers read the way my locale writes them | 2 | 3 | BR-3 | `LNG-2-WEB` |
| `LNG-4-ALL` | `LNG-4-ALL-missing-key-fails` | developer | a key missing from one language fails the build | 2 | 2 | BR-6 | `LNG-1-WEB` |

### Identity · `identity` · IDN

Sign-in, users, roles, throttling, passwords, sessions

| Unit | Folder | Actor | Title | Block | Pts | Rules | Needs |
|---|---|---|---|---|---|---|---|
| `IDN-1-API` | `IDN-1-API-sign-in` | agent | I sign in and reach my queue | 1 | 5 | I-3 SC-2 | `PLT-4-API` |
| `IDN-1-WEB` | `IDN-1-WEB-sign-in` | agent | I sign in and reach my queue | 1 | 5 | I-3 SC-2 | `PLT-4-API` |
| `IDN-1-MOB` | `IDN-1-MOB-sign-in` | agent | I sign in and reach my queue | 10 | 3 | I-3 SC-2 | `PLT-4-API` |
| `IDN-2-API` | `IDN-2-API-manage-accounts` | admin | I create, disable and re-enable accounts, and set roles | 1 | 5 | I-3 BR-2 | `IDN-1-API` |
| `IDN-2-WEB` | `IDN-2-WEB-manage-accounts` | admin | I create, disable and re-enable accounts, and set roles | 9 | 5 | I-3 BR-2 | `IDN-1-API` |
| `IDN-3-WEB` | `IDN-3-WEB-token-expiry` | any | an expired token returns me to sign-in, not a broken screen | 2 | 3 | — | `IDN-1-WEB` |
| `IDN-4-API` | `IDN-4-API-sign-in-throttle` | system | failed sign-ins are throttled per account and per address | 1 | 3 | E-2 | `IDN-1-API` |
| `IDN-5-API` | `IDN-5-API-assignable-agents` | agent | I read the list of people a ticket can be assigned to | 1 | 2 | BR-4 | `IDN-2-API` |
| `IDN-6-API` | `IDN-6-API-admin-set-password` | admin | I set a user's password, so a locked-out person gets back in | 5 | 3 | BR-2 | `IDN-2-API` |
| `IDN-6-WEB` | `IDN-6-WEB-admin-set-password` | admin | I set a user's password, so a locked-out person gets back in | 5 | 2 | BR-2 | `IDN-2-API` |
| `IDN-7-API` | `IDN-7-API-change-own-password` | any | I change my own password, knowing the current one | 5 | 3 | BR-2 | `IDN-1-API` |
| `IDN-7-WEB` | `IDN-7-WEB-change-own-password` | any | I change my own password, knowing the current one | 5 | 2 | BR-2 | `IDN-1-API` |
| `IDN-8-API` | `IDN-8-API-session-invalidation` | any | changing my password ends every other session | 7 | 3 | — | `IDN-7-API` |
| `IDN-9-API` | `IDN-9-API-disable-unassigns` | admin | disabling somebody unassigns their queue and tells me how much | 7 | 5 | BR-2 | `IDN-2-API` `TCK-3-API` |

### Customers · `customers` · CUS

The customer record, contacts, search, identity resolution

| Unit | Folder | Actor | Title | Block | Pts | Rules | Needs |
|---|---|---|---|---|---|---|---|
| `CUS-1-API` | `CUS-1-API-customer-search` | agent | I search by name, address or number | 2 | 3 | BR-4 | `PLT-2-API` |
| `CUS-1-WEB` | `CUS-1-WEB-customer-search` | agent | I search by name, address or number | 2 | 3 | BR-4 | `PLT-2-API` |
| `CUS-2-API` | `CUS-2-API-customer-screen` | agent | contacts, open tickets and history in one screen | 4 | 5 | — | `CUS-1-API` `TCK-1-API` |
| `CUS-2-WEB` | `CUS-2-WEB-customer-screen` | agent | contacts, open tickets and history in one screen | 4 | 5 | — | `CUS-1-API` `TCK-1-API` |
| `CUS-2-MOB` | `CUS-2-MOB-customer-screen` | agent | contacts, open tickets and history in one screen | 10 | 3 | — | `CUS-1-API` `TCK-1-API` |
| `CUS-3-API` | `CUS-3-API-internal-note` | agent | I write an internal note about a customer | 2 | 3 | BR-2 | `CUS-1-API` |
| `CUS-3-WEB` | `CUS-3-WEB-internal-note` | agent | I write an internal note about a customer | 4 | 2 | BR-2 | `CUS-1-API` |
| `CUS-4-API` | `CUS-4-API-add-customer` | agent | I add a customer while I am on the phone to them | 4 | 3 | I-1 | `CUS-1-API` |
| `CUS-4-WEB` | `CUS-4-WEB-add-customer` | agent | I add a customer while I am on the phone to them | 4 | 2 | I-1 | `CUS-1-API` |
| `CUS-5-API` | `CUS-5-API-identity-resolution` | system | an arriving request matches a customer by address, or creates one | 5 | 5 | I-2 I-4 | `CUS-4-API` |
| `CUS-6-API` | `CUS-6-API-grant-sign-in` | agent | I give a customer a sign-in | 5 | 3 | I-1 | `CUS-4-API` `IDN-2-API` |
| `CUS-6-WEB` | `CUS-6-WEB-grant-sign-in` | agent | I give a customer a sign-in | 5 | 2 | I-1 | `CUS-4-API` `IDN-2-API` |
| `CUS-7-API` | `CUS-7-API-correct-contacts` | agent | I correct a customer's contact details | 7 | 3 | BR-2 | `CUS-4-API` |
| `CUS-7-WEB` | `CUS-7-WEB-correct-contacts` | agent | I correct a customer's contact details | 7 | 2 | BR-2 | `CUS-4-API` |
| `CUS-8-API` | `CUS-8-API-soft-delete` | admin | deleting a customer hides them and keeps the audit trail | 7 | 3 | BR-1 BR-2 | `CUS-7-API` |
| `CUS-8-WEB` | `CUS-8-WEB-soft-delete` | admin | deleting a customer hides them and keeps the audit trail | 7 | 2 | BR-1 BR-2 | `CUS-7-API` |

### Tickets · `tickets` · TCK

The ticket, the queue, the state machine, categories, search

| Unit | Folder | Actor | Title | Block | Pts | Rules | Needs |
|---|---|---|---|---|---|---|---|
| `TCK-1-API` | `TCK-1-API-raise-ticket` | agent | I raise a ticket for a customer | 3 | 5 | T-1 SC-1 | `CUS-1-API` `SLA-1-API` |
| `TCK-1-WEB` | `TCK-1-WEB-raise-ticket` | agent | I raise a ticket for a customer | 3 | 5 | T-1 SC-1 | `CUS-1-API` `SLA-1-API` |
| `TCK-2-API` | `TCK-2-API-queue-filter-sort` | agent | I filter and sort the queue; an agent sees all of it | 3 | 5 | BR-4 | `TCK-1-API` |
| `TCK-2-WEB` | `TCK-2-WEB-queue-filter-sort` | agent | I filter and sort the queue; an agent sees all of it | 3 | 5 | BR-4 | `TCK-1-API` |
| `TCK-2-MOB` | `TCK-2-MOB-queue-filter-sort` | agent | I filter and sort the queue; an agent sees all of it | 10 | 5 | BR-4 | `TCK-1-API` |
| `TCK-3-API` | `TCK-3-API-assign-ticket` | agent | I assign a ticket | 3 | 3 | BR-5 BR-2 | `TCK-1-API` `IDN-5-API` |
| `TCK-3-WEB` | `TCK-3-WEB-assign-ticket` | agent | I assign a ticket | 3 | 3 | BR-5 BR-2 | `TCK-1-API` `IDN-5-API` |
| `TCK-3-MOB` | `TCK-3-MOB-assign-ticket` | agent | I assign a ticket | 10 | 3 | BR-5 BR-2 | `TCK-1-API` `IDN-5-API` |
| `TCK-4-API` | `TCK-4-API-status-machine` | system | an illegal status change is refused with what is legal | 3 | 5 | T-1 T-3 T-7 | `TCK-1-API` |
| `TCK-5-API` | `TCK-5-API-resolve-with-note` | agent | resolving a ticket needs a note | 3 | 3 | T-4 | `TCK-4-API` |
| `TCK-5-WEB` | `TCK-5-WEB-resolve-with-note` | agent | resolving a ticket needs a note | 3 | 2 | T-4 | `TCK-4-API` |
| `TCK-6-API` | `TCK-6-API-category-list` | agent | the categories are readable, so a form has something to offer | 3 | 2 | BR-4 | `PLT-8-API` |
| `TCK-7-API` | `TCK-7-API-ticket-history` | agent | I read the whole history in order | 4 | 3 | — | `TCK-1-API` |
| `TCK-7-WEB` | `TCK-7-WEB-ticket-history` | agent | I read the whole history in order | 4 | 3 | — | `TCK-1-API` |
| `TCK-7-MOB` | `TCK-7-MOB-ticket-history` | agent | I read the whole history in order | 10 | 3 | — | `TCK-1-API` |
| `TCK-8-API` | `TCK-8-API-ticket-ownership` | system | a customer may act only on their own ticket, on every path | 4 | 5 | SC-2 | `TCK-1-API` `PLT-4-API` |
| `TCK-9-API` | `TCK-9-API-manage-categories` | admin | I add, rename and retire a category without touching the seed | 6 | 3 | BR-2 BR-1 | `TCK-6-API` `IDN-2-API` |
| `TCK-9-WEB` | `TCK-9-WEB-manage-categories` | admin | I add, rename and retire a category without touching the seed | 6 | 2 | BR-2 BR-1 | `TCK-6-API` `IDN-2-API` |
| `TCK-10-API` | `TCK-10-API-change-category` | agent | I change a ticket's category | 6 | 2 | BR-2 BR-5 | `TCK-6-API` |
| `TCK-10-WEB` | `TCK-10-WEB-change-category` | agent | I change a ticket's category | 6 | 2 | BR-2 BR-5 | `TCK-6-API` |
| `TCK-11-API` | `TCK-11-API-reopen-window` | customer | I reopen a resolved ticket inside the window | 6 | 3 | T-5 | `TCK-4-API` |
| `TCK-11-WEB` | `TCK-11-WEB-reopen-window` | customer | I reopen a resolved ticket inside the window | 6 | 2 | T-5 | `TCK-4-API` |
| `TCK-12-WEB` | `TCK-12-WEB-my-tickets` | agent | my own tickets are one click away | 6 | 2 | — | `TCK-2-WEB` |
| `TCK-13-API` | `TCK-13-API-stale-write-guard` | agent | my change is refused if somebody edited it while I read | 7 | 5 | BR-5 | `TCK-3-API` |
| `TCK-13-WEB` | `TCK-13-WEB-stale-write-guard` | agent | my change is refused if somebody edited it while I read | 7 | 3 | BR-5 | `TCK-3-API` |
| `TCK-14-API` | `TCK-14-API-auto-close` | system | a resolved ticket closes itself once the window passes | 7 | 3 | T-6 | `TCK-11-API` |
| `TCK-15-API` | `TCK-15-API-ticket-search` | agent | I search tickets by their text | 11 | 5 | BR-4 | `TCK-1-API` |
| `TCK-15-WEB` | `TCK-15-WEB-ticket-search` | agent | I search tickets by their text | 11 | 3 | BR-4 | `TCK-1-API` |

### Conversation · `conversation` · CNV

Replies, internal notes, the timeline

| Unit | Folder | Actor | Title | Block | Pts | Rules | Needs |
|---|---|---|---|---|---|---|---|
| `CNV-1-API` | `CNV-1-API-reply-stops-clock` | agent | I reply; the first public reply opens the ticket and stops the clock, once | 6 | 5 | T-2 S-1 | `TCK-7-API` `SLA-1-API` |
| `CNV-1-WEB` | `CNV-1-WEB-reply-stops-clock` | agent | I reply; the first public reply opens the ticket and stops the clock, once | 6 | 3 | T-2 S-1 | `TCK-7-API` `SLA-1-API` |
| `CNV-1-MOB` | `CNV-1-MOB-reply-stops-clock` | agent | I reply; the first public reply opens the ticket and stops the clock, once | 10 | 3 | T-2 S-1 | `TCK-7-API` `SLA-1-API` |
| `CNV-2-API` | `CNV-2-API-note-never-leaks` | agent | my internal note never reaches a customer, in any response | 6 | 5 | SC-2 | `CNV-1-API` |
| `CNV-2-WEB` | `CNV-2-WEB-note-never-leaks` | agent | my internal note never reaches a customer, in any response | 6 | 2 | SC-2 | `CNV-1-API` |
| `CNV-3-API` | `CNV-3-API-customer-reply-reopens` | customer | I reply on my own ticket; replying to a resolved one reopens it | 6 | 3 | T-5 | `CNV-1-API` `TCK-11-API` |
| `CNV-3-WEB` | `CNV-3-WEB-customer-reply-reopens` | customer | I reply on my own ticket; replying to a resolved one reopens it | 6 | 2 | T-5 | `CNV-1-API` `TCK-11-API` |
| `CNV-4-API` | `CNV-4-API-thread-pages` | agent | a long thread pages rather than arriving whole | 6 | 3 | BR-4 | `CNV-1-API` |
| `CNV-4-WEB` | `CNV-4-WEB-thread-pages` | agent | a long thread pages rather than arriving whole | 6 | 2 | BR-4 | `CNV-1-API` |

### Service levels · `service-levels` · SLA

The promise about time, pauses, breaches, escalation

| Unit | Folder | Actor | Title | Block | Pts | Rules | Needs |
|---|---|---|---|---|---|---|---|
| `SLA-1-API` | `SLA-1-API-deadlines-from-priority` | system | a ticket carries both deadlines, from its priority | 3 | 5 | S-1 S-2 S-3 | `PLT-2-API` |
| `SLA-2-API` | `SLA-2-API-paused-time` | agent | time waiting on the customer is not counted against me | 8 | 5 | S-4 | `SLA-1-API` `TCK-4-API` |
| `SLA-3-API` | `SLA-3-API-recorded-breach` | agent | a missed deadline is recorded once and shown on the queue | 8 | 5 | S-5 | `SLA-2-API` |
| `SLA-3-WEB` | `SLA-3-WEB-recorded-breach` | agent | a missed deadline is recorded once and shown on the queue | 8 | 3 | S-5 | `SLA-2-API` |
| `SLA-3-MOB` | `SLA-3-MOB-recorded-breach` | agent | a missed deadline is recorded once and shown on the queue | 10 | 2 | S-5 | `SLA-2-API` |
| `SLA-4-API` | `SLA-4-API-escalation-once` | admin | a missed resolution deadline raises it and tells me, once | 8 | 8 | S-6 | `SLA-3-API` `NTF-1-API` |
| `SLA-5-API` | `SLA-5-API-seed-escalation` | system | the seed runs the escalation once | 8 | 2 | SC-3 | `SLA-4-API` |

### Notifications · `notifications` · NTF

Telling somebody that something happened

| Unit | Folder | Actor | Title | Block | Pts | Rules | Needs |
|---|---|---|---|---|---|---|---|
| `NTF-1-API` | `NTF-1-API-assigned-to-me` | agent | I am told when a ticket becomes mine | 7 | 3 | — | `TCK-3-API` |
| `NTF-2-API` | `NTF-2-API-read-notifications` | any | I read my notifications | 8 | 2 | BR-4 | `NTF-1-API` |
| `NTF-2-WEB` | `NTF-2-WEB-read-notifications` | any | I read my notifications | 8 | 2 | BR-4 | `NTF-1-API` |

### Channels · `channels` · CHN

How a request enters the system from outside — an API seam, not a screen

| Unit | Folder | Actor | Title | Block | Pts | Rules | Needs |
|---|---|---|---|---|---|---|---|
| `CHN-1-API` | `CHN-1-API-channel-interface` | customer | a ticket enters through the channel interface, not around it | 5 | 5 | SC-2 | `TCK-1-API` `CUS-5-API` |
| `CHN-2-API` | `CHN-2-API-unbuilt-says-so` | developer | an unimplemented channel says so rather than failing quietly | 5 | 2 | E-3 | `CHN-1-API` |
| `CHN-3-API` | `CHN-3-API-intake-throttle` | system | the public intake is throttled per address | 5 | 3 | E-2 | `CHN-1-API` |

### Portal · `portal` · POR

The customer-facing surface

| Unit | Folder | Actor | Title | Block | Pts | Rules | Needs |
|---|---|---|---|---|---|---|---|
| `POR-1-WEB` | `POR-1-WEB-raise-without-account` | customer | I raise a ticket without an account | 5 | 5 | — | `CHN-1-API` |
| `POR-2-WEB` | `POR-2-WEB-my-tickets-only` | customer | I sign in and see my tickets and nothing else | 5 | 5 | SC-2 | `CUS-6-API` `TCK-8-API` |
| `POR-3-WEB` | `POR-3-WEB-replies-not-notes` | customer | I read my ticket: the replies, never the internal notes | 6 | 3 | SC-2 | `CNV-2-API` `POR-2-WEB` |

### Reports · `reports` · RPT

Numbers an admin can act on

| Unit | Folder | Actor | Title | Block | Pts | Rules | Needs |
|---|---|---|---|---|---|---|---|
| `RPT-1-API` | `RPT-1-API-queue-by-status` | admin | I see the queue by status | 9 | 3 | — | `TCK-2-API` |
| `RPT-1-WEB` | `RPT-1-WEB-queue-by-status` | admin | I see the queue by status | 9 | 3 | — | `TCK-2-API` |
| `RPT-2-API` | `RPT-2-API-promise-share` | admin | I see what share of tickets met their promise | 9 | 5 | S-5 | `SLA-3-API` |
| `RPT-2-WEB` | `RPT-2-WEB-promise-share` | admin | I see what share of tickets met their promise | 9 | 2 | S-5 | `SLA-3-API` |
| `RPT-3-API` | `RPT-3-API-agent-load` | admin | I see load per agent, idle agents shown as zero | 9 | 3 | — | `TCK-3-API` |
| `RPT-3-WEB` | `RPT-3-WEB-agent-load` | admin | I see load per agent, idle agents shown as zero | 9 | 2 | — | `TCK-3-API` |
| `RPT-4-API` | `RPT-4-API-reader-timezone` | admin | today means today where I am, not in UTC | 9 | 3 | BR-3 | `RPT-1-API` |
| `RPT-4-WEB` | `RPT-4-WEB-reader-timezone` | admin | today means today where I am, not in UTC | 9 | 2 | BR-3 | `RPT-1-API` |
| `RPT-5-WEB` | `RPT-5-WEB-satisfaction-report` | admin | average satisfaction, and how many answers it rests on | 12 | 2 | — | `SAT-2-API` `RPT-1-WEB` |

### Audit · `audit` · AUD

The record of every change

| Unit | Folder | Actor | Title | Block | Pts | Rules | Needs |
|---|---|---|---|---|---|---|---|
| `AUD-1-API` | `AUD-1-API-every-change-audited` | system | every change writes an audit row | 1 | 5 | BR-2 | `PLT-3-API` |
| `AUD-2-API` | `AUD-2-API-read-audit-log` | admin | I read the audit log filtered by person, thing or date | 8 | 3 | BR-4 | `AUD-1-API` |
| `AUD-2-WEB` | `AUD-2-WEB-read-audit-log` | admin | I read the audit log filtered by person, thing or date | 8 | 3 | BR-4 | `AUD-1-API` |

### Knowledge base · `knowledge-base` · KB

Articles, published, versioned and searched

| Unit | Folder | Actor | Title | Block | Pts | Rules | Needs |
|---|---|---|---|---|---|---|---|
| `KB-1-API` | `KB-1-API-write-publish` | admin | I write and publish an article in both languages | 11 | 5 | BR-6 BR-5 | `PLT-4-API` |
| `KB-1-WEB` | `KB-1-WEB-write-publish` | admin | I write and publish an article in both languages | 11 | 5 | BR-6 BR-5 | `PLT-4-API` |
| `KB-2-API` | `KB-2-API-article-search` | agent | I search articles by their text | 11 | 5 | BR-4 | `KB-1-API` |
| `KB-2-WEB` | `KB-2-WEB-article-search` | agent | I search articles by their text | 11 | 3 | BR-4 | `KB-1-API` |
| `KB-3-WEB` | `KB-3-WEB-article-into-reply` | agent | I put an article into a reply as editable text | 11 | 3 | — | `KB-2-WEB` `CNV-1-WEB` |
| `KB-4-API` | `KB-4-API-public-articles` | customer | I read and search published articles without signing in | 11 | 3 | — | `KB-2-API` |
| `KB-4-WEB` | `KB-4-WEB-public-articles` | customer | I read and search published articles without signing in | 11 | 3 | — | `KB-2-API` |
| `KB-5-API` | `KB-5-API-edits-kept` | admin | an article's edits are kept, so a bad one is recoverable | 11 | 5 | BR-1 | `KB-1-API` |

### Satisfaction · `satisfaction` · SAT

Ratings, and the number they add up to

| Unit | Folder | Actor | Title | Block | Pts | Rules | Needs |
|---|---|---|---|---|---|---|---|
| `SAT-1-API` | `SAT-1-API-rate-once` | customer | I say whether the answer helped, once | 12 | 3 | — | `TCK-4-API` `POR-2-WEB` |
| `SAT-1-WEB` | `SAT-1-WEB-rate-once` | customer | I say whether the answer helped, once | 12 | 2 | — | `TCK-4-API` `POR-2-WEB` |
| `SAT-2-API` | `SAT-2-API-ratings-become-number` | admin | the ratings become a number I can act on | 12 | 3 | — | `SAT-1-API` |

### Assist · `assist` · AST

The AI helper, its seam, and its fallback

| Unit | Folder | Actor | Title | Block | Pts | Rules | Needs |
|---|---|---|---|---|---|---|---|
| `AST-1-API` | `AST-1-API-assist-seam` | developer | one interface, a recorded stub, and a rate limit | 12 | 5 | — | `PLT-3-API` |
| `AST-2-API` | `AST-2-API-summarise` | agent | I summarise a long ticket | 12 | 3 | — | `AST-1-API` `CNV-4-API` |
| `AST-2-WEB` | `AST-2-WEB-summarise` | agent | I summarise a long ticket | 12 | 2 | — | `AST-1-API` `CNV-4-API` |
| `AST-3-API` | `AST-3-API-draft-not-sent` | agent | I get a draft I edit before sending; nothing is sent for me | 12 | 5 | — | `AST-1-API` |
| `AST-3-WEB` | `AST-3-WEB-draft-not-sent` | agent | I get a draft I edit before sending; nothing is sent for me | 12 | 3 | — | `AST-1-API` |
| `AST-4-API` | `AST-4-API-fallback` | agent | when the assist is unavailable the ticket still works | 12 | 3 | — | `AST-1-API` |
| `AST-4-WEB` | `AST-4-WEB-fallback` | agent | when the assist is unavailable the ticket still works | 12 | 2 | — | `AST-1-API` |

## Rules and their owners

| Rule | Owned by |
|---|---|
| `BR-1` | `PLT-2` `CUS-8` `TCK-9` `KB-5` |
| `BR-2` | `IDN-2` `IDN-6` `IDN-7` `IDN-9` `CUS-3` `CUS-7` `CUS-8` `TCK-3` `TCK-9` `TCK-10` `AUD-1` |
| `BR-3` | `LNG-3` `RPT-4` |
| `BR-4` | `PLT-6` `IDN-5` `CUS-1` `TCK-2` `TCK-6` `TCK-15` `CNV-4` `NTF-2` `AUD-2` `KB-2` |
| `BR-5` | `TCK-3` `TCK-10` `TCK-13` `KB-1` |
| `BR-6` | `PLT-10` `LNG-1` `LNG-2` `LNG-4` `KB-1` |
| `T-1` | `TCK-1` `TCK-4` |
| `T-2` | `CNV-1` |
| `T-3` | `TCK-4` |
| `T-4` | `TCK-5` |
| `T-5` | `TCK-11` `CNV-3` |
| `T-6` | `TCK-14` |
| `T-7` | `TCK-4` |
| `S-1` | `CNV-1` `SLA-1` |
| `S-2` | `SLA-1` |
| `S-3` | `SLA-1` |
| `S-4` | `SLA-2` |
| `S-5` | `SLA-3` `RPT-2` |
| `S-6` | `SLA-4` |
| `E-1` | `PLT-3` `PLT-5` |
| `E-2` | `PLT-5` `IDN-4` `CHN-3` |
| `E-3` | `CHN-2` |
| `I-1` | `CUS-4` `CUS-6` |
| `I-2` | `CUS-5` |
| `I-3` | `IDN-1` `IDN-2` |
| `I-4` | `CUS-5` |
| `SC-1` | `TCK-1` |
| `SC-2` | `PLT-4` `IDN-1` `TCK-8` `CNV-2` `CHN-1` `POR-2` `POR-3` |
| `SC-3` | `PLT-8` `PLT-17` `SLA-5` |
| `D-1` | `PLT-10` `PLT-12` `PLT-18` |
| `D-2` | `PLT-16` |
