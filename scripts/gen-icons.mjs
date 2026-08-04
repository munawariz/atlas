#!/usr/bin/env node
/*
 * Generate the PWA icon set from a single source image.
 *
 *   node scripts/gen-icons.mjs [source]
 *
 * Source defaults to public/brand-icon.png. If it is missing, a brand mark is drawn from
 * scratch — the lime four-point sparkle on forest — so a fresh clone still installs as a PWA
 * with something sensible on the home screen.
 */

import { mkdir, access, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = resolve(ROOT, "public/icons");

const FOREST = "#003511";
const LIME = "#d3fa53";

/** The sparkle path from the app header, scaled to a 512 box. */
const SPARKLE =
  "M12 2c.6 5.2 4.2 8.8 9.4 9.4v1.2C16.2 13.2 12.6 16.8 12 22h-1.2C10.2 16.8 6.6 13.2 1.4 12.6v-1.2C6.6 10.8 10.2 7.2 10.8 2z";

function fallbackSvg(size) {
  // The glyph occupies the middle 50% so it survives a maskable crop.
  const glyph = size * 0.5;
  const offset = (size - glyph) / 2;
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
       <rect width="${size}" height="${size}" fill="${FOREST}"/>
       <g transform="translate(${offset} ${offset}) scale(${glyph / 24})">
         <path d="${SPARKLE}" fill="${LIME}"/>
       </g>
     </svg>`
  );
}

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

const TARGETS = [
  { file: "icon-192.png", size: 192, maskable: false },
  { file: "icon-512.png", size: 512, maskable: false },
  { file: "icon-512-maskable.png", size: 512, maskable: true },
  { file: "apple-touch-icon.png", size: 180, maskable: false },
];

async function main() {
  const source = resolve(ROOT, process.argv[2] ?? "public/brand-icon.png");
  const hasSource = await exists(source);

  if (!hasSource) {
    console.log(
      `No source image at ${source} — drawing the Atlas mark instead.\n` +
        "Drop a square PNG there and re-run to use your own."
    );
  }

  await mkdir(OUT_DIR, { recursive: true });

  for (const target of TARGETS) {
    const out = resolve(OUT_DIR, target.file);

    if (!hasSource) {
      await sharp(fallbackSvg(target.size)).png().toFile(out);
    } else {
      /*
       * A maskable icon is cropped to a circle by the launcher, so the artwork must sit in the
       * middle 80% — anything closer to the edge gets cut off. Padding it here is what keeps
       * the mark intact on Android.
       */
      const inner = target.maskable
        ? Math.round(target.size * 0.8)
        : target.size;
      const pad = Math.round((target.size - inner) / 2);

      await sharp(source)
        .resize(inner, inner, { fit: "contain", background: FOREST })
        .extend({
          top: pad,
          bottom: pad,
          left: pad,
          right: pad,
          background: FOREST,
        })
        .png()
        .toFile(out);
    }

    console.log(`  ${target.file}  ${target.size}x${target.size}`);
  }

  // A favicon that needs no extra tooling: browsers accept SVG here.
  await writeFile(
    resolve(ROOT, "public/favicon.svg"),
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <rect width="24" height="24" rx="5" fill="${FOREST}"/>
  <g transform="translate(4.5 4.5) scale(0.625)">
    <path d="${SPARKLE}" fill="${LIME}"/>
  </g>
</svg>
`,
    "utf8"
  );
  console.log("  favicon.svg");

  console.log("\n✅ Icons written to public/icons/");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
