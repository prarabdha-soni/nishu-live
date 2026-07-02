import { useEffect, useState } from 'react';
import { getSocket } from './socket';
import { liveChannel, supabaseEnabled } from './supabase';

export interface LiveInfo {
  live: boolean;
  viewers: number;
}

/**
 * Watches the live status of several sellers at once (for the Home feed).
 * Supabase mode: observes each seller's room channel (presence + state
 * broadcasts) without joining as a viewer. Socket mode: polls room snapshots.
 * A seller is "live" only while its host device is actually broadcasting.
 */
export function useLiveSellers(ids: string[]): Record<string, LiveInfo> {
  const key = ids.join(',');
  const [map, setMap] = useState<Record<string, LiveInfo>>({});

  useEffect(() => {
    const idList = key ? key.split(',') : [];

    if (supabaseEnabled) {
      const channels = idList.map((id) => {
        const ch = liveChannel(id);
        let hostPresent = false;
        let live = false;
        let viewers = 0;
        const update = () => setMap((m) => ({ ...m, [id]: { live: hostPresent && live, viewers } }));

        ch.on('presence', { event: 'sync' }, () => {
          const entries = Object.values(ch.presenceState<{ role: string }>()).flat();
          hostPresent = entries.some((e) => e.role === 'host');
          viewers = entries.filter((e) => e.role === 'viewer').length;
          if (!hostPresent) live = false; // host gone → not live
          update();
        });
        ch.on('broadcast', { event: 'auction.state' }, ({ payload }) => {
          hostPresent = true;
          live = !!payload?.live;
          if (typeof payload?.viewers === 'number') viewers = payload.viewers;
          update();
        });
        ch.subscribe();
        return ch;
      });
      return () => {
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
