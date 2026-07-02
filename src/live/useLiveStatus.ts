import { useEffect, useState } from 'react';
import { getSocket } from './socket';
import { liveChannel, supabaseEnabled } from './supabase';

export interface LiveStatus {
  /** offline: no host · ready: studio open, camera not live yet · live: streaming */
  status: 'offline' | 'ready' | 'live';
  viewers: number;
}

/**
 * Lightweight "is my shop live?" signal for the Home screen.
 * Supabase mode: observes the room channel's presence + state broadcasts
 * (without joining as a viewer). Socket mode: polls a room snapshot.
 */
export function useLiveStatus(sellerId: string): LiveStatus {
  const [st, setSt] = useState<LiveStatus>({ status: 'offline', viewers: 0 });

  useEffect(() => {
    if (supabaseEnabled) {
      const ch = liveChannel(sellerId);
      let live = false;
      let hostPresent = false;
      let viewers = 0;
      const update = () =>
        setSt({ status: live ? 'live' : hostPresent ? 'ready' : 'offline', viewers });

      ch.on('presence', { event: 'sync' }, () => {
        const entries = Object.values(ch.presenceState<{ role: string }>()).flat();
        hostPresent = entries.some((e) => e.role === 'host');
        viewers = entries.filter((e) => e.role === 'viewer').length;
        if (!hostPresent) live = false; // host gone → stream is gone
        update();
      });
      ch.on('broadcast', { event: 'auction.state' }, ({ payload }) => {
        hostPresent = true;
        live = !!payload?.live;
        if (typeof payload?.viewers === 'number') viewers = payload.viewers;
        update();
      });
      ch.subscribe();
      return () => {
        void ch.unsubscribe();
      };
    }

    // socket mode: room.sync is read-only (doesn't join or bump the viewer count)
    const socket = getSocket();
    let stopped = false;
    const poll = () => {
      socket.emit(
        'room.sync',
        { roomId: sellerId },
        (res: { ok: boolean; snapshot?: { broadcasting: boolean; viewers: number } }) => {
          if (stopped || !res?.ok || !res.snapshot) return;
          setSt({
            status: res.snapshot.broadcasting ? 'live' : 'offline',
            viewers: res.snapshot.viewers ?? 0,
          });
        },
      );
    };
    if (socket.connected) poll();
    const t = setInterval(poll, 4000);
    socket.on('connect', poll);
    return () => {
      stopped = true;
      clearInterval(t);
      socket.off('connect', poll);
    };
  }, [sellerId]);

  return st;
}
