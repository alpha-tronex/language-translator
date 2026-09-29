import * as Crypto from 'expo-crypto';

/**
 * HMAC-SHA256 (RFC 2104) on top of expo-crypto's native SHA-256, which is
 * all Expo exposes. Output matches Node's createHmac('sha256', key), which
 * the API uses to verify (see api/lib/appAuth.ts).
 */
const BLOCK_SIZE = 64;

type Bytes = Uint8Array<ArrayBuffer>;

async function sha256(data: Bytes): Promise<Bytes> {
  return new Uint8Array(await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, data));
}

function concat(a: Bytes, b: Bytes): Bytes {
  const out = new Uint8Array(a.length + b.length);
  out.set(a);
  out.set(b, a.length);
  return out;
}

function toHex(bytes: Uint8Array): string {
  let hex = '';
  for (const b of bytes) hex += b.toString(16).padStart(2, '0');
  return hex;
}

export async function hmacSha256Hex(key: string, message: string): Promise<string> {
  const encoder = new TextEncoder();
  let keyBytes: Bytes = encoder.encode(key);
  if (keyBytes.length > BLOCK_SIZE) keyBytes = await sha256(keyBytes);

  const block = new Uint8Array(BLOCK_SIZE);
  block.set(keyBytes);
  const innerPad = block.map((b) => b ^ 0x36);
  const outerPad = block.map((b) => b ^ 0x5c);

  const inner = await sha256(concat(innerPad, encoder.encode(message)));
  return toHex(await sha256(concat(outerPad, inner)));
}
