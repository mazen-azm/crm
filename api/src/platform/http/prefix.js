// The one place the versioned API prefix is spelled. app.js mounts with it,
// the route walker takes it as its argument, and the document's paths start
// with it.
//
// It has to be a constant the code owns rather than something read back from
// Express: on Express 5 a mounted router's layer does not expose its mount
// path — layer.path is undefined and the old regexp is now a list of opaque
// closures in layer.matchers, which cannot be reversed into a string.
export const API_V1_PREFIX = '/api/v1';
