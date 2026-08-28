// The set of (method, path) pairs the app actually serves, read from Express's
// own router stack rather than from a list somebody maintains by hand. A
// hand-kept list is the drift this exists to catch.
//
// Shapes, verified on express 5.2.1:
//   a route layer      → layer.route.path ('/health') and layer.route.methods
//   a mounted router   → layer.name === 'router' and layer.handle.stack
//   a mount's own path → NOT available (see prefix.js), so it is passed in.
//
// Entries read 'GET /api/v1/health' and come back sorted, so a set difference
// names each offender instead of reporting a count.
//
// TODO: extend when a second mount seam appears; today the only mounted
// router is the versioned one, so every sub-router is under the prefix.
export function collectRoutes(app, prefix) {
  const out = [];
  // Top-level routes carry no prefix — only what is mounted under the
  // versioned router does. Starting the walk at the prefix would label a
  // future app-level route as if it lived under /api/v1.
  walk(app.router.stack, '', prefix, out);
  out.sort();
  return out;
}

function walk(stack, base, prefix, out) {
  for (const layer of stack) {
    if (layer.route) {
      const path = join(base, layer.route.path);
      for (const [method, enabled] of Object.entries(layer.route.methods)) {
        if (enabled) out.push(`${method.toUpperCase()} ${path}`);
      }
    } else if (layer.name === 'router' && layer.handle?.stack) {
      walk(layer.handle.stack, prefix, prefix, out);
    }
  }
}

function join(base, sub) {
  if (sub === '/' || sub === '') return base || '/';
  return `${base}${sub}`;
}
