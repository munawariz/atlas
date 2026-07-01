// Regenerate PWA/favicon PNGs. Run: node scripts/gen-icons.mjs
// Prefers a full high-res square app icon at public/brand-icon.png; otherwise falls back
// to cropping the app-icon tile out of the brand guidelines image.
import sharp from "sharp";
import { existsSync } from "node:fs";

const HIRES = "public/brand-icon.png";
let base; // a 512x512 buffer of the icon tile

if (existsSync(HIRES)) {
  base = await sharp(HIRES).resize(512, 512, { fit: "cover" }).png().toBuffer();
  console.log("source: high-res", HIRES);
} else {
  const TILE = { left: 877, top: 89, width: 144, height: 144 };
  base = await sharp("public/brand-guidelines.png").extract(TILE).resize(512, 512, { kernel: "lanczos3" }).sharpen({ sigma: 1 }).png().toBuffer();
  console.log("source: cropped from brand-guidelines.png");
}

const sizes = [
  ["public/icons/icon-192.png", 192],
  ["public/icons/icon-512.png", 512],
  ["public/icons/apple-touch-icon.png", 180],
  ["public/icons/icon-32.png", 32],
];
for (const [out, size] of sizes) {
  await sharp(base).resize(size, size).png().toFile(out);
  console.log("wrote", out, `${size}x${size}`);
}

// Maskable: full-bleed tile (mark is centred well within the safe zone). The OS applies its
// own circle/squircle mask, clipping only the dark corners.
await sharp(base).resize(512, 512).png().toFile("public/icons/icon-512-maskable.png");
console.log("wrote public/icons/icon-512-maskable.png 512x512 (maskable)");
