// main.ts — hands the app in: copies app/ and screenshots/ from this
// repository to the output directory and writes /output/dossier.json with
// buildDossier from the kit's vendor/makefun-frontend.ts (unchanged).
// Runs twice and writes the same bytes both times; Node 22, stdlib only.
import { buildDossier } from './vendor/makefun-frontend.ts';
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR || '/output';

for (const dir of ['app', 'screenshots']) {
  if (!existsSync(join(root, dir))) throw new Error('main.ts: missing ' + dir + '/ in ' + root);
}
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
cpSync(join(root, 'app'), join(out, 'app'), { recursive: true });
cpSync(join(root, 'screenshots'), join(out, 'screenshots'), { recursive: true });
writeFileSync(join(out, 'dossier.json'), buildDossier(out, {
  text_max_bytes: 163840,
  screenshots: { max: 3, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 16777216,
}));
