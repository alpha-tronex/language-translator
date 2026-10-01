/**
 * Manual mock for expo-av, used automatically by Jest for any test that
 * imports it (testability rule R6). Backs the Audio API with in-memory state
 * so lib/recorder.ts can be tested without a device.
 *
 * Test-only helpers: __reset(), __setState({...}), __getState().
 */
type MockState = {
  permissionGranted: boolean;
  recordingUri: string | null;
  createRecordingError: Error | null;
  audioMode: Record<string, unknown>;
  soundsCreated: string[];
};

const initialState = (): MockState => ({
  permissionGranted: true,
  recordingUri: 'file:///cache/recording.m4a',
  createRecordingError: null,
  audioMode: {},
  soundsCreated: [],
});

let state = initialState();

class MockRecording {
  stopAndUnloadAsync = jest.fn(async () => ({ isRecording: false }));
  getURI = jest.fn(() => state.recordingUri);
}

class MockSound {
  playAsync = jest.fn(async () => ({}));
  replayAsync = jest.fn(async () => ({}));
  stopAsync = jest.fn(async () => ({}));
  unloadAsync = jest.fn(async () => ({}));
}

export const Audio = {
  requestPermissionsAsync: jest.fn(async () => ({ granted: state.permissionGranted, status: state.permissionGranted ? 'granted' : 'denied' })),
  getPermissionsAsync: jest.fn(async () => ({ granted: state.permissionGranted, status: state.permissionGranted ? 'granted' : 'denied' })),
  setAudioModeAsync: jest.fn(async (mode: Record<string, unknown>) => {
    state.audioMode = { ...state.audioMode, ...mode };
  }),
  RecordingOptionsPresets: { HIGH_QUALITY: { preset: 'HIGH_QUALITY' }, LOW_QUALITY: { preset: 'LOW_QUALITY' } },
  Recording: {
    createAsync: jest.fn(async () => {
      if (state.createRecordingError) throw state.createRecordingError;
      return { recording: new MockRecording(), status: {} };
    }),
  },
  Sound: {
    createAsync: jest.fn(async (source: { uri: string }) => {
      state.soundsCreated.push(source.uri);
      return { sound: new MockSound(), status: {} };
    }),
  },
};

export function __reset(): void {
  state = initialState();
}

export function __setState(partial: Partial<MockState>): void {
  state = { ...state, ...partial };
}

export function __getState(): Readonly<MockState> {
  return state;
}
