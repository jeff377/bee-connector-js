# bee-connector

JavaScript/TypeScript connector for the [Bee.NET](https://github.com/jeff377/bee-library) JSON-RPC
API, including the **encrypted** payload pipeline.

## Status

**Early — the payload pipeline is landing first.** The cryptographic layer is implemented and
verified against payloads produced by the .NET server; the connector API on top of it is not built
yet.

| Layer | State |
|-------|-------|
| AES-CBC-HMAC, gzip, byte helpers | ✅ implemented, cross-verified against .NET output |
| RSA handshake | ✅ implemented, cross-verified in both directions |
| JSON body codec (wire value envelopes) | ⬜ next |
| JSON-RPC transport and connectors | ⬜ |

## Why this exists

The framework's default body codec is MessagePack, assembled from hand-written per-type formatters.
Mirroring those in another language would create a second authority for the same contract with
nothing to catch the two drifting apart. The server therefore accepts a **JSON body codec**, which a
browser client can produce with nothing but platform APIs — and this package is that client.

Everything cryptographic here is Web Crypto: AES-256-CBC, HMAC-SHA256, RSA-OAEP with SHA-256, plus
the platform's own gzip streams. No cryptographic algorithm is reimplemented.

> If your deployment is happy treating HTTPS as the trust boundary, you may not need this package at
> all — the server also accepts plain JSON over HTTPS, which needs no client library. See ADR-014 in
> the framework repository.

## Requirements

Any runtime with Web Crypto and `CompressionStream`: current browsers, or Node 18+.

## Install

```sh
npm install bee-connector
```

## Development

```sh
npm install
npm test          # vitest
npm run typecheck # tsc --noEmit
npm run build     # tsup (JS) + tsc (declarations)
```

### Testing against a real backend

This repository contains no server. To exercise the connector end to end, start the framework's
quick-start host from the [bee-library](https://github.com/jeff377/bee-library) repository:

```sh
cd samples/QuickStart.Server
dotnet run
```

Note that the unit tests do **not** need it: wire compatibility is verified against fixed vectors
produced by the .NET implementation, so `npm test` runs offline.

## License

MIT
