// Generate 13" iPad portrait screenshots (2064×2752) from existing iPhone
// screenshots by scaling to fit and centering on a brand-colored background.
import sharp from 'sharp';
import { readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const srcDir = join(root, 'fastlane', 'screenshots', 'en-US');
const dstDir = join(root, 'fastlane', 'screenshots', 'ipad-13');

const W = 2064;
const H = 2752;
// Midnight bg (#120a26) so the dark marketing screenshots blend into a single
// uninterrupted canvas.
const BG = { r: 0x12, g: 0x0a, b: 0x26, alpha: 1 };

const files = readdirSync(srcDir)
  .filter((f) => f.endsWith('.png'))
  .sort();

for (const file of files) {
  const src = join(srcDir, file);
  const meta = await sharp(src).metadata();
  // Scale to fit height (iPad is taller in absolute pixels but proportionally
  // wider). We pick whichever scale fits within the iPad bounds with margin.
  const margin = 80;
  const maxW = W - margin * 2;
  const maxH = H - margin * 2;
  const scale = Math.min(maxW / meta.width, maxH / meta.height);
  const fittedW = Math.round(meta.width * scale);
  const fittedH = Math.round(meta.height * scale);
  const inner = await sharp(src).resize(fittedW, fittedH).toBuffer();
  await sharp({
    create: { width: W, height: H, channels: 4, background: BG },
  })
    .composite([
      {
        input: inner,
        left: Math.round((W - fittedW) / 2),
        top: Math.round((H - fittedH) / 2),
      },
    ])
    .png()
    .toFile(join(dstDir, file));
  console.log(`✓ ${file} → ${W}×${H}`);
}
