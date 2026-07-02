// Nishu auction server — Node + Express + Socket.IO (free, self-hosted).
// Owns the auction clock, validates every bid, and relays WebRTC signaling
// so the seller can broadcast a real camera stream from /studio.
//
//   node server/index.js          → ws + api on :8787 (serves dist/ if built)
//   HOST_KEY=mysecret PORT=9000 node server/index.js
import http from 'node:http';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { Server } from 'socket.io';
import { AuctionRoom, PACES } from './room.js';
import { ROOMS } from './lots.js';

const PORT = Number(process.env.PORT ?? 8787);
const HOST_KEY = process.env.HOST_KEY ?? 'nishu-live';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(__dirname, '..', 'dist');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: true, methods: ['GET', 'POST'] }, // dev: vite runs on another port
});

app.get('/healthz', (_req, res) => res.json({ ok: true, rooms: ROOMS.map((r) => r.id) }));

// serve the built PWA when dist/ exists (production mode)
if (existsSync(DIST)) {
  app.use(express.static(DIST));
  app.get(/^\/(?!socket\.io|healthz).*/, (_req, res) => res.sendFile(path.join(DIST, 'index.html')));
}

/* ---------------- rooms ---------------- */

const rooms = new Map(ROOMS.map((r) => [r.id, new AuctionRoom(io, r.id, r.lots)]));

const COLORS = ['#2a6fdb', '#c71e50', '#159c66', '#c9a227', '#e0537a', '#3a7bd5', '#8a5a3b', '#7b45c2'];

function colorFor(id) {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return COLORS[h % COLORS.length];
}

function sanitizeHandle(raw) {
  const clean = String(raw ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '')
    .slice(0, 24);
  return clean || `guest-${Math.random().toString(36).slice(2, 6)}`;
}

/* ---------------- sockets ---------------- */

io.on('connection', (socket) => {
  const user = {
    userId: socket.id,
    handle: sanitizeHandle(socket.handshake.auth?.handle),
    color: colorFor(socket.id),
    isHost: false,
  };
  socket.data.user = user;
  socket.data.rooms = new Set();
  socket.data.lastChatAt = 0;
  socket.data.lastBidAt = 0;

  socket.emit('hello', { userId: user.userId, handle: user.handle, serverNow: Date.now() });

  socket.on('join', ({ roomId } = {}, ack) => {
    const room = rooms.get(roomId);
    if (!room) return ack?.({ ok: false, reason: 'no-room' });
    socket.join(room.channel);
    socket.data.rooms.add(roomId);
    room.emitViewers();
    ack?.({ ok: true, snapshot: room.snapshot() });
  });

  socket.on('leave', ({ roomId } = {}) => {
    const room = rooms.get(roomId);
    if (!room) return;
    socket.leave(room.channel);
    socket.data.rooms.delete(roomId);
    room.emitViewers();
  });

  socket.on('room.sync', ({ roomId } = {}, ack) => {
    const room = rooms.get(roomId);
    if (!room) return ack?.({ ok: false, reason: 'no-room' });
    ack?.({ ok: true, snapshot: room.snapshot() });
  });

  socket.on('bid.place', ({ roomId, amount, nonce } = {}, ack) => {
    const room = rooms.get(roomId);
    if (!room) return ack?.({ ok: false, reason: 'no-room' });
    const now = Date.now();
    if (now - socket.data.lastBidAt < 200) return ack?.({ ok: false, reason: 'rate-limited', state: room.publicState() });
    socket.data.lastBidAt = now;
    ack?.(room.placeBid(socket.data.user, amount, nonce));
  });

  socket.on('chat.send', ({ roomId, text } = {}) => {
    const room = rooms.get(roomId);
    if (!room) return;
    const now = Date.now();
    if (now - socket.data.lastChatAt < 1200) return;
    socket.data.lastChatAt = now;
    room.sendChat(socket.data.user, text);
  });

  /* ---- host (seller studio) ---- */

  socket.on('host.claim', ({ roomId, key, handle } = {}, ack) => {
    const room = rooms.get(roomId);
    if (!room) return ack?.({ ok: false, reason: 'no-room' });
    if (key !== HOST_KEY) return ack?.({ ok: false, reason: 'bad-key' });
    room.hostSocketId = socket.id;
    socket.data.user.isHost = true;
    if (handle) socket.data.user.handle = sanitizeHandle(handle);
    socket.join(room.channel);
    socket.data.rooms.add(roomId);
    ack?.({ ok: true, snapshot: room.snapshot() });
  });

  const asHost = (roomId, fn) => {
    const room = rooms.get(roomId);
    if (room && room.hostSocketId === socket.id) fn(room);
  };

  socket.on('host.nextLot', ({ roomId } = {}) => asHost(roomId, (room) => room.advance()));

  socket.on('host.pace', ({ roomId, pace } = {}) =>
    asHost(roomId, (room) => {
      if (pace in PACES) {
        room.setPace(pace);
        io.to(room.channel).emit('pace.changed', { pace });
      }
    }),
  );

  socket.on('host.golive', ({ roomId } = {}) => asHost(roomId, (room) => room.setBroadcasting(true)));
  socket.on('host.endlive', ({ roomId } = {}) => asHost(roomId, (room) => room.setBroadcasting(false)));

  /* ---- WebRTC signaling relay (seller camera → viewers, free STUN) ---- */

  socket.on('rtc.watch', ({ roomId } = {}) => {
    const room = rooms.get(roomId);
    if (!room?.broadcasting || !room.hostSocketId) return;
    io.to(room.hostSocketId).emit('rtc.viewer', { viewerId: socket.id });
  });

  socket.on('rtc.offer', ({ to, sdp } = {}) => io.to(to).emit('rtc.offer', { from: socket.id, sdp }));
  socket.on('rtc.answer', ({ to, sdp } = {}) => io.to(to).emit('rtc.answer', { from: socket.id, sdp }));
  socket.on('rtc.ice', ({ to, candidate } = {}) => io.to(to).emit('rtc.ice', { from: socket.id, candidate }));

  socket.on('disconnect', () => {
    for (const roomId of socket.data.rooms) {
      const room = rooms.get(roomId);
      if (!room) continue;
      room.emitViewers();
      if (room.hostSocketId === socket.id) {
        room.hostSocketId = null;
        room.setBroadcasting(false);
      } else {
        io.to(room.hostSocketId ?? '').emit('rtc.viewer-left', { viewerId: socket.id });
      }
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Nishu auction server on http://localhost:${PORT}`);
  console.log(`Host key for /studio: ${HOST_KEY}`);
  console.log(`Rooms: ${[...rooms.keys()].join(', ')}`);
});
