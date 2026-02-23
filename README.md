# EchoSign Frontend

EchoSign Frontend is a React Native + Expo mobile app for sign-language-assisted communication.  
The app captures/accepts media, sends data to backend translation APIs, and presents translated outputs with a modern mobile-first UI.

## Highlights

- Expo-based cross-platform app (Android, iOS, Web preview)
- Sign language translation flow integrated with backend APIs
- Animated UI components for interaction and feedback
- Config-driven environment setup (`config/env.js`)
- EAS-ready project setup for production builds

## Tech Stack

- React Native `0.81.5`
- Expo SDK `54`
- React `19`
- React Navigation `7`
- Expo modules (`expo-av`, `expo-image-picker`, `expo-file-system`, `expo-updates`, etc.)

## Project Structure

```text
.
|- App.js
|- index.js
|- app.json
|- eas.json
|- config/
|  |- env.js
|- components/
|- screens/
|- themes/
|- assets/
```

## Prerequisites

- Node.js 18+ (LTS recommended)
- npm 9+
- Expo CLI (optional global install)
- Android Studio / Xcode only if building native binaries locally

## Setup

```bash
npm install
```

## Run the App

```bash
npm run start
```

Then choose:
- `a` for Android emulator/device
- `i` for iOS simulator (macOS)
- `w` for web

## Environment Configuration

Backend URLs are controlled in `config/env.js`.

Default:

```js
EXPO_PUBLIC_BACKEND_URL=https://bannu021-echosign.hf.space
```

You can override at runtime:

```bash
EXPO_PUBLIC_BACKEND_URL=https://your-backend-url npm run start
```

## Build and Release

EAS configuration is already included in `eas.json`.

Typical commands:

```bash
npx eas build --platform android --profile preview
npx eas build --platform android --profile production
```

## Security Notes

- Do not commit signing credentials, keystores, or private keys.
- Sensitive files are excluded via `.gitignore`.
- Use environment variables for secret or environment-specific values.

## Scripts

- `npm run start` -> start Expo dev server
- `npm run android` -> run on Android
- `npm run ios` -> run on iOS
- `npm run web` -> run web preview

## Current Version

- App Name: `EchoSign`
- Runtime/App Version: `ES26`

## License

This project is currently unlicensed. Add a LICENSE file if open-source distribution is intended.
