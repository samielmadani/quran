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

## Production build

```bash
npm run build:apk
```

The signed debug APK is copied to `artifacts/quran-latest.apk`. This file is intentionally committed so the public repository always contains an installable latest APK. Gradle's intermediate output remains ignored. For a production release APK, configure a private signing key through Gradle/GitHub Secrets.

## Download the Android app

GitHub Actions builds the APK on manual runs and for version tags matching `v*`. The latest committed APK is available at `artifacts/quran-latest.apk`; users can also download the `quran-latest-apk` workflow artifact or the APK attached to a tagged GitHub Release.

## Android run

```bash
npm run cap:open
```

## Notes

The project is prepared for local Quran text and Badr Al-Turki MP3s to be placed directly inside the app bundle. The app will map surah numbers to the matching MP3 file names.
