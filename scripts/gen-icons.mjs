// Regenerate PWA/favicon icons from public/brand-icon.png. Run: node scripts/gen-icons.mjs
// The source is a proper transparent PNG (rounded tile, transparent surroundings). We crop to
// the tile and keep the transparent corners for the browser/PWA icons; iOS + Android-maskable
// get an opaque full-bleed variant (they flatten alpha and apply their own mask).
import sharp from "sharp";
import { writeFile } from "node:fs/promises";

const SRC = "public/brand-icon.png";
const DARK = "#06160f"; // the tile's own dark colour, for the full-bleed corner fill

// Crop away the transparent margin so the rounded tile fills the frame.
const trimmed = await sharp(SRC).trim({ threshold: 10 }).toBuffer();
const tile = await sharp(trimmed).resize(512, 512, { fit: "fill" }).png().toBuffer();

// Browser / PWA "any" icons — keep the transparent corners (no black edge on any background).
for (const [out, size] of [
  ["public/icons/icon-512.png", 512],
  ["public/icons/icon-192.png", 192],
  ["public/icons/icon-32.png", 32],
  ["public/icons/icon-16.png", 16],
]) {
  await sharp(tile).resize(size, size).png().toFile(out);
  console.log("wrote", out, `${size}²`);
}

// Maskable — built from the existing icon-512, laid full-bleed over the tile's dark colour so
// the corners are dark (never black) once the OS applies its circle/squircle mask.
const opaque = await sharp({ create: { width: 512, height: 512, channels: 4, background: DARK } })
  .composite([{ input: "public/icons/icon-512.png" }])
  .png()
  .toBuffer();
await sharp(opaque).toFile("public/icons/icon-512-maskable.png");
await sharp(opaque).resize(180, 180).png().toFile("public/icons/apple-touch-icon.png");
console.log("wrote icon-512-maskable.png + apple-touch-icon.png (full-bleed)");

// favicon.ico — a real multi-size ICO (16 + 32) wrapping PNG frames.
const icoFrames = await Promise.all([16, 32].map((s) => sharp(tile).resize(s, s).png().toBuffer()));
const ico = buildIco(icoFrames, [16, 32]);
await writeFile("app/favicon.ico", ico); // app-router convention serves this at /favicon.ico
console.log("wrote app/favicon.ico (16 + 32)");

// Minimal ICO writer (PNG-compressed frames, supported by all modern browsers).
function buildIco(pngs, sizes) {
  const count = pngs.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type = icon
  header.writeUInt16LE(count, 4);
  const dir = Buffer.alloc(16 * count);
  let offset = 6 + 16 * count;
  pngs.forEach((png, i) => {
    const s = sizes[i];
    const e = 16 * i;
    dir.writeUInt8(s >= 256 ? 0 : s, e); // width
    dir.writeUInt8(s >= 256 ? 0 : s, e + 1); // height
    dir.writeUInt8(0, e + 2); // palette
    dir.writeUInt8(0, e + 3); // reserved
    dir.writeUInt16LE(1, e + 4); // planes
    dir.writeUInt16LE(32, e + 6); // bpp
    dir.writeUInt32LE(png.length, e + 8);
    dir.writeUInt32LE(offset, e + 12);
    offset += png.length;
  });
  return Buffer.concat([header, dir, ...pngs]);
}
