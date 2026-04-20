#!/usr/bin/env node
/**
 * Generate NPC portraits via Pollinations.ai Flux endpoint.
 * Seed-locked per NPC for consistency across expressions.
 * Retries on failure. Skips files that already exist and are valid.
 */
import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';

const NPCS = [
  { key: 'kael', seed: 3001, base: 'anime dark fantasy portrait, male dwarf blacksmith, soot-smudged face, thick arms, leather apron, beard, steel grey eyes, upper body, frameless persona 5 style, dark forge atmosphere, detailed illustration' },
  { key: 'hermit', seed: 3002, base: 'anime dark fantasy portrait, thin elderly hermit, reed-like frail build, marsh-dweller, robes color of muddy water, sharp awake eyes, grey wispy hair, upper body, frameless persona 5 style, ominous misty atmosphere, detailed illustration' },
  { key: 'veyrin', seed: 3003, base: 'anime dark fantasy portrait, elven male scholar, pale skin, long dark hair, thin steady hands, leather-bound book, tired eyes, upper body, frameless persona 5 style, haunted candlelit atmosphere, detailed illustration' },
  { key: 'nessa', seed: 3004, base: 'anime dark fantasy portrait, female human dockmaster, practical weathered face, hard jawline, sea-worn clothes, short dark hair, captain bearing, upper body, frameless persona 5 style, stormy maritime atmosphere, detailed illustration' },
  { key: 'torben', seed: 3005, base: 'anime dark fantasy portrait, broad-shouldered male fishmonger, stained apron, thick beard, hard eyes hiding fear, upper body, frameless persona 5 style, coastal atmosphere, detailed illustration' },
  { key: 'mira', seed: 3006, base: 'anime dark fantasy portrait, young female thief, thin agile build, hooded dark cloak, quick clever eyes, dagger at belt, unreadable smile, upper body, frameless persona 5 style, shadowy alley atmosphere, detailed illustration' },
];

const EXPRESSIONS = ['neutral', 'thoughtful', 'sad', 'angry'];
const MIN_VALID_SIZE = 10_000; // bytes — smaller than this = error response
const MAX_RETRIES = 3;

function download(url, filepath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath);
    const req = https.get(url, { timeout: 120000 }, (response) => {
      if (response.statusCode !== 200) {
        file.close();
        try { fs.unlinkSync(filepath); } catch {}
        return reject(new Error(`HTTP ${response.statusCode}`));
      }
      response.pipe(file);
      file.on('finish', () => file.close(() => resolve()));
      response.on('error', (err) => {
        file.close();
        try { fs.unlinkSync(filepath); } catch {}
        reject(err);
      });
    });
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('timeout'));
    });
    req.on('error', (err) => {
      file.close();
      try { fs.unlinkSync(filepath); } catch {}
      reject(err);
    });
  });
}

async function fetchOne(npc, expr) {
  const dir = path.resolve(process.cwd(), 'src/assets/portraits', npc.key);
  fs.mkdirSync(dir, { recursive: true });
  const filepath = path.join(dir, `${expr}.png`);

  // Skip if already valid
  if (fs.existsSync(filepath) && fs.statSync(filepath).size >= MIN_VALID_SIZE) {
    console.log(`  ${npc.key}/${expr}.png ... SKIP (exists, ${(fs.statSync(filepath).size / 1024).toFixed(1)}KB)`);
    return;
  }

  const prompt = `${npc.base}, ${expr} expression`;
  const encoded = encodeURIComponent(prompt);
  const url = `https://image.pollinations.ai/prompt/${encoded}?width=512&height=512&seed=${npc.seed}&model=flux&nologo=true`;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await download(url, filepath);
      const size = fs.statSync(filepath).size;
      if (size < MIN_VALID_SIZE) {
        throw new Error(`too small (${size} bytes)`);
      }
      console.log(`  ${npc.key}/${expr}.png ... ${(size / 1024).toFixed(1)}KB${attempt > 1 ? ` (attempt ${attempt})` : ''}`);
      return;
    } catch (e) {
      if (attempt === MAX_RETRIES) {
        console.log(`  ${npc.key}/${expr}.png ... FAILED after ${MAX_RETRIES} tries: ${e.message}`);
        return;
      }
      await new Promise((r) => setTimeout(r, 2000 * attempt));
    }
  }
}

for (const npc of NPCS) {
  for (const expr of EXPRESSIONS) {
    await fetchOne(npc, expr);
  }
}
console.log('\nDone.');
