// Genera los íconos de marca de Vitalsy Life a partir del wordmark de la app
// (src/shared/ui/Wordmark.tsx): «Vitalsy» en PlusJakartaSans Bold + pastilla «Life»
// en SemiBold. Uso: node scripts/generate-brand-assets.mjs
import { Resvg } from '@resvg/resvg-js';
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const assets = join(root, 'assets');
const fontDir = join(root, 'node_modules', '@expo-google-fonts', 'plus-jakarta-sans');
const fontFiles = [
  join(fontDir, '700Bold', 'PlusJakartaSans_700Bold.ttf'),
  join(fontDir, '600SemiBold', 'PlusJakartaSans_600SemiBold.ttf'),
];

// Mismos valores que `brand` en src/shared/theme/tokens.ts.
const brand = { word: '#1B2228', pillBg: '#E6F4F3', pillText: '#1F6B69', canvas: '#FAF9F6' };

// Medidas del Wordmark en pantalla (px lógicos).
const WORD = { size: 22, spacing: -0.3, family: 'Plus Jakarta Sans', weight: 700 };
const PILL = { size: 11, spacing: 0.4, padX: 8, padY: 2, gap: 6, weight: 600 };
const CAP = 0.35; // media altura de mayúscula (em) para centrar verticalmente

const fontOpts = { fontFiles, loadSystemFonts: false, defaultFontFamily: WORD.family };

function textWidth(text, size, weight, spacing) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="2000" height="200">
    <text x="0" y="100" font-family="${WORD.family}" font-weight="${weight}" font-size="${size}"
      letter-spacing="${spacing}">${text}</text></svg>`;
  const box = new Resvg(svg, { font: fontOpts }).getBBox();
  if (!box) throw new Error(`No se pudo medir «${text}» (¿fuentes cargadas?)`);
  return box.width;
}

const wordW = textWidth('Vitalsy', WORD.size, WORD.weight, WORD.spacing);
const lifeW = textWidth('Life', PILL.size, PILL.weight, PILL.spacing);
const pillW = lifeW + PILL.padX * 2;
const pillH = Math.round(PILL.size * 1.27) + PILL.padY * 2;
const markW = wordW + PILL.gap + pillW;
const markH = Math.max(WORD.size * 1.3, pillH);

/**
 * Wordmark completo en coordenadas lógicas (origen arriba-izquierda, tamaño markW×markH).
 * mono: una sola tinta; «Life» queda calado en la pastilla.
 */
function wordmarkGroup({ mono = null } = {}) {
  const cy = markH / 2;
  const px = wordW + PILL.gap;
  const wordFill = mono ?? brand.word;
  const word = `<text x="0" y="${cy + WORD.size * CAP}" font-family="${WORD.family}" font-weight="${WORD.weight}"
    font-size="${WORD.size}" letter-spacing="${WORD.spacing}" fill="${wordFill}">Vitalsy</text>`;
  const pillRect = `<rect x="${px}" y="${cy - pillH / 2}" width="${pillW}" height="${pillH}" rx="${pillH / 2}"`;
  const lifeText = (fill) =>
    `<text x="${px + PILL.padX}" y="${cy + PILL.size * CAP}" font-family="${WORD.family}" font-weight="${PILL.weight}"
      font-size="${PILL.size}" letter-spacing="${PILL.spacing}" fill="${fill}">Life</text>`;
  if (mono) {
    return `<defs><mask id="cut" maskUnits="userSpaceOnUse" x="0" y="0" width="${markW}" height="${markH}">
      <rect width="${markW}" height="${markH}" fill="#fff"/>${lifeText('#000')}</mask></defs>
      ${word}${pillRect} fill="${mono}" mask="url(#cut)"/>`;
  }
  return `${word}${pillRect} fill="${brand.pillBg}"/>${lifeText(brand.pillText)}`;
}

/** Marca compacta (favicon): la «V» del wordmark. */
function compactGroup(size) {
  return `<text x="${size / 2}" y="${size / 2 + size * 0.5 * 0.7 * 0.5}" text-anchor="middle"
    font-family="${WORD.family}" font-weight="700" font-size="${size * 0.5}" fill="${brand.word}">V</text>`;
}

/** Coloca el wordmark centrado en un lienzo size×size, ocupando `widthFraction` del ancho. */
function composeSvg({ size, widthFraction, background = null, mono = null }) {
  const scale = (size * widthFraction) / markW;
  const x = (size - markW * scale) / 2;
  const y = (size - markH * scale) / 2;
  const bg = background ? `<rect width="${size}" height="${size}" fill="${background}"/>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    ${bg}<g transform="translate(${x} ${y}) scale(${scale})">${wordmarkGroup({ mono })}</g></svg>`;
}

function render(svg) {
  return new Resvg(svg, { font: fontOpts }).render();
}

// --- PNG RGB sin alpha (iOS no admite transparencia en icon.png) ---
const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 255] ^ (c >>> 8);
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
function encodeRgbPng(width, height, rgba) {
  const raw = Buffer.alloc((width * 3 + 1) * height);
  for (let y = 0; y < height; y++) {
    const row = y * (width * 3 + 1);
    raw[row] = 0;
    for (let x = 0; x < width; x++) {
      const s = (y * width + x) * 4;
      const d = row + 1 + x * 3;
      raw[d] = rgba[s];
      raw[d + 1] = rgba[s + 1];
      raw[d + 2] = rgba[s + 2];
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // profundidad
  ihdr[9] = 2; // color type RGB
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function alphaBox(img) {
  const { width, height } = img;
  const px = img.pixels;
  let x0 = width, y0 = height, x1 = -1, y1 = -1;
  for (let i = 3; i < px.length; i += 4) {
    if (px[i] === 0) continue;
    const pixel = (i - 3) / 4;
    const x = pixel % width;
    const y = Math.floor(pixel / width);
    x0 = Math.min(x0, x);
    x1 = Math.max(x1, x);
    y0 = Math.min(y0, y);
    y1 = Math.max(y1, y);
  }
  return { x0, y0, x1, y1 };
}

function assertSafeZone(name, img, fraction) {
  const { x0, y0, x1, y1 } = alphaBox(img);
  const margin = Math.round((img.width * (1 - fraction)) / 2);
  const ok = x0 >= margin && y0 >= margin && x1 <= img.width - 1 - margin && y1 <= img.height - 1 - margin;
  console.log(`${name}: contenido ${x0},${y0} - ${x1},${y1} (margen requerido ${margin}px) ${ok ? 'OK' : 'FALLA'}`);
  if (!ok) throw new Error(`${name}: el contenido sale de la zona segura`);
}

mkdirSync(assets, { recursive: true });
const out = (name, buf) => writeFileSync(join(assets, name), buf);

// icon.png: lienzo sólido, wordmark al 76 % del ancho (margen lateral 12 %).
const icon = render(composeSvg({ size: 1024, widthFraction: 0.76, background: brand.canvas }));
const iconPixels = icon.pixels;
out('icon.png', encodeRgbPng(icon.width, icon.height, iconPixels));

// splash-icon.png: wordmark sobre fondo transparente (el color de fondo lo pone la config).
const splash = render(composeSvg({ size: 1024, widthFraction: 0.76 }));
out('splash-icon.png', splash.asPng());

// Adaptive Android: foreground dentro del 66 % (zona segura), fondo y monocromo.
const fg = render(composeSvg({ size: 1024, widthFraction: 0.62 }));
assertSafeZone('android-icon-foreground', fg, 0.66);
out('android-icon-foreground.png', fg.asPng());

const bgSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024"><rect width="1024" height="1024" fill="${brand.canvas}"/></svg>`;
out('android-icon-background.png', render(bgSvg).asPng());

const mono = render(composeSvg({ size: 1024, widthFraction: 0.62, mono: '#000000' }));
assertSafeZone('android-icon-monochrome', mono, 0.66);
out('android-icon-monochrome.png', mono.asPng());

// favicon: 48×48, la «V» del wordmark (el wordmark completo sería ilegible).
const fav = render(
  `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48"><rect width="48" height="48" rx="10" fill="${brand.canvas}"/>${compactGroup(48)}</svg>`,
);
out('favicon.png', fav.asPng());

// Autoverificación: el icono iOS no debe tener transparencia.
const iconPx = icon.pixels; // el getter crea un buffer nuevo en cada acceso
let alphaIcon = false;
for (let i = 3; i < iconPx.length; i += 4) if (iconPx[i] !== 255) alphaIcon = true;
if (alphaIcon) throw new Error('icon.png tiene transparencia');
console.log('Íconos de marca generados en assets/.');
