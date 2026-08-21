# Quran Automotive PWA

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
npm run build
npm run android:prepare
```

## Android run

```bash
npm run cap:open
```

## Notes

The project is prepared for local Quran text and Badr Al-Turki MP3s to be placed directly inside the app bundle. The app will map surah numbers to the matching MP3 file names.
