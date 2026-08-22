import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Preferences } from '@capacitor/preferences';
import { quranService } from '../services/quranService';
import { audioService } from '../services/audioService';
import { reciterStorage } from '../services/storage';
import { reciterDownloadManager, type DownloadProgress } from '../services/reciterDownloadManager';
import { DEFAULT_RECITER_ID, getReciterById } from '../data/reciterRegistry';
import type { RepeatMode, SleepTimerMode, RecentItem } from '../types/audio';

const DEFAULT_SURAH = 1;
const DEFAULT_AYAH = 1;
const UI_SETTINGS_STORAGE_KEY = 'quran_ui_settings';

export const FONT_SIZE_PRESETS = [
  { id: 'small', label: 'Small', size: 2.0 },
  { id: 'medium', label: 'Medium', size: 2.5 },
  { id: 'large', label: 'Large', size: 3.0 },
  { id: 'xlarge', label: 'Extra Large', size: 3.6 },
  { id: 'huge', label: 'Huge', size: 4.2 },
] as const;

interface StoredUiSettings {
  pinned?: boolean;
  showPrevNext?: boolean;
  swapPrevNext?: boolean;
  textSize?: number;
  autoScroll?: boolean;
  showRecentlyPlayed?: boolean;
  enableBookmarks?: boolean;
  bookmarkedSurahs?: number[];
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

export function useQuranApp() {
  const initialSettings = useMemo(() => getStoredUiSettings(), []);

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

  // Settings & Customization
  const [showPrevNext, setShowPrevNext] = useState(() => (typeof initialSettings.showPrevNext === 'boolean' ? initialSettings.showPrevNext : false));
  const [swapPrevNext, setSwapPrevNext] = useState(() => (typeof initialSettings.swapPrevNext === 'boolean' ? initialSettings.swapPrevNext : false));
  const [showRecentlyPlayed, setShowRecentlyPlayed] = useState(() => (typeof initialSettings.showRecentlyPlayed === 'boolean' ? initialSettings.showRecentlyPlayed : false));
  const [enableBookmarks, setEnableBookmarks] = useState(() => (typeof initialSettings.enableBookmarks === 'boolean' ? initialSettings.enableBookmarks : false));
  const [bookmarkedSurahs, setBookmarkedSurahs] = useState<number[]>(() => (Array.isArray(initialSettings.bookmarkedSurahs) ? initialSettings.bookmarkedSurahs : []));
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

  // Save UI settings to localStorage & Capacitor Preferences
  const saveUiSettings = useCallback((updates: Partial<StoredUiSettings>) => {
    try {
      const current: StoredUiSettings = {
        pinned,
        showPrevNext,
        swapPrevNext,
        textSize,
        autoScroll,
        showRecentlyPlayed,
        enableBookmarks,
        bookmarkedSurahs,
        ...updates,
      };
      const json = JSON.stringify(current);
      localStorage.setItem(UI_SETTINGS_STORAGE_KEY, json);
      void Preferences.set({ key: UI_SETTINGS_STORAGE_KEY, value: json });
    } catch {
      // Ignore
    }
  }, [pinned, showPrevNext, swapPrevNext, textSize, autoScroll, showRecentlyPlayed, enableBookmarks, bookmarkedSurahs]);

  // Subscribe to audioService
  useEffect(() => {
    const unsubscribe = audioService.subscribe((nextState) => {
      setCurrentSurah(nextState.surah);
      setCurrentAyah(nextState.ayah);
      setIsPlaying(nextState.playing);
      setPositionMs(nextState.positionMs);
      setDurationMs(nextState.durationMs);
      if (nextState.repeatMode) setRepeatMode(nextState.repeatMode);
      if (nextState.sleepTimerMode) setSleepTimerMode(nextState.sleepTimerMode);
      setSleepTimerRemainingSec(nextState.sleepTimerRemainingSec ?? null);
      setRecentlyPlayed(audioService.getRecentlyPlayed());
    });

    const init = async () => {
      await audioService.initialize();
      const currentReciter = await reciterStorage.getActiveReciterId();
      setActiveReciterId(currentReciter);
      setRecentlyPlayed(audioService.getRecentlyPlayed());

      // Restore async UI preferences from Preferences if available
      try {
        const pref = await Preferences.get({ key: UI_SETTINGS_STORAGE_KEY });
        if (pref.value) {
          const s: StoredUiSettings = JSON.parse(pref.value);
          if (typeof s.pinned === 'boolean') setPinned(s.pinned);
          if (typeof s.showPrevNext === 'boolean') setShowPrevNext(s.showPrevNext);
          if (typeof s.swapPrevNext === 'boolean') setSwapPrevNext(s.swapPrevNext);
          if (typeof s.textSize === 'number') setTextSize(s.textSize);
          if (typeof s.autoScroll === 'boolean') setAutoScroll(s.autoScroll);
          if (typeof s.showRecentlyPlayed === 'boolean') setShowRecentlyPlayed(s.showRecentlyPlayed);
          if (typeof s.enableBookmarks === 'boolean') setEnableBookmarks(s.enableBookmarks);
          if (Array.isArray(s.bookmarkedSurahs)) setBookmarkedSurahs(s.bookmarkedSurahs);
        }
      } catch {
        // Ignore
      }

      // Check last session for automatic resume & Continue Listening
      const session = await audioService.getLastSession();
      if (session) {
        setLastSession(session);
        setCurrentSurah(session.surah);
        setCurrentAyah(session.ayah);
        setShowContinueCard(true);
      }

      // Check first startup status
      const downloaded = await reciterStorage.getDownloadedSurahs(currentReciter);
      if (downloaded.length === 0) {
        setIsFirstStartup(true);
        setReciterModalOpen(true);
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
    setIsPlaying(true);
  };

  const handlePlayPause = async () => {
    setShowContinueCard(false);
    if (isPlaying) {
      await audioService.pause();
      setIsPlaying(false);
      return;
    }

    await audioService.resume();
    setIsPlaying(true);
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
  };

  const handleSetRepeatMode = (mode: RepeatMode) => {
    setRepeatMode(mode);
    audioService.setRepeatMode(mode);
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

  return {
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
