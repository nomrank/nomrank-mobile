@AGENTS.md

# Nomrank mobile

The Android (and later iOS) app for Nomrank, an Indian food app where people rate individual dishes, argue about them and find what's worth eating. The web app lives in a separate repo (`nomrank/nomrank-web`); both talk to the same Supabase project.

- **Stack:** Expo SDK 58, React Native, Expo Router, TypeScript. Plain `StyleSheet` with the colour tokens in `src/theme.tsx` (dark and light, same values as the web app's `globals.css`).
- **Backend:** `supabase-js` straight from the app with the publishable key only (`.env.local`, git-ignored). Security is Row Level Security and database functions, never client checks. The service-role key never goes in this repo.
- **Web code reused by copy:** `src/core` is generated from the web repo's `apps/web/lib` by `node scripts/sync-core.js ../Bitecast`. Don't edit it here; change the web file and re-sync. `src/brand/logo.ts` is a copy too. `src/lib/actions.ts` is the phone's version of the web's server actions, with the same checks.
- **Routes** mirror the web's paths (`/r/[slug]/[dish]`, `/review/[id]`, `/u/[handle]`, `/top/[slug]`), so `dishHref` and notification links work unchanged. Legal and About pages open on the website, so their wording lives in one place.
- **Check on web:** `npx expo start --web` runs the app in a browser. It's for looking at screens only; Android is the target.
- **Brand and product rules:** playful, Gen-Z tone, never region-vs-region framing. Leaderboard rank uses a Bayesian average. "Tastes like home" shows only with 3 or more ratings from the dish's home region.
- **Versions:** Versions are `0.1.N`, N rising by one with every release (see the Version step in `.github/workflows/android.yml`). Releases stay pre-releases until the owner says otherwise.
- **Commands:** `npx expo start` (open in Expo Go), `npx tsc --noEmit`, `npx expo-doctor`. Every push to `main` builds a test APK in GitHub Actions and publishes it under Releases.
- Plan and task list: see `tasks/android-plan.md` and `tasks/android-todo.md` in the web repo (the numbering there still applies).
