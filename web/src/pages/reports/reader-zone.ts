// Where the reader is, as the runtime knows it.
//
// Not a constant and not a guess from the language — Arabic does not mean
// Cairo, and half the people reading an Arabic interface are not in the same
// zone as the other half.
//
// `UTC` when the runtime will not name a zone. It is a real answer rather than
// a refusal: the API accepts `UTC` (it had to be taught to — `UTC` is not in
// `Intl.supportedValuesOf('timeZone')`, which is how that was found), so the
// report still answers, about the UTC day, and the label says so.
export function readerZone(): string {
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return zone && zone.length > 0 ? zone : 'UTC';
  } catch {
    return 'UTC';
  }
}
