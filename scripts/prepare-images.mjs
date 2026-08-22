// Crops the product photo out of each Instagram screenshot and writes a 4:5
// portrait into public/media.
//
// The object stays the photographed object: this is crop and resize only, no
// generation and no retouching, so every output is still `origin: photograph`.
// Regions come from a manual pass over all 24 screenshots; anything that was a
// brand card, a reel cover or a shot with no separable product is excluded.

import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const SRC = "screenshots";
const OUT = path.join("public", "media");

// [file suffix, top fraction, bottom fraction, slug, leftFraction?, rightFraction?]
// Some posts are composites — a photo set inside a coloured card, often with a
// script watermark on the card rather than the photo. For those, the x bounds
// pull the crop in to the inner photograph.
const REGIONS = [
  ["175441", 0.17,  0.70,  "reed-clutch-colourways"],
  ["175512", 0.215, 0.84,  "braided-table-mats"],
  ["175517", 0.21,  0.68,  "ring-handle-tote-carried"],
  ["175525", 0.21,  0.60,  "ring-handle-tote"],
  ["175531", 0.21,  0.68,  "ring-handle-tote-clutch"],
  ["175550", 0.247, 0.73,  "ring-handle-tote-detail"],
  ["175558", 0.247, 0.733, "ring-handle-tote-held"],
  ["175606", 0.25,  0.70,  "reed-clutch"],
  ["175614", 0.11,  0.90,  "sun-hat-worn"],
  ["175633", 0.106, 0.845, "moon-bag-open"],
  ["175705", 0.15,  0.895, "market-basket"],
  ["175737", 0.10,  0.80,  "moon-bag-table"],
  ["175743", 0.18,  0.76,  "ring-handle-tote-daisies"],
  ["175757", 0.18,  0.81,  "kans-grass-growing"],
  ["175822", 0.319, 0.711, "moon-bag-magenta", 0.16, 0.86],
  ["175846", 0.165, 0.795, "meditation-mat-in-use"],
  ["175856", 0.40,  0.78,  "meditation-mats"],
  ["175913", 0.195, 0.795, "gulguliya-vase-pen-stand"],
  ["175918", 0.21,  0.81,  "storage-trays"],
  ["175923", 0.30,  0.775, "woven-placemats"],
  ["175929", 0.24,  0.85,  "floor-pouf"],
];

const TARGET_W = 1200;
const TARGET_H = 1500; // 4:5

fs.mkdirSync(OUT, { recursive: true });

const files = fs.readdirSync(SRC).filter((f) => f.toLowerCase().endsWith(".jpg"));
let written = 0;

for (const [suffix, top, bottom, slug, left = 0, right = 1] of REGIONS) {
  const file = files.find((f) => f.includes(suffix));
  if (!file) {
    console.warn(`no screenshot matching ${suffix}`);
    continue;
  }

  const src = path.join(SRC, file);
  const meta = await sharp(src).metadata();
  const cropTop = Math.round(meta.height * top);
  const cropHeight = Math.round(meta.height * (bottom - top));
  const cropLeft = Math.round(meta.width * left);
  const cropWidth = Math.round(meta.width * (right - left));

  // Take the band, then centre-crop it to 4:5 so every card in the grid shares
  // one ratio — consistency across the catalogue reads as more considered than
  // variety.
  await sharp(src)
    .extract({ left: cropLeft, top: cropTop, width: cropWidth, height: cropHeight })
    .resize(TARGET_W, TARGET_H, { fit: "cover", position: "attention" })
    .jpeg({ quality: 86, mozjpeg: true })
    .toFile(path.join(OUT, `${slug}.jpg`));

  written++;
  console.log(`${slug}.jpg`);
}

console.log(`\nwrote ${written} images to ${OUT}`);
