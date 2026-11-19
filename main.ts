// Leonida Trophy Guide — the program that hands the entry in.
//
// This repository is a static, offline web app: everything the guide is
// lives in app/ (index.html, style.css, app.js, store.js and the two JSON
// data files), and the screenshots of it live in screenshots/. This file's
// only job is to assemble the hand-in: copy those two folders into the
// output directory the grader gives us, then write dossier.json with the
// vendored make.fun library, which is the summary the judge reads.
//
// It runs on Node 22 with the standard library only — no installs, no
// network — and it writes exactly the same bytes every time it runs, so
// the grader's two runs of it agree.
//
// Usage outside the grader (MAKEFUN_OUTPUT_DIR stands in for /output):
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

// The folder this file sits in, and the output folder to fill.
const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Fresh output: the guide first, then its screenshots.
mkdirSync(outputDir, { recursive: true });
cpSync(join(repoRoot, 'app'), join(outputDir, 'app'), { recursive: true });
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
if (existsSync(join(repoRoot, 'screenshots'))) {
  cpSync(join(repoRoot, 'screenshots'), join(outputDir, 'screenshots'), { recursive: true });
}

// The dossier is built from the copied files, with the gate's own caps:
// at most 4 screenshots of 256 KiB, at most 993 files and 48 MiB in app/,
// and the dossier text capped at 163,840 bytes.
const dossierText = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
});
writeFileSync(join(outputDir, 'dossier.json'), dossierText);
