// The only way into this feature from outside it.
//
// The repository is deliberately not exported: everything outside reaches the
// numbers through the reader, so there is one place that decides what a report
// means.
export { reportsRouter } from './reports.routes.js';
export { MAX_WINDOW_DAYS, resolveReportWindow } from './reports.window.js';
export {
  createAgentLoadReader,
  createPromiseShareReader,
  createQueueByStatusReader,
} from './reports.read.js';
