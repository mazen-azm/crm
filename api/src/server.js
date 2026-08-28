import { composeApp } from './compose.js';
import { config } from './platform/config/index.js';
import { openDatabase } from './platform/db/connection.js';

// The server file starts what the composition root builds — and nothing else.
// PORT is read here, not in config: the config module is single-purpose on
// purpose, and the next story that needs the port in two places moves it.
const port = process.env.PORT ?? 3000;

// One database handle for the process, handed to whatever needs one.
const db = openDatabase(config.dbPath);
const app = composeApp({ db, secret: config.signInTokenSecret });
const server = app.listen(port, () => {
  console.log(`api listening on ${port}`);
});

// Finish in-flight requests, then leave; the timer is for the request that
// never finishes.
function shutdown(signal) {
  console.log(`${signal} received, closing`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 5000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
