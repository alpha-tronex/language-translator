# Testing

Follows the same testability rules as Quiz Master (the `rn-testability` rules R1–R11 and T1–T10). The goal: every screen's *logic*, not just its rendering, is exercised by a test that runs without a simulator. There's no coverage-percentage target: each unit gets a test, and the tests sit next to the code they test.

## Running the checks

```bash
npm run lint
npm run typecheck
npm test                    # jest; pass a path to scope it
npm run audit:testability   # scripts/testability-audit.sh
```

CI (`.github/workflows/ci.yml`) runs the same four steps on every pull request and every push to `main`. It uses Ubuntu and Node 22, runs `npm ci`, and caches the Jest transform cache in `.jest-cache`. Every step runs even if an earlier one fails.

## Layout and seams

This app uses Expo Router, so the layout differs from Quiz Master's `src/features/...`:

| Layer | Path | Its test mocks | Test location |
|---|---|---|---|
| HTTP client (the only `fetch()` caller) | `lib/httpClient.ts` | `global.fetch` | `lib/__tests__/` |
| API functions | `lib/api.ts` | `jest.mock('../httpClient')` | `lib/__tests__/` |
| Pure logic / config | `lib/errors.ts`, `lib/config.ts`, `lib/languages.ts` | nothing | `lib/__tests__/` |
| Native wrappers | `lib/recorder.ts` | `__mocks__/expo-av.ts` (automatic) | `lib/__tests__/` |
| Shared components | `components/*.tsx` | nothing (props only) | `components/__tests__/` |
| Screens | `app/*.tsx` | the screen's hook | **`__tests__/app/`** at the repo root |

Screen tests live outside `app/` because Expo Router treats every file in `app/` as a route.

Errors from the backend are always `ApiClientError` (`lib/apiError.ts`). `status` is the HTTP status, or `0` when the request never reached the server. `lib/errors.ts` turns them into user-facing messages.

## Mocks

- `__mocks__/expo-av.ts`: in-memory `Audio` (permissions, recording, sound). Test helpers are `__reset()`, `__setState({...})` and `__getState()`. Call `__reset()` in `beforeEach`.
- `jest.setup.ts`: AsyncStorage uses its official in-memory mock.
- No msw. Mock `global.fetch` only in `httpClient.test.ts`.

## Writing tests

- **RNTL 14 is async:** `await render(...)`, `await user.press(...)`, `await unmount()`. CI fails on un-awaited calls.
- **Interactions:** use `userEvent.setup()`. Use `fireEvent` only for events userEvent doesn't model.
- **Queries:** query the way a user finds things, with `getByRole(..., { name })`, `getByText` or `getByTestId`. No snapshot tests.
- **testIDs:** kebab-case `<screen-or-component>-<element>[-<kind>]`. Existing ones: `record-button`, `language-picker-from`, `language-picker-to`, `language-modal`, `language-option-<code>`, `alert-modal-*`, `consent-agree-button`, `consent-decline-button`.
- **Accessibility:** every pressable sets `accessibilityRole`, `accessibilityLabel` and `accessibilityHint`, and titles use `accessibilityRole="header"`. Tests assert these.
- **Test names:** describe the behavior and why it matters.
- **Timeouts:** `jest.testTimeout` is 20s repo-wide because the first render test on a cold cache is slow. Don't add per-test timeouts.

## Known debt (the audit lists this as advisory)

Baseline as of 2026-09-27: 13 suites, 58 tests, all passing. Lint has 0 errors, typecheck is clean, and the audit's hard checks all report "none".

- `app/index.tsx` (503 lines) has no test. It calls `lib/api` directly, holds the whole state machine inline, and reads `Date.now()` for recording length. The v2 Week 4 refactor fixes this. The steps:
  1. Move state transitions into a pure reducer (`lib/translatorMachine.ts`).
  2. Move the API calls behind hooks, so the screen only uses hooks.
  3. Pass the clock in, so recording length can be tested with fake timers.
  4. Add testIDs for the loading, error and review/playback states.
  5. Add `__tests__/app/index.test.tsx`.

  Once that's done, promote the advisory R2 check to hard in `scripts/testability-audit.sh`.
- `app/_layout.tsx` has no test.
- There are no end-to-end (Maestro) flows yet. The first one should be: pick languages → record → review → translate → replay.
