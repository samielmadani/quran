import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Preferences } from '@capacitor/preferences';
import { quranService } from '../services/quranService';
import { audioService } from '../services/audioService';
import { reciterStorage } from '../services/storage';
import { reciterDownloadManager, type DownloadProgress } from '../services/reciterDownloadManager';
import { DEFAULT_RECITER_ID, getReciterById } from '../data/reciterRegistry';
import { translations, type AppLanguage } from '../data/translations';
import type { PlaybackState, RecentItem, RepeatMode, SleepTimerMode } from '../types/audio';

const DEFAULT_SURAH = 1;
const DEFAULT_AYAH = 1;
const UI_SETTINGS_STORAGE_KEY = 'quran_ui_settings';

export const FONT_SIZE_PRESETS = [
  { id: 'tiny', labelKey: 'fontTiny', size: 1.6 },
  { id: 'xsmall', labelKey: 'fontExtraSmall', size: 1.9 },
  { id: 'small', labelKey: 'fontSmall', size: 2.2 },
  { id: 'medium', labelKey: 'fontMedium', size: 2.8 },
  { id: 'large', labelKey: 'fontLarge', size: 3.4 },
  { id: 'xlarge', labelKey: 'fontExtraLarge', size: 4.0 },
  { id: 'huge', labelKey: 'fontHuge', size: 4.8 },
  { id: 'massive', labelKey: 'fontMassive', size: 5.5 },
];

interface StoredUiSettings {
  language?: AppLanguage;
  pinned?: boolean;
  showPrevNext?: boolean;
  swapPrevNext?: boolean;
  textSize?: number;
  autoScroll?: boolean;
  showRecentlyPlayed?: boolean;
  enableBookmarks?: boolean;
  bookmarkedSurahs?: number[];
  repeatMode?: RepeatMode;
}

function getStoredUiSettings(): StoredUiSettings {
  try {
    const raw = localStorage.getItem(UI_SETTINGS_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // Ignore
  }
  return {};
}

async function getStoredUiSettingsAsync(): Promise<StoredUiSettings> {
  try {
    const pref = await Preferences.get({ key: UI_SETTINGS_STORAGE_KEY });
    if (pref.value) {
      const parsed = JSON.parse(pref.value) as StoredUiSettings;
      // Sync back to localStorage so next sync read picks it up
      try { localStorage.setItem(UI_SETTINGS_STORAGE_KEY, pref.value); } catch { /* ignore */ }
      return parsed;
    }
  } catch {
    // Ignore
  }
  return getStoredUiSettings();
}

export function useQuranApp() {
  const initialSettings = useMemo(() => getStoredUiSettings(), []);

  const [language, setLanguage] = useState<AppLanguage>(() => (initialSettings.language === 'ar' ? 'ar' : 'en'));
  const [currentSurah, setCurrentSurah] = useState(DEFAULT_SURAH);
  const [currentAyah, setCurrentAyah] = useState(DEFAULT_AYAH);
  const [isPlaying, setIsPlaying] = useState(false);
  const [positionMs, setPositionMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);
  const [textSize, setTextSize] = useState(() => (typeof initialSettings.textSize === 'number' ? initialSettings.textSize : 2.8));
  const [autoScroll, setAutoScroll] = useState(() => (typeof initialSettings.autoScroll === 'boolean' ? initialSettings.autoScroll : true));
  const [pinned, setPinned] = useState(() => (typeof initialSettings.pinned === 'boolean' ? initialSettings.pinned : false));
  const [surahListOpen, setSurahListOpen] = useState(false);
  const [reciterModalOpen, setReciterModalOpen] = useState(false);
  const [isFirstStartup, setIsFirstStartup] = useState(false);
  const [activeReciterId, setActiveReciterId] = useState(DEFAULT_RECITER_ID);

  // Settings & Customization: Previous/Next, Recents, and Bookmarks default to TRUE on fresh install
  const [showPrevNext, setShowPrevNext] = useState(() => (typeof initialSettings.showPrevNext === 'boolean' ? initialSettings.showPrevNext : true));
  const [swapPrevNext, setSwapPrevNext] = useState(() => (typeof initialSettings.swapPrevNext === 'boolean' ? initialSettings.swapPrevNext : false));
  const [showRecentlyPlayed, setShowRecentlyPlayed] = useState(() => (typeof initialSettings.showRecentlyPlayed === 'boolean' ? initialSettings.showRecentlyPlayed : true));
  const [enableBookmarks, setEnableBookmarks] = useState(() => (typeof initialSettings.enableBookmarks === 'boolean' ? initialSettings.enableBookmarks : true));
  const [bookmarkedSurahs, setBookmarkedSurahs] = useState<number[]>(() => (Array.isArray(initialSettings.bookmarkedSurahs) ? initialSettings.bookmarkedSurahs : [1, 18, 36, 55, 67, 112]));
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('continuous');
  const [sleepTimerMode, setSleepTimerMode] = useState<SleepTimerMode>('off');
  const [sleepTimerRemainingSec, setSleepTimerRemainingSec] = useState<number | null>(null);

  // Global background download progress
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress>(
    reciterDownloadManager.getProgress(),
  );

  // Last session & Continue Listening card
  const [lastSession, setLastSession] = useState<{ surah: number; ayah: number; reciterId: string; positionMs: number } | null>(null);
  const [showContinueCard, setShowContinueCard] = useState(false);
  const [recentlyPlayed, setRecentlyPlayed] = useState<RecentItem[]>([]);

  const viewRef = useRef<HTMLDivElement | null>(null);

  const surahs = useMemo(() => quranService.getSurahs(), []);
  const activeReciter = useMemo(() => getReciterById(activeReciterId), [activeReciterId]);
  const t = useMemo(() => translations[language], [language]);

  // Save UI settings to localStorage & Capacitor Preferences
  const saveUiSettings = useCallback((updates: Partial<StoredUiSettings>) => {
    try {
      const current: StoredUiSettings = {
        language,
        pinned,
        showPrevNext,
        swapPrevNext,
        textSize,
        autoScroll,
        showRecentlyPlayed,
        enableBookmarks,
        bookmarkedSurahs,
        repeatMode,
        ...updates,
      };
      const json = JSON.stringify(current);
      localStorage.setItem(UI_SETTINGS_STORAGE_KEY, json);
      void Preferences.set({
        key: UI_SETTINGS_STORAGE_KEY,
        value: json,
      });
    } catch {
      // Ignore
    }
  }, [language, pinned, showPrevNext, swapPrevNext, textSize, autoScroll, showRecentlyPlayed, enableBookmarks, bookmarkedSurahs, repeatMode]);

  // Subscribe to audio player changes
  useEffect(() => {
    const unsubscribe = audioService.subscribe((nextState: PlaybackState) => {
      setIsPlaying(nextState.playing);
      setCurrentSurah(nextState.surah);
      setCurrentAyah(nextState.ayah);
      setPositionMs(nextState.positionMs);
      setDurationMs(nextState.durationMs);
      if (nextState.repeatMode) setRepeatMode(nextState.repeatMode);
      if (nextState.sleepTimerMode) setSleepTimerMode(nextState.sleepTimerMode);
      setSleepTimerRemainingSec(nextState.sleepTimerRemainingSec ?? null);
      setRecentlyPlayed(audioService.getRecentlyPlayed());
    });

    const init = async () => {
      // Restore async UI preferences from Capacitor Preferences FIRST
      // This is critical for native apps where localStorage may not persist
      const s = await getStoredUiSettingsAsync();
      if (s.language === 'en' || s.language === 'ar') setLanguage(s.language);
      if (typeof s.pinned === 'boolean') setPinned(s.pinned);
      if (typeof s.showPrevNext === 'boolean') setShowPrevNext(s.showPrevNext);
      if (typeof s.swapPrevNext === 'boolean') setSwapPrevNext(s.swapPrevNext);
      if (typeof s.textSize === 'number') setTextSize(s.textSize);
      if (typeof s.autoScroll === 'boolean') setAutoScroll(s.autoScroll);
      if (typeof s.showRecentlyPlayed === 'boolean') setShowRecentlyPlayed(s.showRecentlyPlayed);
      if (typeof s.enableBookmarks === 'boolean') setEnableBookmarks(s.enableBookmarks);
      if (Array.isArray(s.bookmarkedSurahs)) setBookmarkedSurahs(s.bookmarkedSurahs);
      if (s.repeatMode) {
        setRepeatMode(s.repeatMode);
        audioService.setRepeatMode(s.repeatMode);
      }

      await audioService.initialize();
      const currentReciter = await reciterStorage.getActiveReciterId();
      setActiveReciterId(currentReciter);
      setRecentlyPlayed(audioService.getRecentlyPlayed());

      // Check last session for automatic resume & Continue Listening
      const session = await audioService.getLastSession();
      if (session) {
        setLastSession(session);
        setCurrentSurah(session.surah);
        setCurrentAyah(session.ayah);
        setPositionMs(session.positionMs);
        if (session.reciterId) {
          setActiveReciterId(session.reciterId);
        }
        if (session.positionMs > 2000 || session.ayah > 1 || session.surah > 1) {
          setShowContinueCard(true);
        }
      }

      // Check first startup status
      const hasLaunched = localStorage.getItem('quran_has_launched_before');
      if (!hasLaunched) {
        localStorage.setItem('quran_has_launched_before', 'true');
        const downloaded = await reciterStorage.getDownloadedSurahs(currentReciter);
        if (downloaded.length === 0) {
          setIsFirstStartup(true);
          setReciterModalOpen(true);
        }
      }
    };

    void init();

    return unsubscribe;
  }, []);

  // Subscribe to background download manager
  useEffect(() => {
    const unsub = reciterDownloadManager.subscribe((progress) => {
      setDownloadProgress(progress);
    });
    return unsub;
  }, []);

  // Auto scroll to active ayah
  useEffect(() => {
    const reading = viewRef.current;
    if (!autoScroll || !reading) {
      return;
    }

    const target = reading.querySelector<HTMLElement>(`#ayah-${currentSurah}-${currentAyah}`);
    if (!target) {
      return;
    }

    const targetTop = currentAyah <= 1
      ? 0
      : target.getBoundingClientRect().top - reading.getBoundingClientRect().top + reading.scrollTop - (reading.clientHeight - target.offsetHeight) / 2;
    reading.scrollTo({
      top: Math.max(0, targetTop),
      behavior: 'smooth',
    });
  }, [currentSurah, currentAyah, autoScroll]);

  const handleSelectAyah = (surahNumber: number, ayahNumber: number) => {
    setCurrentSurah(surahNumber);
    setCurrentAyah(ayahNumber);
    setShowContinueCard(false);
    void audioService.playAyah({ surah: surahNumber, ayah: ayahNumber });
  };

  const handlePlayPause = async () => {
    setShowContinueCard(false);
    if (isPlaying) {
      await audioService.pause();
      return;
    }

    await audioService.resume();
  };

  const handleNextAyah = async () => {
    setShowContinueCard(false);
    await audioService.nextAyah();
  };

  const handlePreviousAyah = async () => {
    setShowContinueCard(false);
    await audioService.previousAyah();
  };

  const handleSelectReciter = async (reciterId: string) => {
    setActiveReciterId(reciterId);
    await audioService.setReciter(reciterId);
    setIsFirstStartup(false);
  };

  const handleContinueListening = async () => {
    setShowContinueCard(false);
    await audioService.resumeAtSavedPosition();
  };

  const handleCycleRepeatMode = () => {
    const nextMode = audioService.cycleRepeatMode();
    setRepeatMode(nextMode);
    saveUiSettings({ repeatMode: nextMode });
  };

  const handleSetRepeatMode = (mode: RepeatMode) => {
    setRepeatMode(mode);
    audioService.setRepeatMode(mode);
    saveUiSettings({ repeatMode: mode });
  };

  const handleSetSleepTimer = (mode: SleepTimerMode) => {
    setSleepTimerMode(mode);
    audioService.setSleepTimer(mode);
  };

  const handleTogglePinned = () => {
    setPinned((v) => {
      const next = !v;
      saveUiSettings({ pinned: next });
      return next;
    });
  };

  const handleToggleShowPrevNext = () => {
    setShowPrevNext((v) => {
      const next = !v;
      saveUiSettings({ showPrevNext: next });
      return next;
    });
  };

  const handleToggleSwapPrevNext = () => {
    setSwapPrevNext((v) => {
      const next = !v;
      saveUiSettings({ swapPrevNext: next });
      return next;
    });
  };

  const handleToggleShowRecentlyPlayed = () => {
    setShowRecentlyPlayed((v) => {
      const next = !v;
      saveUiSettings({ showRecentlyPlayed: next });
      return next;
    });
  };

  const handleToggleEnableBookmarks = () => {
    setEnableBookmarks((v) => {
      const next = !v;
      saveUiSettings({ enableBookmarks: next });
      return next;
    });
  };

  const handleToggleBookmark = (surahNumber: number) => {
    setBookmarkedSurahs((prev) => {
      const next = prev.includes(surahNumber)
        ? prev.filter((id) => id !== surahNumber)
        : [...prev, surahNumber];
      saveUiSettings({ bookmarkedSurahs: next });
      return next;
    });
  };

  const handleSetTextSize = (value: number | ((prev: number) => number)) => {
    setTextSize((prev) => {
      const next = typeof value === 'function' ? value(prev) : value;
      saveUiSettings({ textSize: next });
      return next;
    });
  };

  const handleSetAutoScroll = (value: boolean | ((prev: boolean) => boolean)) => {
    setAutoScroll((prev) => {
      const next = typeof value === 'function' ? value(prev) : value;
      saveUiSettings({ autoScroll: next });
      return next;
    });
  };

  const handleSetLanguage = (lang: AppLanguage) => {
    setLanguage(lang);
    saveUiSettings({ language: lang });
  };

  return {
    language,
    t,
    surahs,
    currentSurah,
    currentAyah,
    isPlaying,
    positionMs,
    durationMs,
    textSize,
    autoScroll,
    pinned,
    surahListOpen,
    reciterModalOpen,
    isFirstStartup,
    activeReciter,
    activeReciterId,
    showPrevNext,
    swapPrevNext,
    showRecentlyPlayed,
    enableBookmarks,
    bookmarkedSurahs,
    repeatMode,
    sleepTimerMode,
    sleepTimerRemainingSec,
    downloadProgress,
    lastSession,
    showContinueCard,
    recentlyPlayed,
    viewRef,
    setPinned,
    setLanguage: handleSetLanguage,
    setTextSize: handleSetTextSize,
    setAutoScroll: handleSetAutoScroll,
    setSurahListOpen,
    setReciterModalOpen,
    setCurrentSurah,
    setCurrentAyah,
    setShowContinueCard,
    handleSelectAyah,
    handlePlayPause,
    handleNextAyah,
    handlePreviousAyah,
    handleSelectReciter,
    handleContinueListening,
    handleCycleRepeatMode,
    handleSetRepeatMode,
    handleSetSleepTimer,
    handleTogglePinned,
    handleToggleShowPrevNext,
    handleToggleSwapPrevNext,
    handleToggleShowRecentlyPlayed,
    handleToggleEnableBookmarks,
    handleToggleBookmark,
  };
}
