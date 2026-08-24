# Quran PWA

This project is structured for a complete offline-first Quran app built with Ionic, React, TypeScript, PWA, and Capacitor for Android automotive head units.

## Local audio placement

Place the 114 Badr Al-Turki MP3 files in the following folder:

assets/audio/badr-al-turki/

The application expects them to be named deterministically as:

- 001.mp3
- 002.mp3
- 003.mp3
- ...
- 114.mp3

PUT THE 114 BADR AL-TURKI MP3 FILES HERE

## Ayah timing metadata

The local ayah timings are generated from the Badr Al-Turki protobuf timing dataset:

```bash
npm run timings:prepare
```

This downloads the 114 source files into `data/badr-al-turki/`, generates the bundled `src/data/badrAlTurkiTimings.ts`, and validates ayah counts and timestamp ranges. Runtime playback reads only the generated local file and bundled MP3s; it does not make timing-data network requests.

## Offline-first architecture

- Quran text is bundled locally in the app.
- The PWA service worker caches the app shell for offline use.
- Native Android audio integration is prepared through Capacitor for a Media3/ExoPlayer implementation.
- No remote font, API, audio, or Quran data is required during normal use.

## Development

```bash
npm install
npm run dev
```

## Android builds

```bash
npm run build:apk
```

This existing command builds the debug APK and copies it to `artifacts/quran-latest.apk`.

For release APK and App Bundle outputs, run:

```bash
npm run build:android:release
```

This builds the web app, syncs Capacitor, assembles the release APK and App Bundle,
and copies them to `artifacts/quran-latest.apk` and `artifacts/quran-latest.aab`.

Release signing is opt-in. Set all four values as environment variables or Gradle
properties before running the release command:

- `RELEASE_STORE_FILE`: path to the existing keystore
- `RELEASE_STORE_PASSWORD`: keystore password
- `RELEASE_KEY_ALIAS`: key alias
- `RELEASE_KEY_PASSWORD`: key password

For local Gradle properties, use the user-level Gradle file at
`%USERPROFILE%\\.gradle\\gradle.properties`; do not commit these values. If none
are supplied, Gradle produces unsigned release APK and App Bundle files. Partial
configuration fails the build rather than silently producing an unexpectedly
signed artifact.

## Download the Android app

GitHub Actions builds the APK on manual runs and for version tags matching `v*`. The latest committed APK is available at `artifacts/quran-latest.apk`; users can also download the `quran-latest-apk` workflow artifact or the APK attached to a tagged GitHub Release.

## Android run

```bash
npm run cap:open
```

## Notes

The project is prepared for local Quran text and Badr Al-Turki MP3s to be placed directly inside the app bundle. The app will map surah numbers to the matching MP3 file names.
