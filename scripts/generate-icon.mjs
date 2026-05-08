// Generates the app icon set from a single inline SVG composition.
// Usage: node scripts/generate-icon.mjs
import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const here = dirname(fileURLToPath(import.meta.url));
const assetsDir = join(here, '..', 'assets');

// Brand colors
const GRADIENT_TOP = '#f0abfc'; // candy pink
const GRADIENT_BOTTOM = '#fb7185'; // warm coral
const RECORD = '#ef4444';

// 1024x1024 main icon. iOS applies a squircle mask, so the background must be solid.
const iconSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="${GRADIENT_TOP}"/>
      <stop offset="100%" stop-color="${GRADIENT_BOTTOM}"/>
    </linearGradient>
    <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="14" result="blur"/>
      <feOffset dy="12" result="off"/>
      <feFlood flood-color="rgba(120, 30, 80, 0.3)"/>
      <feComposite in2="off" operator="in"/>
      <feMerge>
        <feMergeNode/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <!-- background (full bleed, no rounding — iOS masks it) -->
  <rect width="1024" height="1024" fill="url(#bg)"/>

  <!-- decorative confetti dots -->
  <g opacity="0.4">
    <circle cx="180" cy="170" r="14" fill="#67e8f9"/>
    <circle cx="880" cy="220" r="10" fill="#fde047"/>
    <circle cx="120" cy="780" r="12" fill="#fde047"/>
    <circle cx="900" cy="860" r="16" fill="#67e8f9"/>
    <circle cx="280" cy="900" r="8" fill="#bef264"/>
    <circle cx="780" cy="120" r="9" fill="#bef264"/>
  </g>

  <!-- speech bubble with shadow -->
  <g filter="url(#softShadow)">
    <path d="M 250 320
             C 250 270, 290 230, 340 230
             L 684 230
             C 734 230, 774 270, 774 320
             L 774 600
             C 774 650, 734 690, 684 690
             L 540 690
             L 425 790
             L 450 690
             L 340 690
             C 290 690, 250 650, 250 600
             Z" fill="#ffffff"/>
  </g>

  <!-- record dot inside bubble -->
  <circle cx="512" cy="455" r="68" fill="${RECORD}"/>
  <!-- inner highlight for record dot -->
  <circle cx="488" cy="430" r="20" fill="rgba(255, 255, 255, 0.45)"/>
</svg>
`;

// Splash icon — foreground mark only, transparent background.
// Splash screen handles the background color (set in app.json).
const splashSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>
    <linearGradient id="bubble" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ff5d8f"/>
      <stop offset="100%" stop-color="#fb7185"/>
    </linearGradient>
  </defs>
  <path d="M 250 320
           C 250 270, 290 230, 340 230
           L 684 230
           C 734 230, 774 270, 774 320
           L 774 600
           C 774 650, 734 690, 684 690
           L 540 690
           L 425 790
           L 450 690
           L 340 690
           C 290 690, 250 650, 250 600
           Z" fill="url(#bubble)"/>
  <circle cx="512" cy="455" r="68" fill="#ffffff"/>
</svg>
`;

async function render(svg, outPath, size = 1024) {
  await sharp(Buffer.from(svg))
    .resize(size, size, { fit: 'cover' })
    .png({ compressionLevel: 9, quality: 100 })
    .toFile(outPath);
  console.log(`✓ ${outPath}`);
}

async function main() {
  await mkdir(assetsDir, { recursive: true });
  // Main App Store icon — solid background.
  await render(iconSvg, join(assetsDir, 'icon.png'), 1024);
  // Android adaptive icon foreground (Android applies its own background per app.json).
  await render(iconSvg, join(assetsDir, 'adaptive-icon.png'), 1024);
  // Splash icon — foreground mark on transparent.
  await render(splashSvg, join(assetsDir, 'splash-icon.png'), 1024);
  // Favicon (web) — same as splash but smaller; only used if you ever ship a web build.
  await render(iconSvg, join(assetsDir, 'favicon.png'), 192);
  // Persist source SVGs alongside the PNGs in case we ever want to tweak the design.
  await writeFile(join(assetsDir, 'icon.source.svg'), iconSvg, 'utf8');
  await writeFile(join(assetsDir, 'splash.source.svg'), splashSvg, 'utf8');
  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
