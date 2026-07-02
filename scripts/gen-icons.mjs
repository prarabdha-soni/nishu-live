// Generates the PWA icon set (pink rounded square + white "N") with zero dependencies.
// Usage: node scripts/gen-icons.mjs
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons');
mkdirSync(OUT, { recursive: true });

const PINK = [255, 45, 111, 255];
const WHITE = [255, 255, 255, 255];

const crcTable = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePNG(size, pixels) {
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0; // filter: none
    pixels.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function insideRoundedRect(x, y, size, radius) {
  const r = radius;
  const cx = x < r ? r : x >= size - r ? size - r - 1 : x;
  const cy = y < r ? r : y >= size - r ? size - r - 1 : y;
  if (cx === x && cy === y) return true;
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy <= r * r;
}

// "N" letterform: two vertical bars + a diagonal, drawn geometrically
function insideN(x, y, size, scale = 1) {
  const u = x / size;
  const v = y / size;
  const cx = 0.5 + (u - 0.5) / scale;
  const cy = 0.5 + (v - 0.5) / scale;
  const top = 0.28;
  const bottom = 0.72;
  if (cy < top || cy > bottom) return false;
  if (cx >= 0.3 && cx <= 0.41) return true; // left bar
  if (cx >= 0.59 && cx <= 0.7) return true; // right bar
  const t = (cy - top) / (bottom - top);
  const dcx = 0.355 + (0.645 - 0.355) * t; // diagonal centre
  return Math.abs(cx - dcx) <= 0.062;
}

function render(size, { rounded, letterScale }) {
  const px = Buffer.alloc(size * size * 4);
  const radius = rounded ? Math.round(size * 0.22) : 0;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      if (rounded && !insideRoundedRect(x, y, size, radius)) continue; // transparent
      const c = insideN(x, y, size, letterScale) ? WHITE : PINK;
      px[i] = c[0];
      px[i + 1] = c[1];
      px[i + 2] = c[2];
      px[i + 3] = c[3];
    }
  }
  return encodePNG(size, px);
}

const files = [
  ['icon-192.png', render(192, { rounded: true, letterScale: 1 })],
  ['icon-512.png', render(512, { rounded: true, letterScale: 1 })],
  ['maskable-192.png', render(192, { rounded: false, letterScale: 0.78 })],
  ['maskable-512.png', render(512, { rounded: false, letterScale: 0.78 })],
  ['apple-touch-icon.png', render(180, { rounded: false, letterScale: 1 })],
];

for (const [name, buf] of files) {
  writeFileSync(join(OUT, name), buf);
  console.log('wrote', name, buf.length, 'bytes');
}
