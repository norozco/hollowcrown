#!/usr/bin/env node
/**
 * fetch-tilesets.mjs
 *
 * Downloads the CC0 Kenney "Tiny Town" and "Tiny Dungeon" asset packs,
 * extracts them, and copies the packed tilemap PNGs into
 * public/assets/tilesets/ for the game to load at runtime.
 *
 * Everything on kenney.nl is CC0 1.0 Universal (public domain). No
 * attribution legally required, but we credit Kenney in
 * public/assets/tilesets/README.md and CREDITS.md.
 *
 * Usage:  node scripts/fetch-tilesets.mjs
 *
 * If the primary URLs 404, the script scrapes the kenney.nl asset pages
 * for the current download link and retries. If extraction via
 * adm-zip fails, it falls back to shelling out to PowerShell's
 * Expand-Archive (Windows) or the system `unzip` (Unix).
 */
import { mkdir, writeFile, readFile, copyFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DEST = path.join(ROOT, 'public', 'assets', 'tilesets');
const TMP = path.join(ROOT, 'scripts', '_tmp');

const PACKS = [
  {
    name: 'tiny-town',
    pageUrl: 'https://kenney.nl/assets/tiny-town',
    primary: 'https://kenney.nl/media/pages/assets/tiny-town/5e46f9e551-1735736916/kenney_tiny-town.zip',
  },
  {
    name: 'tiny-dungeon',
    pageUrl: 'https://kenney.nl/assets/tiny-dungeon',
    primary: 'https://kenney.nl/media/pages/assets/tiny-dungeon/b56d7a13e3-1674742415/kenney_tiny-dungeon.zip',
  },
];

async function fetchBuffer(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

async function resolveZipUrl(pack) {
  try {
    const buf = await fetchBuffer(pack.primary);
    return { url: pack.primary, buf };
  } catch {
    // Scrape the page for the current zip URL.
    const html = await (await fetch(pack.pageUrl)).text();
    const re = new RegExp(`https?://[^"'\\s]*${pack.name.replace('-', '[_-]')}[^"'\\s]*\\.zip`, 'i');
    const m = html.match(re);
    if (!m) throw new Error(`Could not find zip URL on ${pack.pageUrl}`);
    const buf = await fetchBuffer(m[0]);
    return { url: m[0], buf };
  }
}

function extract(zipPath, outDir) {
  if (process.platform === 'win32') {
    execSync(
      `powershell -NoProfile -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${outDir}' -Force"`,
      { stdio: 'inherit' }
    );
  } else {
    execSync(`unzip -o "${zipPath}" -d "${outDir}"`, { stdio: 'inherit' });
  }
}

async function main() {
  await mkdir(DEST, { recursive: true });
  await mkdir(TMP, { recursive: true });

  for (const pack of PACKS) {
    console.log(`\n[${pack.name}] fetching...`);
    const { url, buf } = await resolveZipUrl(pack);
    const zipPath = path.join(TMP, `${pack.name}.zip`);
    await writeFile(zipPath, buf);
    console.log(`  ${buf.length} bytes from ${url}`);

    const outDir = path.join(TMP, pack.name);
    if (existsSync(outDir)) await rm(outDir, { recursive: true, force: true });
    await mkdir(outDir, { recursive: true });
    extract(zipPath, outDir);

    const packedSrc = path.join(outDir, 'Tilemap', 'tilemap_packed.png');
    const licenseSrc = path.join(outDir, 'License.txt');
    const packedDst = path.join(DEST, `${pack.name}_packed.png`);
    const licenseDst = path.join(DEST, `${pack.name}_License.txt`);
    await copyFile(packedSrc, packedDst);
    await copyFile(licenseSrc, licenseDst);
    console.log(`  -> ${packedDst}`);
  }

  // Verify both licenses mention CC0 — abort if something changed upstream.
  for (const pack of PACKS) {
    const txt = await readFile(path.join(DEST, `${pack.name}_License.txt`), 'utf8');
    if (!/CC0|publicdomain\/zero/i.test(txt)) {
      throw new Error(`${pack.name} license did not match CC0 — aborting, do NOT ship.`);
    }
  }
  console.log('\nAll packs verified CC0. Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
