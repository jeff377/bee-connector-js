/**
 * bee-connector — JavaScript/TypeScript connector for the Bee.NET JSON-RPC API.
 *
 * The payload pipeline is serialize → compress → encrypt, and reverses on the way back. Everything
 * below is built on the platform's own Web Crypto and compression streams; no cryptographic code
 * is reimplemented here.
 */

export { decrypt, encrypt } from './crypto/aes-cbc-hmac.js';
export { gunzip, gzip } from './crypto/gzip.js';
export {
  decryptSessionKey,
  decryptWithPrivateKey,
  generateHandshakeKeyPair,
  importPrivateKeyPem,
} from './crypto/rsa.js';
export type { HandshakeKeyPair } from './crypto/rsa.js';
export { concat, fromBase64, fromUtf8, toBase64, utf8 } from './crypto/bytes.js';
export type { Bytes } from './crypto/bytes.js';
