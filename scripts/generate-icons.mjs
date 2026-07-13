import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const input = path.join(rootDir, "src/assets/logo next.jpeg");
const iconsDir = path.join(rootDir, "public/icons");
const publicDir = path.join(rootDir, "public");

async function generateIcon(size, outputPath) {
  await sharp(input)
    .resize(size, size, {
      fit: "contain",
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    })
    .png()
    .toFile(outputPath);
}

await mkdir(iconsDir, { recursive: true });

await Promise.all([
  generateIcon(32, path.join(iconsDir, "favicon-32.png")),
  generateIcon(180, path.join(publicDir, "apple-touch-icon.png")),
  generateIcon(192, path.join(iconsDir, "icon-192.png")),
  generateIcon(512, path.join(iconsDir, "icon-512.png")),
]);

console.log("Icones gerados a partir do logo da escola.");
