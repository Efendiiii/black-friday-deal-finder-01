// Verdict Friday — a real Black Friday deal finder (Node 22, stdlib only).
//
// The site is app/ : plain static files (index.html, styles.css, deals.js,
// app.js) a browser opens with no build step and no network. The 39 deals
// are the site's own data, each with store link, sale price, usual price,
// source and check date; search and filters run entirely in the browser.
//
// This program hands the entry in: it copies app/ and screenshots/ from
// beside this file to /output and writes /output/dossier.json — the summary
// the scorer reads — with the vendored make.fun library. Leave
// vendor/makefun-frontend.ts as it is: the scorer requires dossier.json to
// be byte for byte what its own copy writes.
//
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   MAKEFUN_OUTPUT_DIR=out node main.ts
//
// The grader runs this program twice with no network; both runs must write
// identical bytes. Nothing here reads the clock, the network or any
// environment other than MAKEFUN_OUTPUT_DIR, so the output is deterministic.

import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Clean the subdirectories this program owns, so a re-run writes exactly
// what is in the repo — never remove /output itself, only its contents.
mkdirSync(out, { recursive: true });
for (const sub of ['app', 'screenshots']) {
  const target = join(out, sub);
  if (existsSync(target)) rmSync(target, { recursive: true, force: true });
}

cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes
// the bytes; the others refuse an entry the scorer would refuse (more than
// 4 screenshots or one over 256 KiB; more than 993 files and directories in
// app/ or 16 MiB of app files).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, { text_max_bytes: 163840, screenshots: { max: 4, max_bytes: 262144 }, app_max_files: 993, app_max_bytes: 16777216 }),
);
