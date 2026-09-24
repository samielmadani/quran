# Quran

> An offline-first Quran reader and audio companion for the web and Android.

## ✨ Why this app?

Quran keeps reading, listening, and personal study in one focused interface. Quran text is bundled locally, while the PWA shell can be cached for offline use, making the core reading experience dependable without a live data connection.

## 📲 How to install

Download the latest Android APK from the [GitHub Releases page](https://github.com/samielmadani/quran/releases/latest).

1. Download the `.apk` file on Android.
2. Allow your browser or file manager to install unknown apps if prompted.
3. Open the APK and tap **Install**.

The browser version can also be run locally with the development command below.

## 🔧 Features

- **Quran reader** — browse surahs and ayahs with adjustable text size.
- **Audio playback** — play ayahs and surahs with selectable reciters, repeat modes, auto-scroll, and a sleep timer.
- **Study tools** — bookmarks, pinned ayahs, search, translations, tafsir, and ayah information views.
- **Listening continuity** — resume the last session and review recently played surahs.
- **Offline-first shell** — bundled Quran data and a service worker for the PWA app shell.
- **Android delivery** — Capacitor packaging for Android, with native audio integration prepared in the project.
- **Arabic typography** — bundled Amiri font styles for Quran text.

## 🎧 Local audio

Place the 114 Badr Al-Turki files in `assets/audio/badr-al-turki/` using the names `001.mp3` through `114.mp3`. Ayah timing data is prepared and validated with:

```bash
npm run timings:prepare
```

## 🛠️ Development

```bash
npm install
npm run dev
```

Build the debug Android APK with:

```bash
npm run build:apk
```

The APK is copied to `artifacts/quran-latest.apk`. Release APK and App Bundle builds use `npm run build:android:release` and require the configured signing values described in the repository's Android build setup.

## 📸 Screenshots

Screenshots can be added here once the current reader and player flows have been captured on web and Android.

## 📜 License

No license file is currently included in this repository.
