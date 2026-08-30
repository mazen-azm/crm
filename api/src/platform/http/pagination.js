import { unprocessable } from './errors.js';

// A ceiling — one page cannot be larger than this. BR-4 (scripts/rules.txt
// line 8): refuse, do not clamp. A caller that asked for 500 has a bug worth
// surfacing, and two clients that silently disagree about "one page" hide it.
const DEFAULT_LIMIT = 20;
// Exported so a feature that reads a bounded list without a caller-supplied
// window can use the same ceiling rather than inventing one. A second number
// would be a second answer to "how big can a page be".
export const MAX_LIMIT = 100;

// Reads the page window off a request, or refuses it. Every rejection names
// the offending parameter and nothing else — a 422 carries field names, never
// the value the caller sent.
export function readPagination(req, { defaultLimit = DEFAULT_LIMIT, maxLimit = MAX_LIMIT } = {}) {
  const query = req.query ?? {};

  let limit = defaultLimit;
  if (query.limit !== undefined) {
    limit = Number.parseInt(query.limit, 10);
    if (!Number.isInteger(limit) || limit <= 0 || limit > maxLimit) {
      throw unprocessable(['limit']);
    }
  }

  let offset = 0;
  if (query.offset !== undefined) {
    offset = Number.parseInt(query.offset, 10);
    if (!Number.isInteger(offset) || offset < 0) {
      throw unprocessable(['offset']);
    }
  }

  return { limit, offset };
}
