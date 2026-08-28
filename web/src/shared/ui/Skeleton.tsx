import './Skeleton.css';

// The loading state reserves the shape of what is coming. It is not a spinner:
// a spinner is one small thing in the middle of a region that is about to be
// tall, so the page jumps under the reader's cursor the moment the data
// arrives — and on a slow connection they have already started reading, or
// clicking, somewhere that is about to move.
//
// `lines` and `height` are what the caller knows about the content it is
// waiting for. Passing neither gives a single default-height block, which is
// honest for one row and wrong for a table; callers should say.
export function Skeleton({
  lines = 1,
  height = 'var(--space-5)',
  label,
}: {
  lines?: number;
  height?: string;
  label: string;
}) {
  return (
    <div className="skeleton" role="status" aria-label={label} aria-busy="true">
      {Array.from({ length: lines }, (_, index) => (
        <span key={index} className="skeleton__line" style={{ blockSize: height }} />
      ))}
    </div>
  );
}
