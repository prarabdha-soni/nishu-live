import { io, Socket } from 'socket.io-client';
import { getHandle } from '../lib/identity';

// Dev: vite on :5173, auction server on :8787. Prod: same origin (server serves dist/).
const SOCKET_URL =
  (import.meta.env.VITE_SOCKET_URL as string | undefined) ??
  (location.port === '5173' ? `${location.protocol}//${location.hostname}:8787` : location.origin);

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, {
      auth: { handle: getHandle() },
      reconnectionDelayMax: 4000,
      timeout: 3000,
    });
  }
  return socket;
}

export const RTC_CONFIG: RTCConfiguration = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};

/**
 * Nudge the Opus audio codec to full-quality: stereo + in-band FEC + a higher
 * average bitrate. Applied to both the offer and the answer so the seller's
 * audio comes through rich instead of the default narrow-band voice.
 */
export function boostSdp(sdp: string): string {
  const opusPt = sdp.match(/a=rtpmap:(\d+) opus\/48000/i)?.[1];
  if (!opusPt) return sdp;
  const ensure = (params: string) => {
    const set = (k: string, v: string) =>
      new RegExp(`${k}=`).test(params)
        ? (params = params.replace(new RegExp(`${k}=[^;]*`), `${k}=${v}`))
        : (params += `;${k}=${v}`);
    set('stereo', '1');
    set('sprop-stereo', '1');
    set('maxaveragebitrate', '128000');
    set('maxplaybackrate', '48000');
    set('useinbandfec', '1');
    return params;
  };
  const fmtp = new RegExp(`a=fmtp:${opusPt} ([^\\r\\n]*)`);
  if (fmtp.test(sdp)) return sdp.replace(fmtp, (_l, p) => `a=fmtp:${opusPt} ${ensure(p)}`);
  return sdp.replace(
    new RegExp(`(a=rtpmap:${opusPt} opus/48000[^\\r\\n]*)`),
    `$1\r\na=fmtp:${opusPt} stereo=1;sprop-stereo=1;maxaveragebitrate=128000;maxplaybackrate=48000;useinbandfec=1`,
  );
}
