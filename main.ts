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
//
// Failure rule: the inputs are validated BEFORE /output is touched, and a
// stale dossier.json is removed before the new one is built. A run that
// fails therefore never leaves behind a half-written output whose old
// dossier.json describes an app that is no longer there.

import { cpSync, existsSync, mkdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Validate the inputs first, before touching /output at all. buildDossier
// would refuse these same inputs, but only after the old app/ and
// screenshots/ below have already been deleted — too late to keep the
// previous output intact.
const appDir = join(here, 'app');
const shotsDir = join(here, 'screenshots');
let appStat;
try {
  appStat = statSync(appDir);
} catch {
  throw new Error('app/: no such directory: an app is a directory of static files, its index.html at its root');
}
if (!appStat.isDirectory()) throw new Error('app/: not a directory (an app is a directory of static files)');
if (!existsSync(join(appDir, 'index.html'))) {
  throw new Error('app/index.html: no such file: an app is a directory of static files, its index.html at its root');
}
if (!existsSync(shotsDir)) {
  throw new Error('screenshots/: no such directory: an entry hands in screenshots of its running app, the first by name the cover');
}
if (!statSync(shotsDir).isDirectory()) {
  throw new Error('screenshots/: not a directory: an entry hands in screenshots of its running app');
}

// Clean the subdirectories this program owns, so a re-run writes exactly
// what is in the repo — never remove /output itself, only its contents.
mkdirSync(out, { recursive: true });
for (const sub of ['app', 'screenshots']) {
  const target = join(out, sub);
  if (existsSync(target)) rmSync(target, { recursive: true, force: true });
}

// Drop any dossier.json from an earlier run before building the new one,
// so a failure in the copy or in buildDossier below leaves no stale
// dossier behind that claims the previous app.
const dossierPath = join(out, 'dossier.json');
if (existsSync(dossierPath)) rmSync(dossierPath, { force: true });

cpSync(appDir, join(out, 'app'), { recursive: true });
cpSync(shotsDir, join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes
// the bytes; the others refuse an entry the scorer would refuse (more than
// 4 screenshots or one over 256 KiB; more than 993 files and directories in
// app/ or 16 MiB of app files).
writeFileSync(
  dossierPath,
  buildDossier(out, { text_max_bytes: 163840, screenshots: { max: 4, max_bytes: 262144 }, app_max_files: 993, app_max_bytes: 16777216 }),
);
