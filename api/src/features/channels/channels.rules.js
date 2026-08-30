// The channels this system knows how to receive a request through.
//
// One entry, and that is the point rather than an omission: the product brief
// puts "the Channel interface and the web-form implementation" under Built and
// "email, WhatsApp, SMS" under Specified only. Those three arrive with
// CHANNELS-2-API as names that answer 501 — known, and deliberately not built.
// This list is the ones that work.
export const IMPLEMENTED_CHANNELS = Object.freeze(['web']);

// Named, and deliberately not built. The three the product brief puts under
// "Specified only" (docs/product-brief.md:137) — and naming them is the
// decision, not an oversight: a system that answers 404 for `email` says there
// is no such thing, which is untrue and hides that somebody considered it.
export const SPECIFIED_CHANNELS = Object.freeze(['email', 'whatsapp', 'sms']);

// Every name this system has an opinion about. Built or decided against; a
// name outside it is one nothing has ever heard of.
export const KNOWN_CHANNELS = Object.freeze([...IMPLEMENTED_CHANNELS, ...SPECIFIED_CHANNELS]);

export const isImplemented = (channel) => IMPLEMENTED_CHANNELS.includes(channel);
export const isKnown = (channel) => KNOWN_CHANNELS.includes(channel);
