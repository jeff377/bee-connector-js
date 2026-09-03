/**
 * Syncs the generated API contract from the framework repository.
 *
 * Unlike the wire fixtures, the contract **is** committed here: it is an input to the build, not
 * just to the tests, and a package that cannot compile offline is a worse trade than a checked-in
 * derivative. What keeps it honest is `--check`, which CI runs on every build — a drifted contract
 * fails there rather than silently describing an API the server no longer has.
 *
 *   node scripts/contracts.mjs           # update the committed copy
 *   node scripts/contracts.mjs --check   # fail if it differs from the source
 */
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = 'jeff377/bee-library';
const REF = process.env.BEE_CONTRACTS_REF ?? 'main';

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'contracts');

/** Source path in the framework repository → local file. */
const FILES = [
  { source: 'wire-contracts/messages.d.ts', target: join(outDir, 'messages.ts') },
  { source: 'wire-contracts/type-names.ts', target: join(outDir, 'type-names.ts') },
];

const header = (source) => `// Synced from ${REPO}/${source} — do not edit by hand.
// Update with \`npm run contracts:update\`; CI fails if this file drifts from the source.

`;

async function fetchContract(SOURCE) {
  // WARNING: not raw.githubusercontent.com. That is served through a CDN which can hand back a
  // stale copy for a while after a push — long enough for `--check` to compare against the
  // previous contract and report a match that is not true. The contents API returns the blob for
  // the ref directly.
  const url = `https://api.github.com/repos/${REPO}/contents/${SOURCE}?ref=${REF}`;
  const response = await fetch(url, {
    headers: { accept: 'application/vnd.github.raw', 'cache-control': 'no-cache' },
  });
  if (!response.ok) {
    throw new Error(`Fetching ${SOURCE}@${REF} failed: ${response.status} ${response.statusText}`);
  }
  return header(SOURCE) + (await response.text());
}

const checking = process.argv.includes('--check');
let drifted = 0;

for (const { source, target } of FILES) {
  const expected = await fetchContract(source);

  if (!checking) {
    await writeFile(target, expected);
    console.log(`Updated ${target} from ${REPO}@${REF}.`);
    continue;
  }

  const actual = await readFile(target, 'utf8').catch(() => null);
  if (actual !== expected) {
    console.error(`${source} differs from ${REPO}@${REF}.`);
    drifted++;
  }
}

if (checking) {
  if (drifted > 0) {
    console.error(
      '\nThe API contract moved. Run `npm run contracts:update`, read the diff — a renamed or ' +
        'removed property, or a moved namespace, is a breaking change for this package — then ' +
        'commit it.',
    );
    process.exit(1);
  }
  console.log(`Contracts match ${REPO}@${REF}.`);
}
