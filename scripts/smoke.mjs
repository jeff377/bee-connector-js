/**
 * Smoke test against a running backend.
 *
 * Not part of `npm test` — it needs a server, and the unit tests are deliberately offline. Run it
 * after starting the framework's quick-start host:
 *
 *   cd <bee-library>/samples/QuickStart.Server && dotnet run
 *   npm run smoke
 *
 * `System.Ping` is used because it is anonymous and its request type is a framework type, so it
 * passes the server's type allow-list without any deployment configuration.
 */
import { JsonRpcTransport, PayloadFormat } from '../dist/index.js';

const ENDPOINT = process.env.BEE_ENDPOINT ?? 'http://localhost:5050/api';
const API_KEY = process.env.BEE_API_KEY ?? 'quickstart-demo';
const PING_TYPE = 'Bee.Api.Core.Messages.System.PingRequest, Bee.Api.Core';

const client = new JsonRpcTransport({ endpoint: ENDPOINT, apiKey: API_KEY });

function check(label, result) {
  if (result?.status !== 'ok') {
    throw new Error(`${label}: expected status "ok", got ${JSON.stringify(result)}`);
  }
  console.log(`✓ ${label} — server ${result.version}, traceId ${result.traceId}`);
}

check(
  'Plain',
  await client.execute('System.Ping', { clientName: 'bee-connector', traceId: 'smoke-plain' }),
);

// The one that matters: the body is JSON produced here, gzipped, and decoded by the server's
// `json` codec — then answered in the same codec.
check(
  'Encoded + codec:json',
  await client.execute(
    'System.Ping',
    { clientName: 'bee-connector', traceId: 'smoke-encoded' },
    { format: PayloadFormat.Encoded, typeName: PING_TYPE },
  ),
);

console.log('\nAll smoke checks passed.');
