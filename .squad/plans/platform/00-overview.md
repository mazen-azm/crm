# platform — plan overview

Entry point for the **platform** feature. Stories execute in order by their `NN` prefix.

## Stories

| NN | File | Title | Tracker id | Depends on |
|----|------|-------|------------|------------|
| _add rows as stories are planned_ |
| 01 | `01-story-CRM-16.md` | PLATFORM-1-ALL developer — the repository, its ignore rules and its branch conventions | CRM-16 | — |
| 03 | `03-story-CRM-17.md` | PLATFORM-2-API system — the schema, migrations that run once, and the four queue indexes | CRM-17 | — |
| 04 | `04-story-CRM-18.md` | PLATFORM-3-API system — the chain: wiring, one error middleware, a request id, security headers | CRM-18 | — |
| 05 | `05-story-CRM-19.md` | PLATFORM-4-API system — permission is decided in middleware before any service runs | CRM-19 | — |
| 06 | `06-story-CRM-20.md` | PLATFORM-5-API client — every failure returns its documented code and one shape | CRM-20 | 04 (`04-story-CRM-18.md`) |
| 07 | `07-story-CRM-21.md` | PLATFORM-6-API system — /api/v1, a maximum page size, health, and structured logging | CRM-21 | — |
| 08 | `08-story-CRM-22.md` | PLATFORM-7-API system — an API document checked against the routes actually served | CRM-22 | — |
| 09 | `09-story-CRM-23.md` | PLATFORM-8-API system — the seed fills reference data and can be run twice | CRM-23 | — |
| 10 | `10-story-CRM-24.md` | PLATFORM-9-WEB developer — a React skeleton: router, auth context, client, loading hook | CRM-24 | — |
| 11 | `11-story-CRM-25.md` | PLATFORM-10-WEB developer — one palette, one file: tokens and primitives, both directions | CRM-25 | — |
| 12 | `12-story-CRM-26.md` | PLATFORM-11-WEB developer — the web application has a test setup and its first tests | CRM-26 | — |

## Dependency notes

_Describe sequencing, shared contracts, or cross-feature dependencies here._
