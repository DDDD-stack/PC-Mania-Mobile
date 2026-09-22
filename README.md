# PCMania Admin (Android)

React Native (Expo SDK 57) app for running the PCMania shop from a phone: new / in-progress / finished orders,
customer call and WhatsApp buttons, order status changes, inventory quantity/price/status edits, and new-order
notifications.

It talks to the PCMania Spring Boot server through the token API at `/api/v1` (see the server's README).

## Installing the APK

1. Copy `PCMania-Admin.apk` to the phone and open it. Android asks to allow installs from that source once.
2. Open **PCMania Admin** and sign in:
   - **Serveri** – the site's address, e.g. `pcmania.al` (https is assumed), or for testing on your Wi‑Fi the PC's
     local IP with port, e.g. `192.168.1.10:8080`.
   - **Përdoruesi / Fjalëkalimi** – the same admin account as `/admin` on the website.
3. Allow notifications when asked.

"Provo me të dhëna demo" opens the app with sample data and no server.

## New-order alerts

- While the app is open it checks every 30 seconds (toast, vibration, tab badge).
- While closed, Android runs a background check roughly every 35 minutes (15 min is the OS minimum; 35 keeps a sleeping server from being woken constantly, and battery saver can delay it further)
  and shows a notification.
- Instant push notifications would need Firebase Cloud Messaging (a Google account/project) — not set up in v1.

## Development

```bash
npm install
npx expo start            # scan the QR code with Expo Go, or press "w" for the web preview
npm run typecheck
npm run export:web        # static web build in dist-web (open with ?demo)
```

## Building the APK yourself

Requires JDK 17 and the Android SDK (`ANDROID_HOME`).

```bash
npx expo prebuild --platform android --clean
cd android
./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a
# → android/app/build/outputs/apk/release/app-release.apk
```

The release build is signed with the default debug keystore, which is fine for installing directly on your own
phones. To publish on Google Play, create an upload keystore and configure release signing first.

## Security notes

- The token is stored in the Android Keystore (expo-secure-store) and expires after 60 days without use. "Dil" revokes it
  on the server.
- The app allows plain `http://` so it can reach a PC on the local network during testing. Use `https://` for the live
  server — the token travels in every request.
