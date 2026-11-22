// news-image-20261122 — a one-page newspaper front page for Sunday 22 November 2026.
// Node 22, standard library only, no network, fully deterministic.
// Paints a 1024x1024 PNG into MAKEFUN_OUTPUT_DIR (or /output) as entry.png.
import * as fs from "node:fs";
import * as path from "node:path";
import * as zlib from "node:zlib";

const W = 1024;
const H = 1024;

// ---------------------------------------------------------------- palette
type RGB = [number, number, number];
const PAPER: RGB = [247, 242, 230];
const PANEL: RGB = [255, 253, 246];
const INK: RGB = [26, 25, 22];
const RED: RGB = [176, 42, 42];
const BLUE: RGB = [31, 78, 121];
const SKY: RGB = [176, 213, 236];
const PALE_SKY: RGB = [214, 231, 240];
const SEA: RGB = [43, 108, 160];
const DEEP_SEA: RGB = [28, 74, 116];
const SAND: RGB = [233, 206, 150];
const LEAF: RGB = [74, 124, 74];
const HILL: RGB = [96, 140, 82];
const SUN: RGB = [240, 184, 44];
const FLAME: RGB = [226, 106, 32];
const FLAME2: RGB = [245, 176, 54];
const SMOKE: RGB = [128, 128, 122];
const GREY: RGB = [150, 146, 138];
const DARKGREY: RGB = [96, 96, 92];
const WHITE: RGB = [255, 255, 255];
const BROWN: RGB = [146, 102, 66];
const CREAM: RGB = [238, 226, 198];

// ---------------------------------------------------------------- canvas
class Canvas {
  w: number;
  h: number;
  buf: Uint8ClampedArray;
  constructor(w: number, h: number, bg: RGB) {
    this.w = w;
    this.h = h;
    this.buf = new Uint8ClampedArray(w * h * 4);
    for (let i = 0; i < w * h; i++) {
      this.buf[i * 4] = bg[0];
      this.buf[i * 4 + 1] = bg[1];
      this.buf[i * 4 + 2] = bg[2];
      this.buf[i * 4 + 3] = 255;
    }
  }
  px(x: number, y: number, c: RGB): void {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = (y * this.w + x) * 4;
    this.buf[i] = c[0];
    this.buf[i + 1] = c[1];
    this.buf[i + 2] = c[2];
  }
  rect(x: number, y: number, w: number, h: number, c: RGB): void {
    const x0 = Math.max(0, x);
    const y0 = Math.max(0, y);
    const x1 = Math.min(this.w, x + w);
    const y1 = Math.min(this.h, y + h);
    for (let yy = y0; yy < y1; yy++) {
      for (let xx = x0; xx < x1; xx++) this.px(xx, yy, c);
    }
  }
  hline(x: number, y: number, len: number, c: RGB): void {
    for (let i = 0; i < len; i++) this.px(x + i, y, c);
  }
  vline(x: number, y: number, len: number, c: RGB): void {
    for (let i = 0; i < len; i++) this.px(x, y + i, c);
  }
  line(x0: number, y0: number, x1: number, y1: number, c: RGB): void {
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    let x = x0;
    let y = y0;
    for (;;) {
      this.px(x, y, c);
      if (x === x1 && y === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y += sy;
      }
    }
  }
  disc(cx: number, cy: number, r: number, c: RGB): void {
    for (let dy = -r; dy <= r; dy++) {
      const dx = Math.floor(Math.sqrt(r * r - dy * dy));
      this.hline(cx - dx, cy + dy, dx * 2 + 1, c);
    }
  }
  ring(cx: number, cy: number, r: number, c: RGB): void {
    for (let a = 0; a < 360; a += 1) {
      const rad = (a * Math.PI) / 180;
      this.px(Math.round(cx + r * Math.cos(rad)), Math.round(cy + r * Math.sin(rad)), c);
    }
  }
  arc(cx: number, cy: number, r: number, a0: number, a1: number, c: RGB): void {
    for (let a = a0; a <= a1; a += 1) {
      const rad = (a * Math.PI) / 180;
      this.px(Math.round(cx + r * Math.cos(rad)), Math.round(cy + r * Math.sin(rad)), c);
    }
  }
  tri(x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, c: RGB): void {
    const minY = Math.max(0, Math.min(y0, y1, y2));
    const maxY = Math.min(this.h - 1, Math.max(y0, y1, y2));
    for (let y = minY; y <= maxY; y++) {
      const xs: number[] = [];
      const edges: Array<[number, number, number, number]> = [
        [x0, y0, x1, y1],
        [x1, y1, x2, y2],
        [x2, y2, x0, y0],
      ];
      for (const [ax, ay, bx, by] of edges) {
        if ((ay <= y && by > y) || (by <= y && ay > y)) {
          xs.push(ax + ((y - ay) * (bx - ax)) / (by - ay));
        }
      }
      if (xs.length >= 2) {
        const lo = Math.floor(Math.min(xs[0], xs[1]));
        const hi = Math.ceil(Math.max(xs[0], xs[1]));
        this.hline(lo, y, hi - lo + 1, c);
      }
    }
  }
  frame(x: number, y: number, w: number, h: number, c: RGB, t: number): void {
    this.rect(x, y, w, t, c);
    this.rect(x, y + h - t, w, t, c);
    this.rect(x, y, t, h, c);
    this.rect(x + w - t, y, t, h, c);
  }
}

// ---------------------------------------------------------------- 5x7 font
// Each glyph is 7 rows; each row is a 5-bit mask, bit 4 = leftmost pixel.
const GLYPHS: Record<string, number[]> = {
  A: [14, 17, 17, 31, 17, 17, 17],
  B: [30, 17, 17, 30, 17, 17, 30],
  C: [14, 17, 16, 16, 16, 17, 14],
  D: [30, 17, 17, 17, 17, 17, 30],
  E: [31, 16, 16, 30, 16, 16, 31],
  F: [31, 16, 16, 30, 16, 16, 16],
  G: [14, 17, 16, 23, 17, 17, 15],
  H: [17, 17, 17, 31, 17, 17, 17],
  I: [14, 4, 4, 4, 4, 4, 14],
  J: [7, 2, 2, 2, 2, 18, 12],
  K: [17, 18, 20, 24, 20, 18, 17],
  L: [16, 16, 16, 16, 16, 16, 31],
  M: [17, 27, 21, 21, 17, 17, 17],
  N: [17, 25, 21, 19, 17, 17, 17],
  O: [14, 17, 17, 17, 17, 17, 14],
  P: [30, 17, 17, 30, 16, 16, 16],
  Q: [14, 17, 17, 17, 21, 18, 13],
  R: [30, 17, 17, 30, 20, 18, 17],
  S: [15, 16, 16, 14, 1, 1, 30],
  T: [31, 4, 4, 4, 4, 4, 4],
  U: [17, 17, 17, 17, 17, 17, 14],
  V: [17, 17, 17, 17, 17, 10, 4],
  W: [17, 17, 17, 21, 21, 21, 10],
  X: [17, 17, 10, 4, 10, 17, 17],
  Y: [17, 17, 10, 4, 4, 4, 4],
  Z: [31, 1, 2, 4, 8, 16, 31],
  "0": [14, 17, 19, 21, 25, 17, 14],
  "1": [4, 12, 4, 4, 4, 4, 14],
  "2": [14, 17, 1, 6, 8, 16, 31],
  "3": [31, 2, 4, 2, 1, 17, 14],
  "4": [2, 6, 10, 18, 31, 2, 2],
  "5": [31, 16, 30, 1, 1, 17, 14],
  "6": [6, 8, 16, 30, 17, 17, 14],
  "7": [31, 1, 2, 4, 8, 8, 8],
  "8": [14, 17, 17, 14, 17, 17, 14],
  "9": [14, 17, 17, 15, 1, 2, 12],
  " ": [0, 0, 0, 0, 0, 0, 0],
  ".": [0, 0, 0, 0, 0, 12, 12],
  ",": [0, 0, 0, 0, 12, 4, 8],
  "'": [4, 4, 8, 0, 0, 0, 0],
  '"': [10, 10, 0, 0, 0, 0, 0],
  "!": [4, 4, 4, 4, 4, 0, 4],
  "?": [14, 17, 1, 6, 4, 0, 4],
  "-": [0, 0, 0, 14, 0, 0, 0],
  ":": [0, 12, 12, 0, 12, 12, 0],
  ";": [0, 12, 12, 0, 12, 4, 8],
  "(": [2, 4, 8, 8, 8, 4, 2],
  ")": [8, 4, 2, 2, 2, 4, 8],
  "/": [1, 2, 2, 4, 8, 8, 16],
  "%": [25, 26, 2, 4, 8, 11, 19],
  $: [4, 15, 20, 14, 5, 30, 4],
  "&": [12, 18, 20, 8, 21, 18, 13],
  "+": [0, 4, 4, 14, 4, 4, 0],
  "=": [0, 0, 31, 0, 31, 0, 0],
  _: [0, 0, 0, 0, 0, 0, 31],
  "*": [0, 4, 21, 14, 21, 4, 0],
  "[": [14, 8, 8, 8, 8, 8, 14],
  "]": [14, 2, 2, 2, 2, 2, 14],
  "#": [10, 10, 31, 10, 31, 10, 10],
  "@": [14, 17, 23, 21, 22, 16, 14],
  "<": [2, 4, 8, 16, 8, 4, 2],
  ">": [8, 4, 2, 1, 2, 4, 8],
  "|": [4, 4, 4, 4, 4, 4, 4],
  "\\": [16, 8, 8, 4, 2, 2, 1],
  "^": [4, 10, 17, 0, 0, 0, 0],
  "~": [0, 0, 9, 22, 0, 0, 0],
  "`": [8, 4, 0, 0, 0, 0, 0],
};
const BLANK = [0, 0, 0, 0, 0, 0, 0];

function glyphFor(ch: string): number[] {
  return GLYPHS[ch] ?? BLANK;
}

function textWidth(s: string, scale: number): number {
  if (s.length === 0) return 0;
  return s.length * 6 * scale - scale;
}

function drawText(cv: Canvas, s: string, x: number, y: number, scale: number, c: RGB): void {
  const up = s.toUpperCase();
  for (let ci = 0; ci < up.length; ci++) {
    const g = glyphFor(up[ci]);
    const ox = x + ci * 6 * scale;
    for (let row = 0; row < 7; row++) {
      const bits = g[row];
      for (let col = 0; col < 5; col++) {
        if (bits & (1 << (4 - col))) {
          cv.rect(ox + col * scale, y + row * scale, scale, scale, c);
        }
      }
    }
  }
}

function wrapText(s: string, maxW: number, scale: number): string[] {
  const words = s.split(/\s+/).filter((w) => w.length > 0);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const trial = cur === "" ? w : cur + " " + w;
    if (textWidth(trial, scale) <= maxW || cur === "") {
      cur = trial;
    } else {
      lines.push(cur);
      cur = w;
    }
  }
  if (cur !== "") lines.push(cur);
  return lines;
}

function drawPara(cv: Canvas, s: string, x: number, y: number, maxW: number, scale: number, c: RGB, lh: number): number {
  const lines = wrapText(s, maxW, scale);
  for (let i = 0; i < lines.length; i++) {
    drawText(cv, lines[i], x, y + i * lh, scale, c);
  }
  return y + lines.length * lh;
}

// ---------------------------------------------------------------- PNG encoder
const CRC_TABLE: number[] = (() => {
  const t: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t.push(c >>> 0);
  }
  return t;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function adler32(buf: Buffer): number {
  let a = 1;
  let b = 0;
  for (let i = 0; i < buf.length; i++) {
    a = (a + buf[i]) % 65521;
    b = (b + a) % 65521;
  }
  return ((b << 16) | a) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, "ascii");
  data.copy(out, 8);
  const crc = crc32(Buffer.concat([Buffer.from(type, "ascii"), data]));
  out.writeUInt32BE(crc, 8 + data.length);
  return out;
}

function encodePNG(cv: Canvas): Buffer {
  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    const rowStart = y * (1 + W * 3);
    raw[rowStart] = 0; // filter: none
    for (let x = 0; x < W; x++) {
      const src = (y * W + x) * 4;
      const dst = rowStart + 1 + x * 3;
      raw[dst] = cv.buf[src];
      raw[dst + 1] = cv.buf[src + 1];
      raw[dst + 2] = cv.buf[src + 2];
    }
  }
  // Real DEFLATE compression via the Node stdlib (deterministic for fixed input).
  const zdata = zlib.deflateSync(raw, { level: 9 });

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", zdata), chunk("IEND", Buffer.alloc(0))]);
}

// ---------------------------------------------------------------- scenes
type Scene = (cv: Canvas, x: number, y: number, w: number, h: number) => void;

function sceneCoast(cv: Canvas, x: number, y: number, w: number, h: number): void {
  cv.rect(x, y, w, h, SKY);
  cv.disc(x + w - 42, y + 34, 20, SUN);
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    cv.line(
      Math.round(x + w - 42 + 26 * Math.cos(a)),
      Math.round(y + 34 + 26 * Math.sin(a)),
      Math.round(x + w - 42 + 34 * Math.cos(a)),
      Math.round(y + 34 + 34 * Math.sin(a)),
      SUN,
    );
  }
  cv.tri(x, y + h, x + Math.floor(w * 0.45), y + Math.floor(h * 0.35), x + Math.floor(w * 0.8), y + h, HILL);
  cv.tri(x + Math.floor(w * 0.35), y + h, x + Math.floor(w * 0.7), y + Math.floor(h * 0.5), x + w, y + h, LEAF);
  const seaY = y + Math.floor(h * 0.72);
  cv.rect(x, seaY, w, y + h - seaY, SEA);
  for (let i = 0; i < 4; i++) {
    const wy = seaY + 6 + i * 7;
    for (let wx = x + 6 + (i % 2) * 14; wx < x + w - 20; wx += 28) {
      cv.hline(wx, wy, 16, WHITE);
    }
  }
  // two summit flags on the shore
  cv.vline(x + 26, y + Math.floor(h * 0.42), Math.floor(h * 0.3), INK);
  cv.tri(x + 26, y + Math.floor(h * 0.42), x + 52, y + Math.floor(h * 0.47), x + 26, y + Math.floor(h * 0.52), RED);
  cv.vline(x + 62, y + Math.floor(h * 0.5), Math.floor(h * 0.22), INK);
  cv.tri(x + 62, y + Math.floor(h * 0.5), x + 84, y + Math.floor(h * 0.54), x + 62, y + Math.floor(h * 0.58), BLUE);
  drawText(cv, "ANTALYA", x + 10, y + 8, 1, INK);
}

function sceneShip(cv: Canvas, x: number, y: number, w: number, h: number): void {
  cv.rect(x, y, w, h, PALE_SKY);
  cv.disc(x + w - 30, y + 22, 13, SUN);
  const seaY = y + Math.floor(h * 0.62);
  cv.rect(x, seaY, w, y + h - seaY, DEEP_SEA);
  for (let i = 0; i < 3; i++) {
    const wy = seaY + 5 + i * 8;
    for (let wx = x + 8 + (i % 2) * 16; wx < x + w - 24; wx += 32) {
      cv.hline(wx, wy, 18, WHITE);
    }
  }
  // smoke
  cv.disc(x + Math.floor(w * 0.42), y + Math.floor(h * 0.22), 9, SMOKE);
  cv.disc(x + Math.floor(w * 0.5), y + Math.floor(h * 0.14), 11, SMOKE);
  cv.disc(x + Math.floor(w * 0.58), y + Math.floor(h * 0.2), 8, SMOKE);
  // hull
  const hullY = seaY - 14;
  cv.rect(x + Math.floor(w * 0.14), hullY, Math.floor(w * 0.62), 16, INK);
  cv.tri(x + Math.floor(w * 0.76), hullY, x + Math.floor(w * 0.9), hullY + 8, x + Math.floor(w * 0.76), hullY + 16, INK);
  // containers
  cv.rect(x + Math.floor(w * 0.18), hullY - 14, 26, 14, RED);
  cv.rect(x + Math.floor(w * 0.18) + 30, hullY - 14, 26, 14, BLUE);
  cv.rect(x + Math.floor(w * 0.18) + 60, hullY - 14, 26, 14, SUN);
  // flames above the deck
  cv.tri(x + Math.floor(w * 0.3), hullY - 14, x + Math.floor(w * 0.36), hullY - 40, x + Math.floor(w * 0.42), hullY - 14, FLAME);
  cv.tri(x + Math.floor(w * 0.48), hullY - 14, x + Math.floor(w * 0.54), hullY - 34, x + Math.floor(w * 0.6), hullY - 14, FLAME2);
  cv.tri(x + Math.floor(w * 0.62), hullY - 14, x + Math.floor(w * 0.66), hullY - 30, x + Math.floor(w * 0.72), hullY - 14, FLAME);
  // bridge tower
  cv.rect(x + Math.floor(w * 0.68), hullY - 26, 12, 26, WHITE);
  cv.frame(x + Math.floor(w * 0.68), hullY - 26, 12, 26, INK, 1);
}

function sceneDesert(cv: Canvas, x: number, y: number, w: number, h: number): void {
  cv.rect(x, y, w, h, PALE_SKY);
  cv.disc(x + w - 34, y + 24, 14, SUN);
  cv.tri(x, y + h, x + Math.floor(w * 0.3), y + Math.floor(h * 0.3), x + Math.floor(w * 0.6), y + h, BROWN);
  cv.tri(x + Math.floor(w * 0.45), y + h, x + Math.floor(w * 0.72), y + Math.floor(h * 0.42), x + w, y + h, [168, 122, 82]);
  const sandY = y + Math.floor(h * 0.68);
  cv.rect(x, sandY, w, y + h - sandY, SAND);
  // cactus
  const cx = x + Math.floor(w * 0.2);
  cv.rect(cx, sandY - 26, 8, 28, LEAF);
  cv.rect(cx - 12, sandY - 18, 12, 6, LEAF);
  cv.rect(cx - 12, sandY - 24, 6, 12, LEAF);
  cv.rect(cx + 8, sandY - 14, 12, 6, LEAF);
  cv.rect(cx + 14, sandY - 20, 6, 12, LEAF);
  // second small cactus
  const cx2 = x + Math.floor(w * 0.82);
  cv.rect(cx2, sandY - 16, 6, 18, LEAF);
  cv.rect(cx2 - 8, sandY - 10, 8, 5, LEAF);
  // stones
  cv.disc(x + Math.floor(w * 0.5), sandY + 8, 4, GREY);
  cv.disc(x + Math.floor(w * 0.62), sandY + 12, 3, DARKGREY);
  drawText(cv, "GUASAVE, SINALOA", x + 10, y + 8, 1, INK);
}

function sceneChart(cv: Canvas, x: number, y: number, w: number, h: number): void {
  cv.rect(x, y, w, h, WHITE);
  for (let i = 1; i <= 3; i++) {
    const gy = y + Math.floor((h * i) / 4);
    for (let gx = x + 6; gx < x + w - 6; gx += 8) cv.px(gx, gy, GREY);
  }
  const base = y + h - 10;
  const bars = [0.86, 0.72, 0.6, 0.44, 0.3];
  const bw = Math.floor((w - 40) / bars.length);
  for (let i = 0; i < bars.length; i++) {
    const bh = Math.floor((h - 24) * bars[i]);
    const bx = x + 14 + i * bw;
    cv.rect(bx, base - bh, bw - 6, bh, i >= 3 ? RED : [196, 84, 84]);
  }
  // falling arrow
  cv.line(x + 12, y + 10, x + w - 14, y + h - 16, RED);
  cv.line(x + w - 14, y + h - 16, x + w - 30, y + h - 16, RED);
  cv.line(x + w - 14, y + h - 16, x + w - 14, y + h - 32, RED);
  cv.hline(x, base, w, INK);
}

function sceneBridge(cv: Canvas, x: number, y: number, w: number, h: number): void {
  cv.rect(x, y, w, h, SKY);
  cv.disc(x + 30, y + 22, 12, SUN);
  const waterY = y + Math.floor(h * 0.66);
  cv.rect(x, waterY, w, y + h - waterY, SEA);
  for (let i = 0; i < 2; i++) {
    const wy = waterY + 6 + i * 9;
    for (let wx = x + 10 + (i % 2) * 18; wx < x + w - 22; wx += 36) {
      cv.hline(wx, wy, 20, WHITE);
    }
  }
  const deckY = y + Math.floor(h * 0.52);
  cv.hline(x + 8, deckY, w - 16, INK);
  cv.rect(x + 8, deckY, w - 16, 3, INK);
  // two arches rising above the deck
  const r = Math.floor(w / 5);
  cv.arc(x + Math.floor(w * 0.28), deckY, r, 180, 360, INK);
  cv.arc(x + Math.floor(w * 0.72), deckY, r, 180, 360, INK);
  // pillars
  cv.vline(x + Math.floor(w * 0.28) - r, deckY - 26, 26, INK);
  cv.vline(x + Math.floor(w * 0.28) + r, deckY - 26, 26, INK);
  cv.vline(x + Math.floor(w * 0.72) - r, deckY - 26, 26, INK);
  cv.vline(x + Math.floor(w * 0.72) + r, deckY - 26, 26, INK);
  cv.rect(x + Math.floor(w * 0.28) - r - 2, deckY - 30, 5, 5, RED);
  cv.rect(x + Math.floor(w * 0.72) - r - 2, deckY - 30, 5, 5, RED);
}

function sceneRikers(cv: Canvas, x: number, y: number, w: number, h: number): void {
  cv.rect(x, y, w, h, PALE_SKY);
  // distant skyline
  const sky = [168, 176, 186];
  cv.rect(x + 8, y + Math.floor(h * 0.3), 22, Math.floor(h * 0.4), sky);
  cv.rect(x + 36, y + Math.floor(h * 0.18), 18, Math.floor(h * 0.52), sky);
  cv.rect(x + 60, y + Math.floor(h * 0.36), 26, Math.floor(h * 0.34), sky);
  cv.rect(x + w - 92, y + Math.floor(h * 0.24), 20, Math.floor(h * 0.46), sky);
  cv.rect(x + w - 64, y + Math.floor(h * 0.38), 26, Math.floor(h * 0.32), sky);
  cv.rect(x + w - 30, y + Math.floor(h * 0.28), 18, Math.floor(h * 0.42), sky);
  const waterY = y + Math.floor(h * 0.68);
  cv.rect(x, waterY, w, y + h - waterY, SEA);
  for (let i = 0; i < 2; i++) {
    const wy = waterY + 5 + i * 8;
    for (let wx = x + 8 + (i % 2) * 14; wx < x + w - 20; wx += 28) {
      cv.hline(wx, wy, 16, WHITE);
    }
  }
  // island with the jail block
  const ix = x + Math.floor(w * 0.3);
  const iw = Math.floor(w * 0.4);
  const iy = y + Math.floor(h * 0.46);
  cv.rect(ix - 8, iy + 18, iw + 16, 12, LEAF);
  cv.rect(ix, iy, iw, 22, CREAM);
  cv.frame(ix, iy, iw, 22, INK, 1);
  for (let bx = ix + 8; bx < ix + iw - 6; bx += 12) {
    cv.vline(bx, iy + 3, 16, INK);
  }
  cv.rect(ix + Math.floor(iw / 2) - 3, iy - 8, 6, 8, RED);
  cv.vline(ix + Math.floor(iw / 2), iy - 16, 8, INK);
  cv.tri(ix + Math.floor(iw / 2), iy - 16, ix + Math.floor(iw / 2) + 12, iy - 13, ix + Math.floor(iw / 2), iy - 10, RED);
}

// ---------------------------------------------------------------- page
interface Story {
  kicker: string;
  headline: string;
  body: string;
  scene: Scene;
}

function drawStoryPanel(cv: Canvas, x: number, y: number, w: number, h: number, s: Story): void {
  cv.rect(x, y, w, h, PANEL);
  cv.frame(x, y, w, h, INK, 2);
  drawText(cv, s.kicker, x + 14, y + 14, 1, RED);
  const headLines = wrapText(s.headline, w - 28, 2);
  let cy = y + 34;
  for (let i = 0; i < headLines.length; i++) {
    drawText(cv, headLines[i], x + 14, cy + i * 16, 2, INK);
  }
  cy += headLines.length * 16 + 8;
  const sceneH = 64;
  const sceneY = y + h - sceneH - 12;
  drawPara(cv, s.body, x + 14, cy, w - 28, 1, INK, 10);
  cv.frame(x + 12, sceneY, w - 24, sceneH, INK, 1);
  s.scene(cv, x + 13, sceneY + 1, w - 26, sceneH - 2);
}

function main(): void {
  const cv = new Canvas(W, H, PAPER);

  // ---- masthead
  cv.rect(20, 20, W - 40, 3, INK);
  const title = "THE SUNDAY GLOBE";
  drawText(cv, title, Math.floor((W - textWidth(title, 6)) / 2), 34, 6, INK);
  const dateLine = "Sunday 22 November 2026";
  drawText(cv, dateLine, Math.floor((W - textWidth(dateLine, 2)) / 2), 92, 2, RED);
  cv.rect(20, 118, W - 40, 3, INK);
  cv.rect(20, 126, W - 40, 1, INK);

  // ---- lead story: COP31
  const lx = 20;
  const ly = 140;
  const lw = W - 40;
  const lh = 300;
  cv.rect(lx, ly, lw, lh, PANEL);
  cv.frame(lx, ly, lw, lh, INK, 2);
  drawText(cv, "CLIMATE SUMMIT — ANTALYA", lx + 16, ly + 16, 1, RED);
  drawText(cv, "COP31 NEARS A DEAL IN ANTALYA", lx + 16, ly + 38, 3, INK);
  drawPara(
    cv,
    "After days of deadlock, a new package lands. Summit president Murat Kurum says concerns on fossil fuels and adaptation cash are addressed. Delegates vote Sunday morning.",
    lx + 16,
    ly + 76,
    560,
    2,
    INK,
    19,
  );
  const sceneX = lx + 612;
  const sceneY = ly + 66;
  const sceneW = lw - 612 - 16;
  const sceneH = lh - 66 - 16;
  cv.frame(sceneX, sceneY, sceneW, sceneH, INK, 1);
  sceneCoast(cv, sceneX + 1, sceneY + 1, sceneW - 2, sceneH - 2);
  drawText(cv, "DELEGATES VOTE SUNDAY MORNING", lx + 16, ly + lh - 30, 1, BLUE);

  // ---- middle row: Baltic ship + El Chapo
  const rowA = 456;
  const rowAH = 244;
  drawStoryPanel(
    cv,
    20,
    rowA,
    484,
    rowAH,
    {
      kicker: "BALTIC SEA",
      headline: "DRONE STRIKE SETS RUSSIAN SHIP ABLAZE",
      body: "Sanctioned cargo ship Sparta II, bound for Kaliningrad, was hit by two drones in the Gulf of Finland, caught fire and drifted into Finnish waters. All 16 crew were evacuated. Finland says Ukraine is likely behind it.",
      scene: sceneShip,
    },
  );
  drawStoryPanel(
    cv,
    520,
    rowA,
    484,
    rowAH,
    {
      kicker: "SINALOA, MEXICO",
      headline: "EL CHAPO ISIDRO CAPTURED IN MEXICO",
      body: "FBI top-10 fugitive Fausto Isidro Meza Flores was seized in Guasave, Sinaloa. Gun battles killed 11 — seven gunmen and four soldiers. The US had a $5M reward on him.",
      scene: sceneDesert,
    },
  );

  // ---- bottom row: markets, Zelensky, Rikers
  const rowB = 716;
  const rowBH = 288;
  const bw = 317;
  drawStoryPanel(
    cv,
    20,
    rowB,
    bw,
    rowBH,
    {
      kicker: "MARKETS",
      headline: "WALL STREET SLIDES AS ANTHROPIC SINKS",
      body: "The S&P 500 fell 3.7% and the Nasdaq 5.28% on Friday. Anthropic shares sank 11% a day after its blockbuster IPO.",
      scene: sceneChart,
    },
  );
  drawStoryPanel(
    cv,
    353,
    rowB,
    bw,
    rowBH,
    {
      kicker: "UKRAINE",
      headline: "'FAIR RESPONSE,' SAYS ZELENSKY",
      body: "Zelensky defends the Crimean Bridge strikes as a fair response to 109 Russian attacks on Ukrainian bridges, ahead of a Kyiv meeting with UK Defence Secretary Wes Streeting.",
      scene: sceneBridge,
    },
  );
  drawStoryPanel(
    cv,
    686,
    rowB,
    bw,
    rowBH,
    {
      kicker: "NEW YORK",
      headline: "RIKERS TO CLOSE BY 2032",
      body: "Mayor Mamdani's plan closes Rikers Island by 2032, five years past the 2027 deadline. Four smaller borough jails will replace it.",
      scene: sceneRikers,
    },
  );

  const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "entry.png"), encodePNG(cv));
}

main();
