import { compact } from '../lib/format';

export function LiveBadge({ viewers }: { viewers?: number }) {
  return (
    <span className="live-badge">
      <span className="live-dot" aria-hidden="true" />
      LIVE{viewers != null ? ` · ${compact(viewers)}` : ''}
    </span>
  );
}
