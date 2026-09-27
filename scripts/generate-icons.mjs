/**
 * Generates every app / PWA icon from assets/logo.png.
 *   node scripts/generate-icons.mjs
 */
import sharp from "sharp";
import { mkdir } from "node:fs/promises";

const SRC = "assets/logo.png";
const NAVY = { r: 31, g: 23, b: 102, alpha: 1 }; // #1f1766, from the logo
const CLEAR = { r: 0, g: 0, b: 0, alpha: 0 };

await mkdir("public/icons", { recursive: true });

/** Logo centred on a square canvas, occupying `scale` of the width. */
async function icon(size, out, { scale = 1, background = CLEAR } = {}) {
  const inner = Math.round(size * scale);
  const logo = await sharp(SRC).resize(inner, inner, { fit: "contain", background: CLEAR }).png().toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background } })
    .composite([{ input: logo, gravity: "centre" }])
    .png({ compressionLevel: 9 })
    .toFile(out);
  console.log("✓", out);
}

// Standard ("any") icons: the round logo on transparency.
await icon(192, "public/icons/icon-192.png");
await icon(512, "public/icons/icon-512.png");
// Maskable: keep the logo inside the 80% safe zone on the brand navy.
await icon(192, "public/icons/maskable-192.png", { scale: 0.78, background: NAVY });
await icon(512, "public/icons/maskable-512.png", { scale: 0.78, background: NAVY });
// iOS ignores transparency, so give it a solid background.
await icon(180, "src/app/apple-icon.png", { scale: 0.86, background: NAVY });
// Browser tab icon.
await icon(64, "src/app/icon.png");
// Used inside the UI (sidebar, sign-in, offline page).
await icon(256, "public/logo.png");
