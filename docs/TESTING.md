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

**Releasing to TestFlight:** bump `version` in `app.json`, commit and push, then push a matching tag: `git tag v1.1.0 && git push origin v1.1.0`.

- **What runs:** the checks, then the `release` job, which runs `eas build --platform ios --profile production --auto-submit`.
- **Version guard:** a tag that doesn't match `app.json` fails before anything is built.
- **Setup it needs:**
  - the GitHub secret `EXPO_TOKEN`;
  - an App Store Connect API key stored in EAS (`eas credentials -p ios`), so the submit can run without you.

## Layout and seams

This app uses Expo Router, so the layout differs from Quiz Master's `src/features/...`:

| Layer | Path | Its test mocks | Test location |
|---|---|---|---|
| HTTP client (the only `fetch()` caller) | `lib/httpClient.ts` | `global.fetch` | `lib/__tests__/` |
| API functions | `lib/api.ts` | `jest.mock('../httpClient')` | `lib/__tests__/` |
| Pure logic / config | `lib/errors.ts`, `lib/config.ts`, `lib/languages.ts` | nothing | `lib/__tests__/` |
| Native wrappers | `lib/recorder.ts` | `__mocks__/expo-av.ts` (automatic) | `lib/__tests__/` |
| State machine (pure) | `lib/translatorMachine.ts` | nothing | `lib/__tests__/` |
| Screen hooks | `lib/useTranslator.ts`, `lib/useConsent.ts` | `jest.mock('../api')`, `'../recorder'`, `'../audioPlayback'`; clock and sleep injected | `lib/__tests__/` |
| Audio player | `lib/audioPlayback.ts` | `__mocks__/expo-av.ts`, `__mocks__/expo-file-system/legacy.ts` | `lib/__tests__/` |
| Shared components | `components/*.tsx` | nothing (props only) | `components/__tests__/` |
| Screens | `app/*.tsx` (layout only) | `jest.mock('../../lib/useTranslator')` and `useConsent` | **`__tests__/app/`** at the repo root |

Screen tests live outside `app/` because Expo Router treats every file in `app/` as a route.

Errors from the backend are always `ApiClientError` (`lib/apiError.ts`). `status` is the HTTP status, or `0` when the request never reached the server. `lib/errors.ts` turns them into user-facing messages.

## Mocks

- `__mocks__/expo-av.ts`: in-memory `Audio` (permissions, recording, sound). Test helpers are `__reset()`, `__setState({...})` and `__getState()`. Call `__reset()` in `beforeEach`.
- `jest.setup.ts`: AsyncStorage uses its official in-memory mock.
- `__mocks__/expo-file-system/legacy.ts`: an in-memory file store. Test helpers are `__reset()` and `__files()`.
- `__mocks__/expo-crypto.ts`: `randomUUID()` returns predictable UUIDs (`…-000000000001`, `…-000000000002`, …). Call `__reset()` in `beforeEach`.
- `lib/deviceId.ts` caches the ID in memory. Call `__resetDeviceIdCache()` in `beforeEach`, and mock `../deviceId` in `httpClient` tests.
- `__mocks__/expo-crypto.ts` also implements `digest()` with Node's crypto, so `lib/hmac.ts` is checked against RFC 4231 and against `createHmac`, which is what the API verifies with.
- No msw. Mock `global.fetch` only in `httpClient.test.ts`.

## Writing tests

- **RNTL 14 is async:** `await render(...)`, `await user.press(...)`, `await unmount()`. CI fails on un-awaited calls.
- **Interactions:** use `userEvent.setup()`. Use `fireEvent` only for events userEvent doesn't model.
- **Queries:** query the way a user finds things, with `getByRole(..., { name })`, `getByText` or `getByTestId`. No snapshot tests.
- **testIDs:** kebab-case `<screen-or-component>-<element>[-<kind>]`. Existing ones: `record-button`, `language-picker-from`, `language-picker-to`, `language-modal`, `language-option-<code>`, `alert-modal-*`, `consent-agree-button`, `consent-decline-button`, and on the home screen `home-swap-button`, `home-transcript` (text: `home-transcript-text`), `home-detected-lang`, `home-translation` (`home-translation-text`), `home-loading`, `home-translate-button`, `home-play-button`, `home-rerecord-button`, `home-record-hint` and `home-practice-button`; typed input `input-mode-voice`, `input-mode-text`, `typed-input-field`, `typed-input-submit`, `typed-input-error` and `typed-input-count`; practice `practice-panel`, `practice-expected-text`, `practice-heard-text`, `practice-try-again-button` and `practice-done-button`.
- **Accessibility:** every pressable sets `accessibilityRole`, `accessibilityLabel` and `accessibilityHint`, and titles use `accessibilityRole="header"`. Tests assert these.
- **Test names:** describe the behavior and why it matters.
- **Timeouts:** `jest.testTimeout` is 20s repo-wide because the first render test on a cold cache is slow. Don't add per-test timeouts.

## Status

Baseline as of 2026-10-01 (after v2 Week 5): 24 suites, 210 tests, all passing. Lint and typecheck are clean.

**Every audit check is now hard.** The week 4 refactor turned `app/index.tsx` (503 lines) into:

- a pure reducer, `lib/translatorMachine.ts`;
- a side-effect hook, `lib/useTranslator.ts`;
- a 214-line layout-only screen.

That paid off the last advisory debt: screens calling the API directly, `Date.now()` in the screen, and untested files. When adding a new check the codebase isn't clean on yet, add it as advisory first, then promote it.

**Still to do:** end-to-end (Maestro) flows. The first one should be: pick languages → record → review → translate → replay.
