import fs from 'fs';
import { execSync } from 'child_process';
import path from 'path';

// Note: Requires sharp to be installed, or we can use a simpler approach if not available.
// Since we are in a vite/react project, let's just use a quick canvas-based or cli tool to convert it.
// Actually, using a quick node script with 'sharp' is ideal if it's installed or we can install it temporarily.

console.log("Installing sharp...");
execSync('npm install --no-save sharp --legacy-peer-deps', { stdio: 'inherit' });

const sharp = await import('sharp');

const sizes = [16, 32, 48, 128];
const inputSvg = path.join(process.cwd(), 'public', 'mosaic-logo.svg');

for (const size of sizes) {
  const outputPath = path.join(process.cwd(), 'public', `icon-${size}.png`);
  console.log(`Generating ${outputPath}...`);
  await sharp.default(inputSvg)
    .resize(size, size)
    .png()
    .toFile(outputPath);
}

console.log("Done generating icons.");
