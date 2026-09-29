/**
 * Manual mock for expo-crypto (testability rule R6).
 * - randomUUID() returns predictable, valid-looking v4 UUIDs.
 * - digest() is backed by Node's crypto, so HMAC code built on it can be
 *   checked against real test vectors and against the server's signing.
 *
 * Test-only helper: __reset() restarts the UUID sequence.
 */
import { createHash } from 'crypto';

let counter = 0;

export enum CryptoDigestAlgorithm {
  SHA1 = 'SHA-1',
  SHA256 = 'SHA-256',
  SHA384 = 'SHA-384',
  SHA512 = 'SHA-512',
}

const NODE_ALGORITHMS: Record<string, string> = {
  'SHA-1': 'sha1',
  'SHA-256': 'sha256',
  'SHA-384': 'sha384',
  'SHA-512': 'sha512',
};

export const randomUUID = jest.fn(() => {
  counter += 1;
  return `00000000-0000-4000-8000-${String(counter).padStart(12, '0')}`;
});

export const digest = jest.fn(async (algorithm: CryptoDigestAlgorithm, data: Uint8Array): Promise<ArrayBuffer> => {
  const out = createHash(NODE_ALGORITHMS[algorithm]).update(Buffer.from(data)).digest();
  return out.buffer.slice(out.byteOffset, out.byteOffset + out.byteLength);
});

export function __reset(): void {
  counter = 0;
}
