# Language Translator (mobile app)

Expo / React Native app: speak a phrase, get it translated and spoken back. The backend lives in the [`api`](https://github.com/alpha-tronex/api) repo.

## Where things deploy

| Repo | Trigger | Goes to |
|---|---|---|
| [`api`](https://github.com/alpha-tronex/api) | push to `main` (after checks pass) | **Vercel** |
| [`language-translator`](https://github.com/alpha-tronex/language-translator) | push a `v*` tag, e.g. `v1.2.0` (after checks pass) | **EAS → TestFlight** |
| `tts-service` (planned, weeks 9–10) | push to `main` (after checks pass) | **Hetzner** |

## Releasing

1. Bump `version` in `app.json`, e.g. to `1.2.0`, then commit and push.
2. Tag the release: `git tag v1.2.0 && git push origin v1.2.0`.

CI runs the checks, confirms the tag matches the version, then EAS builds the app and submits it to TestFlight.

## Development

```bash
npm install
npm start                 # Expo dev server
npm run lint && npm run typecheck && npm test && npm run audit:testability
```

Testing conventions: [docs/TESTING.md](docs/TESTING.md).
