@AGENTS.md

# Nomrank mobile

The Android (and later iOS) app for Nomrank, an Indian food app where people rate individual dishes, argue about them and find what's worth eating. The web app lives in a separate repo (`nomrank/nomrank-web`); both talk to the same Supabase project.

- **Stack:** Expo SDK 58, React Native, Expo Router, TypeScript. Plain `StyleSheet` with the colour tokens in `src/theme.tsx` (dark and light, same values as the web app's `globals.css`).
- **Backend:** `supabase-js` straight from the app with the publishable key only (`.env.local`, git-ignored). Security is Row Level Security and database functions, never client checks. The service-role key never goes in this repo.
- **Web code reused by copy:** `src/brand/logo.ts` comes from the web repo's `apps/web/lib/logo.ts`. Rules (ranking order, validation, diet, cities) are copied from the web repo when a screen needs them. Keep them in sync; move them to a shared package once there are several.
- **Brand and product rules:** playful, Gen-Z tone, never region-vs-region framing. Leaderboard rank uses a Bayesian average. "Tastes like home" shows only with 3 or more ratings from the dish's home region.
- **Versions:** `0.1.0` first test build. `versionCode` in `app.json` goes up by one for every build that gets installed over another.
- **Commands:** `npx expo start` (open in Expo Go), `npx tsc --noEmit`, `npx expo-doctor`, `eas build -p android --profile preview` (APK for testing on phones).
- Plan and task list: see `tasks/android-plan.md` and `tasks/android-todo.md` in the web repo (the numbering there still applies).
