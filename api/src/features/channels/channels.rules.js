// The channels this system knows how to receive a request through.
//
// One entry, and that is the point rather than an omission: the product brief
// puts "the Channel interface and the web-form implementation" under Built and
// "email, WhatsApp, SMS" under Specified only. Those three arrive with
// CHANNELS-2-API as names that answer 501 — known, and deliberately not built.
// This list is the ones that work.
export const IMPLEMENTED_CHANNELS = Object.freeze(['web']);

// The channel is a path segment, so an unrecognised one is a path that does
// not exist: 404, the same answer any other unknown URL gets. It is not a 422,
// which names a field in a body the caller sent — there is no such field.
//
// CHANNELS-2-API splits this answer in two: a name it knows and has decided
// against becomes 501, and only a name nothing has ever heard of stays 404.
// Until then every unknown name is a 404, which is the honest answer while
// there is no list of the decided-against.
export const isImplemented = (channel) => IMPLEMENTED_CHANNELS.includes(channel);
