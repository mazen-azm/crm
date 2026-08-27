// One JSON line per finished request, to stdout. No pino, no morgan, no
// winston: a log line is five fields and a write, and a dependency here buys
// configuration nobody has asked for yet.
//
// The path is read from req.originalUrl, never req.url or req.baseUrl. Express
// restores those after a router unwinds, and the finish event fires after that
// unwind — so a request to /api/v1/health would log as /health. A log field
// that is quietly wrong is worse than a missing one.
//
// `write` is injected only so a test can capture the line; production writes
// to stdout.
export function requestLogger({ write = (line) => process.stdout.write(line + '\n') } = {}) {
  return (req, res, next) => {
    // hrtime, not Date.now: this measures an interval, and a clock that steps
    // sideways mid-request would make the interval a lie.
    const startedAt = process.hrtime.bigint();

    res.on('finish', () => {
      const durationMs = Number((process.hrtime.bigint() - startedAt) / 1_000_000n);
      write(JSON.stringify({
        requestId: req.id ?? null,
        method: req.method,
        path: req.originalUrl,
        status: res.statusCode,
        durationMs,
      }));
    });

    next();
  };
}
