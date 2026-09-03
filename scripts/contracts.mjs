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
const SOURCE = 'wire-contracts/messages.d.ts';

const target = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'contracts', 'messages.ts');

const HEADER = `// Synced from ${REPO}/${SOURCE} — do not edit by hand.
// Update with \`npm run contracts:update\`; CI fails if this file drifts from the source.

`;

async function fetchContract() {
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
  return HEADER + (await response.text());
}

const expected = await fetchContract();

if (process.argv.includes('--check')) {
  const actual = await readFile(target, 'utf8').catch(() => null);
  if (actual !== expected) {
    console.error(
      `The committed contract differs from ${REPO}@${REF}.\n` +
        'The API contract moved. Run `npm run contracts:update`, read the diff — a renamed or ' +
        'removed property is a breaking change for this package — then commit it.',
    );
    process.exit(1);
  }
  console.log(`Contract matches ${REPO}@${REF}.`);
} else {
  await writeFile(target, expected);
  console.log(`Updated ${target} from ${REPO}@${REF}.`);
}
