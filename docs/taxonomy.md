# Taxonomy — one name per thing

The slug below is the folder name — in `api/src/features/`, in `.squad/stories/`,
in `.squad/plans/`, and (uppercased) in every story id. It is never abbreviated
in one place and spelled out in another. There are no prefixes: the id spells
the feature out in full.

| Slug | Owns |
|---|---|
| `platform` | The repository, the schema, the chain, the checks, and the design foundations |
| `languages` | Two languages, both directions, in resource files |
| `identity` | Sign-in, users, roles, throttling, passwords, sessions |
| `customers` | The customer record, contacts, search, identity resolution |
| `tickets` | The ticket, the queue, the state machine, categories, search |
| `conversation` | Replies, internal notes, the timeline |
| `service-levels` | The promise about time, pauses, breaches, escalation |
| `notifications` | Telling somebody that something happened |
| `channels` | How a request enters the system from outside — an API seam, not a screen |
| `portal` | The customer-facing surface |
| `reports` | Numbers an admin can act on |
| `audit` | The record of every change |
| `knowledge-base` | Articles, published, versioned and searched |
| `satisfaction` | Ratings, and the number they add up to |
| `assist` | The AI helper, its seam, and its fallback |

## The id

```
TICKETS-2-WEB-queue-filter-sort
│       │ │   └── what it does (2–4 words, kebab-case)
│       │ └── layer: API · WEB · MOB · ALL
│       └── number inside the feature
└── the feature, spelled out in full
```

Every id carries its layer, including the API one — "no suffix means API"
living only in somebody's head is how the first attempt lost its map.

There is no feature named backend, web or mobile. Those are **layers**,
carried as plain labels (`backend` / `web` / `mobile` / `shared`) on every
story. A folder named after a layer puts *sign in on a phone* next to
*read a report on a phone*, which share nothing but a screen size.

A sprint is a **label** (`sprint-N`), not a folder. It says when a story
ships. It never appears in a path.

The tracker is Jira, project **CRM**: 15 epics (one per feature, full name
as the summary) and 138 stories whose summaries begin with the id above.
