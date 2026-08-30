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

// Staff, meaning "not a customer".
//
// This exists because adding the `customer` role changed what
// requireSubject() means. Until CUSTOMERS-6-API no customer could hold a
// token, so "is signed in" and "is staff" were the same sentence, and
// seventeen routes were written with the first one meaning the second. The
// moment a customer can sign in, every one of them — the customer list, any
// customer's screen and notes, the queue, raising a ticket, the staff list —
// is reachable by any customer with an account.
//
// Nothing about those routes changed. What changed is that a word they relied
// on stopped meaning what it did, which is why this is a guard rather than a
// note: routes-not-yet-written need it too, and staff-only.guarantee.test.js
// reads the set off the router so a new one cannot quietly inherit the old
// meaning.
//
// It is a role check and not a permission model. SC-1 is one organisation and
// one queue: an agent and an admin see the same desk, and the only place they
// differ is the accounts routes, which already have adminOnly.
export function requireStaff() {
  return requirePermission((subject) => subject.role !== 'customer');
}
