# Nomrank mobile

Android app for [Nomrank](https://beta.nomrank.in): rate the dish, not the place. Version 0.1.0 is the first test build: sign in or create an account, light and dark theme, and the ranked dishes of every food list.

## Run it on your phone

1. `npm install`
2. Copy `.env.example` to `.env.local` and fill in the Supabase URL and publishable key (same values as the web app).
3. `npx expo start`, then scan the QR code with **Expo Go** (Play Store) on an Android phone on the same Wi-Fi.

## Install a test APK

```
npm install -g eas-cli
eas login
eas env:create --environment preview --name EXPO_PUBLIC_SUPABASE_URL --value "<url>" --visibility plaintext
eas env:create --environment preview --name EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY --value "<publishable key>" --visibility plaintext
eas build -p android --profile preview
```

EAS prints a link to the finished `.apk`; open it on the phone and install it. In `eas.json` the preview profile builds an APK, not a Play bundle.

## Checks

```
npx tsc --noEmit
npx expo-doctor
```
