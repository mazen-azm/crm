// The only way into this feature from outside it.
export { identityRouter } from './identity.routes.js';
export { createIdentityService } from './identity.service.js';
export { identitySubjectResolver } from './identity.subject-resolver.js';
// The roles that can hold work. It leaves the feature because the reports
// feature has to know which users are staff, and reading it from here is the
// allowed direction — a feature reaches another through its index, never by
// path into its rules.
export { STAFF_ROLES } from './identity.rules.js';
