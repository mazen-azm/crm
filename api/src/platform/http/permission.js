// Every rule is enforced in the API (SC-2, scripts/rules.txt line 37): the
// decision is taken here, before any feature service runs. Services trust
// that req.subject is either the authenticated subject or null, and that
// requireSubject/requirePermission threw before them if the request was
// not allowed.
//
// The subject shape is opaque on purpose — IDENTITY-1-API (CRM-41) fixes
// it. This file only owns the seam.

import { HttpError } from './errors.js';

// A resolver returns the authenticated subject for a request, or null when
// the request carries no credential. The default resolver is null-only,
// because sprint-0 has no identity yet; IDENTITY-1-API plugs in the real one.
export function attachSubject(resolver = async () => null) {
  return async (req, _res, next) => {
    try {
      const subject = await resolver(req);
      req.subject = subject ?? null;
      next();
    } catch (err) {
      next(err);
    }
  };
}

// Turn "no authenticated subject" into the documented 401 shape. Every route
// that is not deliberately public places this (or requirePermission, which
// implies it) before its handler.
export function requireSubject() {
  return (req, _res, next) => {
    if (req.subject == null) {
      next(new HttpError(401, 'UNAUTHENTICATED'));
      return;
    }
    next();
  };
}

// The policy is a pure function of (subject, req). It returns true, false, or
// a Promise of either. Only a strict true permits — a buggy policy that
// returns the subject instead of a boolean denies rather than silently
// permits. Throwing inside the policy surfaces as 500/INTERNAL through the
// existing error handler: a policy that throws is a bug, not a denial.
export function requirePermission(policy) {
  if (typeof policy !== 'function') {
    throw new TypeError('requirePermission(policy): policy must be a function');
  }
  return async (req, _res, next) => {
    if (req.subject == null) {
      next(new HttpError(401, 'UNAUTHENTICATED'));
      return;
    }
    try {
      const allowed = await policy(req.subject, req);
      if (allowed !== true) {
        next(new HttpError(403, 'FORBIDDEN'));
        return;
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}
