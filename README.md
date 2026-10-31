# Nomrank mobile

Android app for [Nomrank](https://beta.nomrank.in): rate the dish, not the place. Version 0.1.0 is the first test build, with the whole consumer app: landing screens, sign-in, the feed, rankings, rating, battles, profiles, activity and settings.

## Run it on your phone

1. `npm install`
2. Copy `.env.example` to `.env.local` and fill in the Supabase URL and publishable key (same values as the web app).
3. `npx expo start`, then scan the QR code with **Expo Go** (Play Store) on an Android phone on the same Wi-Fi.

## Install a test APK

Every push to `main` builds an APK with GitHub Actions. Open **Releases** on this repo on your phone, signed in to GitHub, and install the newest one. Each build installs over the last.

## Checks

```
npx tsc --noEmit
npx expo-doctor
```
