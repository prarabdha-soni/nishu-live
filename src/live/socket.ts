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
