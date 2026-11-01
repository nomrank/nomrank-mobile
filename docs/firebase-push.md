# Instant push notifications (Firebase)

Today the app checks for new activity about every 15 minutes in the background. Firebase Cloud Messaging (FCM) makes it instant.
Three pieces: the phone gets a token, the database stores it, and a small server function sends the push when a notification row is created.

## 1. Firebase project (you, ~5 minutes)
1. console.firebase.google.com → Add project → "Nomrank" (turn Analytics off).
2. Project overview → Add app → Android. Package name: `in.nomrank.app`. Skip the SHA-1 for now.
3. Download `google-services.json`. Send it over, or add it to the mobile repo yourself at the repo root (it has no secrets, but keep the repo private).
4. Project settings → Service accounts → Generate new private key. This JSON is secret: it goes into a Supabase secret in step 3, never into git.

## 2. App (me, once the file exists)
- `app.json`: `android.googleServicesFile: "./google-services.json"`.
- CI: the file is committed, so the build needs nothing extra.
- On sign-in, call `Notifications.getDevicePushTokenAsync()` and save the token to a `push_tokens` table (user id, token, updated at; RLS: you can write only your own rows).
- Tapping a push opens its screen (`data.href`, already handled by `activity.tsx`).

## 3. Server (me, needs your OK because it changes the shared database)
- A migration adds `push_tokens`.
- A Supabase Edge Function `send-push` signs in to Google with the service account (stored as a Supabase secret `FIREBASE_SERVICE_ACCOUNT`) and calls the FCM HTTP v1 API.
- A database webhook on `notifications` insert calls the function with the new row. It looks up the person's tokens and sends "who did what".
- Dead tokens (FCM says `UNREGISTERED`) are deleted.

Note: the dev and beta apps share one Supabase project, so test pushes reach any signed-in test phone. Use test accounts.
