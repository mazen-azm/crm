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

## Dependency notes

_Describe sequencing, shared contracts, or cross-feature dependencies here._
