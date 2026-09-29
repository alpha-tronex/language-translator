import { hmacSha256Hex } from './hmac';

/**
 * Signs API requests so the backend can tell our app from a script calling
 * the URL (see api/lib/appAuth.ts). The payload format must match the
 * server's signingPayload() exactly.
 */
export function signingPayload(timestamp: string, method: string, path: string, deviceId: string): string {
  return `${timestamp}\n${method.toUpperCase()}\n${path}\n${deviceId}`;
}

export async function signRequest(params: {
  key: string;
  method: string;
  path: string;
  deviceId: string;
  nowMs?: number;
}): Promise<{ 'X-App-Timestamp': string; 'X-App-Signature': string }> {
  const timestamp = String(Math.floor((params.nowMs ?? Date.now()) / 1000));
  const signature = await hmacSha256Hex(
    params.key,
    signingPayload(timestamp, params.method, params.path, params.deviceId)
  );
  return { 'X-App-Timestamp': timestamp, 'X-App-Signature': signature };
}
