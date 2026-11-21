// The Leonida Ledger — entrypoint: hands the guide in.
// Copies app/ and screenshots/ from this repository to $MAKEFUN_OUTPUT_DIR
// and writes /output/dossier.json with buildDossier from
// vendor/makefun-frontend.ts. Outside the grader, MAKEFUN_OUTPUT_DIR
// stands in for /output.
import { cpSync, existsSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const REPO = dirname(fileURLToPath(import.meta.url));
const OUT = process.env.MAKEFUN_OUTPUT_DIR || join(REPO, 'out');

async function main() {
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });
  for (const name of ['app', 'screenshots']) {
    const src = join(REPO, name);
    if (existsSync(src)) cpSync(src, join(OUT, name), { recursive: true });
  }
  // Fail loudly if the copy did not land: the gate reads /output, not the repo.
  if (!existsSync(join(OUT, 'app', 'index.html'))) {
    throw new Error('app/index.html missing from ' + OUT + ' after copy');
  }
  if (!existsSync(join(OUT, 'app', 'data', 'trophies.json'))) {
    throw new Error('app/data/trophies.json missing from ' + OUT + ' after copy');
  }
  const dossier = await buildDossier(OUT, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  });
  writeFileSync(join(OUT, 'dossier.json'), dossier);
  console.log(`dossier written to ${join(OUT, 'dossier.json')} (${dossier.length} bytes)`);
}

await main();
