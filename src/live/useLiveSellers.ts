import { useEffect, useRef, useState } from 'react';
import { getSocket } from './socket';
import { liveChannel, supabaseEnabled } from './supabase';

export interface LiveInfo {
  live: boolean;
  viewers: number;
}

// The host broadcasts a heartbeat every ~2.5s; treat a seller as live only while
// those keep arriving. This debounces the flicker that presence 'sync' caused.
const LIVE_TIMEOUT_MS = 7000;

/**
 * Watches the live status of several sellers at once (for the Home feed).
 * A seller is "live" only while its host keeps broadcasting `live: true`.
 * We do NOT flip on presence sync (it flaps on reconnect) — we time out from
 * the last live heartbeat instead, so the Home card stays stable.
 */
export function useLiveSellers(ids: string[]): Record<string, LiveInfo> {
  const key = ids.join(',');
  const [map, setMap] = useState<Record<string, LiveInfo>>({});
  const seenRef = useRef<Record<string, { at: number; live: boolean; viewers: number }>>({});

  useEffect(() => {
    const idList = key ? key.split(',') : [];

    if (supabaseEnabled) {
      const channels = idList.map((id) => {
        const ch = liveChannel(id);
        ch.on('broadcast', { event: 'auction.state' }, ({ payload }) => {
          seenRef.current[id] = {
            at: Date.now(),
            live: !!payload?.live,
            viewers: typeof payload?.viewers === 'number' ? payload.viewers : 0,
          };
        });
        ch.subscribe();
        return ch;
      });

      // recompute liveness on a steady tick, expiring stale heartbeats
      const tick = setInterval(() => {
        const now = Date.now();
        setMap(() => {
          const next: Record<string, LiveInfo> = {};
          for (const id of idList) {
            const s = seenRef.current[id];
            const fresh = !!s && now - s.at < LIVE_TIMEOUT_MS;
            next[id] = { live: fresh && s.live, viewers: fresh ? s.viewers : 0 };
          }
          return next;
        });
      }, 1500);

      return () => {
        clearInterval(tick);
        channels.forEach((ch) => void ch.unsubscribe());
      };
    }

    // socket mode: room.sync is read-only (doesn't bump the viewer count)
    const socket = getSocket();
    let stopped = false;
    const poll = () => {
      for (const id of idList) {
        socket.emit(
          'room.sync',
          { roomId: id },
          (res: { ok: boolean; snapshot?: { broadcasting: boolean; viewers: number } }) => {
            if (stopped || !res?.ok || !res.snapshot) return;
            setMap((m) => ({ ...m, [id]: { live: res.snapshot!.broadcasting, viewers: res.snapshot!.viewers ?? 0 } }));
          },
        );
      }
    };
    if (socket.connected) poll();
    const t = setInterval(poll, 4000);
    socket.on('connect', poll);
    return () => {
      stopped = true;
      clearInterval(t);
      socket.off('connect', poll);
    };
  }, [key]);

  return map;
}
