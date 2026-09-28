// Global Jest setup (see docs/TESTING.md).
// AsyncStorage ships an official in-memory mock; use it everywhere so any
// module that touches storage can be tested without a device.
jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- jest.mock factories must be synchronous
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
