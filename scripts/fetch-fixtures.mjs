/**
 * Downloads the wire fixtures published by the framework repository.
 *
 * The fixtures are deliberately NOT committed here. A copy would drift from the source with
 * nothing to catch it — which is the exact failure the fixtures exist to prevent. Fetching them
 * keeps one authority for the wire format.
 *
 * Pinned to `main` for now; this moves to a release tag once the framework cuts one, so a given
 * version of this package states which wire it was verified against.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = 'jeff377/bee-library';
const REF = process.env.BEE_FIXTURES_REF ?? 'main';
const SOURCE = 'wire-fixtures/bodies';

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'test', 'fixtures');

async function main() {
  const listUrl = `https://api.github.com/repos/${REPO}/contents/${SOURCE}?ref=${REF}`;
  const response = await fetch(listUrl, { headers: { accept: 'application/vnd.github+json' } });
  if (!response.ok) {
    throw new Error(`Listing ${SOURCE}@${REF} failed: ${response.status} ${response.statusText}`);
  }

  const entries = await response.json();
  const files = entries.filter((e) => e.type === 'file' && e.name.endsWith('.json'));
  if (files.length === 0) {
    throw new Error(`No fixtures found at ${SOURCE}@${REF} — has the path moved?`);
  }

  await mkdir(outDir, { recursive: true });
  await Promise.all(
    files.map(async (file) => {
      // Via the contents API rather than `download_url`: that points at the raw CDN, which can
      // serve a stale copy for a while after a push.
      const body = await fetch(`${file.url}`, {
        headers: { accept: 'application/vnd.github.raw', 'cache-control': 'no-cache' },
      });
      if (!body.ok) throw new Error(`Downloading ${file.name} failed: ${body.status}`);
      await writeFile(join(outDir, file.name), await body.text());
    }),
  );

  await writeFile(
    join(outDir, 'SOURCE.json'),
    `${JSON.stringify({ repo: REPO, ref: REF, path: SOURCE, count: files.length }, null, 2)}\n`,
  );
  console.log(`Fetched ${files.length} fixtures from ${REPO}@${REF}`);
}

await main();
