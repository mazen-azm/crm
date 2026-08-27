// The standard security set, written by hand in one place. A dependency for
// eight constant headers buys nothing except a supply chain; the set below is
// named in the tests, so a header cannot silently disappear.
//
// The CSP is deliberately hostile: this API returns JSON, no page, so nothing
// may load anything. HSTS is inert over plain HTTP and correct the day TLS
// terminates in front of the API.
//
// The middleware runs for every method — OPTIONS and HEAD included — because
// res.setHeader is idempotent and a preflight response leaks like any other.
const HEADERS = Object.freeze({
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
  'Permissions-Policy':
    'accelerometer=(), camera=(), geolocation=(), gyroscope=(), microphone=(), payment=(), usb=()',
});

export function securityHeaders() {
  return (req, res, next) => {
    for (const [name, value] of Object.entries(HEADERS)) {
      res.setHeader(name, value);
    }
    // app.js disables x-powered-by globally; removing it here as well keeps
    // the guarantee even if the app-level setting is ever lost.
    res.removeHeader('X-Powered-By');
    next();
  };
}
