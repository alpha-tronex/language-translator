# Language Translator (mobile app)

Expo / React Native app: speak a phrase, get it translated and spoken back. The backend lives in the [`api`](https://github.com/alpha-tronex/api) repo.

## Where things deploy

| Repo | Trigger | Goes to |
|---|---|---|
| [`api`](https://github.com/alpha-tronex/api) | push to `main` (after checks pass) | **Vercel** |
| [`language-translator`](https://github.com/alpha-tronex/language-translator) | push a `v*` tag, e.g. `v1.2.0` (after checks pass) | **EAS → TestFlight** |
| `tts-service` (planned, weeks 9–10) | push to `main` (after checks pass) | **Hetzner** |

## Releasing

1. **Run it on your Mac first** (see the next section). This is a manual check, about 5 minutes.
2. Bump `version` in `app.json`, e.g. to `1.3.1`, then commit and push.
3. Tag the release: `git tag v1.3.1 && git push origin v1.3.1`.

CI runs the checks, confirms the tag matches the version, then EAS builds the app and submits it to TestFlight.

## Pre-release check in the iOS Simulator

The automated tests can't see layout, the keyboard or the microphone, so click through the app on your Mac before tagging.

```bash
npm install     # only if dependencies changed
npm run ios     # starts Expo and opens the app in the iOS Simulator
```

**Setup notes:**

- **Xcode:** needs Xcode with an iOS Simulator installed. The first run installs Expo Go into the simulator.
- **Backend:** the app talks to the API in `EXPO_PUBLIC_API_URL` from `.env.local`.
- **Request signing:** requests from the simulator are unsigned, which is fine while the API's `APP_AUTH_MODE` is `log`. After switching the API to `enforce`, add `EXPO_PUBLIC_APP_SIGNING_KEY` to `.env.local` (gitignored).
- **Microphone:** the simulator uses your Mac's microphone.
- **Keyboard:** to test it for real, turn off **I/O → Keyboard → Connect Hardware Keyboard** (⇧⌘K), then use ⌘K to show or hide the on-screen keyboard. With the hardware keyboard connected, the on-screen one never appears and keyboard bugs stay hidden.
- **Other sizes:** use **File → Open Simulator** to try a small phone (iPhone SE) and an iPad.

**Checklist:**

- [ ] Pick two languages, record a phrase, translate it, replay it.
- [ ] Choose **Auto-detect**, speak another language, and check the "Detected" label.
- [ ] Switch to **Type**: the text box stays visible above the keyboard; the keyboard closes with **done**, a tap outside, and **Continue**.
- [ ] Translate, tap **Play slowly** and check it is slower, then **Play** and check it is back to normal speed.
- [ ] Tap **Practice saying it**, say it back, and check the score and the green/amber words; tap a word to hear it; try **Try again** (the attempts line appears) and **Done**.
- [ ] Change a language while a result is showing: the "Change language?" prompt appears.
- [ ] Turn Wi-Fi off on the Mac and try a translation: a clear "No internet" message appears, not a crash.

The simulator doesn't replace a quick look at the TestFlight build on a real phone: real microphones, real network conditions and the release build can still differ.

## Development

```bash
npm install
npm start                 # Expo dev server
npm run lint && npm run typecheck && npm test && npm run audit:testability
```

Testing conventions: [docs/TESTING.md](docs/TESTING.md).
