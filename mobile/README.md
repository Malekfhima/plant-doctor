# PlantDoctor Mobile

The Expo Router app is in this directory. It currently contains onboarding,
home, and profile screens; diagnosis, result, and history screens have not yet
been ported from the web app.

## Development

Copy `.env.example` to `.env` and set `EXPO_PUBLIC_API_URL` to the backend URL.
For the Android emulator, `10.0.2.2` reaches services running on the host
machine. Start the API on port `8000`, then run:

```powershell
npm install
npm run android
```

The API client only makes authenticated profile requests when an access-token
provider has been registered. Connect the app's auth session with
`configureAccessTokenProvider`, and call `syncLanguageFromProfile()` after
sign-in. No sign-in screen or Supabase auth session is included in the current
native-only scope. The backend already accepts `fr`, `en`, and `ar` for
`PATCH /api/v1/me`, and the analysis endpoint accepts those languages in its
multipart `language` field.

## i18n checks and tests

```powershell
npm run i18n:check
npm test
npm run typecheck
npm run lint
```

The ESLint configuration rejects non-whitespace text literals in JSX.

To add a language, add its code and native label in `src/i18n/languages.ts`,
add its locale JSON file and register it in `src/i18n/index.ts`, and ensure it
contains every key checked by `npm run i18n:check`. Add the locale to the
`expo-localization` supported-locale lists in `app.json`, provide the required
font and direction metadata, and extend `LanguageCode`-dependent tests.

## Manual Arabic layout check

On an Android device or emulator, open onboarding, select العربية, accept the
restart prompt, then verify onboarding, home, tabs, profile, language options,
text alignment, and screen edges. Switch back to Français and confirm the LTR
layout returns after the restart. Check long translated labels at a larger
system font size. Scan, result, and history flows cannot be tested until those
screens are added to the native app.
