/**
 * Manual mock for expo-crypto (testability rule R6). randomUUID() returns
 * predictable, valid-looking v4 UUIDs so tests can assert on them.
 *
 * Test-only helper: __reset() restarts the sequence.
 */
let counter = 0;

export const randomUUID = jest.fn(() => {
  counter += 1;
  return `00000000-0000-4000-8000-${String(counter).padStart(12, '0')}`;
});

export function __reset(): void {
  counter = 0;
}
