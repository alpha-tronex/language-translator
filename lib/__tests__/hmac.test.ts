import { createHmac } from 'crypto';
import { hmacSha256Hex } from '../hmac';

describe('hmacSha256Hex', () => {
  test('matches RFC 4231 test case 2', async () => {
    await expect(hmacSha256Hex('Jefe', 'what do ya want for nothing?')).resolves.toBe(
      '5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843'
    );
  });

  test('matches Node createHmac (what the API verifies with) for keys longer than one block', async () => {
    const key = 'k'.repeat(100);
    const message = '1800000000\nPOST\n/api/translate\ndevice-1';

    await expect(hmacSha256Hex(key, message)).resolves.toBe(
      createHmac('sha256', key).update(message).digest('hex')
    );
  });

  test('matches Node for non-ASCII input (UTF-8 encoded on both sides)', async () => {
    const key = 'clé-secrète';
    const message = 'Où est la gare ? 駅はどこですか';

    await expect(hmacSha256Hex(key, message)).resolves.toBe(
      createHmac('sha256', key).update(message).digest('hex')
    );
  });

  test('handles an empty message', async () => {
    await expect(hmacSha256Hex('key', '')).resolves.toBe(createHmac('sha256', 'key').update('').digest('hex'));
  });
});
