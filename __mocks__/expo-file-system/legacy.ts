/**
 * Manual mock for expo-file-system/legacy (testability rule R6): an
 * in-memory file store. Test-only helpers: __reset(), __files().
 */
const files = new Map<string, { contents: string; encoding?: string }>();

export const cacheDirectory = 'file:///cache/';

export const EncodingType = { UTF8: 'utf8', Base64: 'base64' } as const;

export const writeAsStringAsync = jest.fn(
  async (uri: string, contents: string, options?: { encoding?: string }) => {
    files.set(uri, { contents, encoding: options?.encoding });
  }
);

export const deleteAsync = jest.fn(async (uri: string, options?: { idempotent?: boolean }) => {
  if (!files.has(uri) && !options?.idempotent) throw new Error(`File not found: ${uri}`);
  files.delete(uri);
});

export function __reset(): void {
  files.clear();
}

export function __files(): ReadonlyMap<string, { contents: string; encoding?: string }> {
  return files;
}
