import { IonApp, IonContent, IonIcon, IonModal, IonToast } from '@ionic/react';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import {
  add,
  bookmarkOutline,
  checkmarkCircle,
  chevronBack,
  chevronForward,
  close,
  createOutline,
  globeOutline,
  heart,
  heartOutline,
  infiniteOutline,
  pause,
  pauseCircleOutline,
  pin,
  pinOutline,
  play,
  remove,
  repeatOutline,
  searchOutline,
  settingsOutline,
  timeOutline,
} from 'ionicons/icons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import '@fontsource/amiri/400.css';
import '@fontsource/amiri/700.css';
import { useQuranApp, FONT_SIZE_PRESETS } from './hooks/useQuranApp';
import { getSurahJuzNumber } from './data/juzData';
import { ReciterModal } from './components/ReciterModal';
import { SurahHeader } from './components/SurahHeader';
import { ContinueListeningCard } from './components/ContinueListeningCard';
import { TafsirModal } from './components/TafsirModal';
import { AyahInfoModal } from './components/AyahInfoModal';
import { Tutorial } from './components/Tutorial';
import type { SleepTimerMode } from './types/audio';
import { audioService } from './services/audioService';
import { cleanTranslationText } from './services/translationService';
import './App.css';

const isStandaloneDisplay = () => window.matchMedia('(display-mode: standalone)').matches ||
  (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

const BASMALA = '﷽';
const toArabicNumerals = (value: number) => String(value).replace(/\d/g, (digit) => '٠١٢٣٤٥٦٧٨٩'[Number(digit)]);

const scrollSelectedItem = (container: HTMLElement | null, selector: string) => {
  const selected = container?.querySelector<HTMLElement>(selector);
  if (!selected) return;

  const itemRect = selected.getBoundingClientRect();
  if (itemRect.top >= 0 && itemRect.bottom <= window.innerHeight) return;

  selected.scrollIntoView({ block: 'center', behavior: 'instant' as ScrollBehavior });
};

const formatTimestamp = (ms: number): string => {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
};

function App() {
  const {
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
    autoPlayOnLaunch,
    translationMode,
    autoPlayOnSurahSelection,
    sleepTimerMode,
    sleepTimerRemainingSec,
    downloadProgress,
    lastSession,
    showContinueCard,
    recentlyPlayed,
    viewRef,
    setLanguage,
    setTextSize,
    setAutoScroll,
    setSurahListOpen,
    setReciterModalOpen,
    setShowContinueCard,
    handleSelectAyah,
    handleSelectSurah,
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
    handleToggleAutoPlayOnLaunch,
    handleToggleTranslationMode,
    handleToggleAutoPlayOnSurahSelection,
    handleToggleBookmark,
  } = useQuranApp();

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [tutorialOpen, setTutorialOpen] = useState(() => localStorage.getItem('quran_tutorial_completed') !== 'true');
  const [searchQuery, setSearchQuery] = useState('');
  const [controlsVisible, setControlsVisible] = useState(true);
  const [isEditingBookmarks, setIsEditingBookmarks] = useState(false);
  const [tafsirSelection, setTafsirSelection] = useState<{ surah: number; ayah: number | null } | null>(null);
  const [ayahInfoSelection, setAyahInfoSelection] = useState<{ surah: number; ayah: number } | null>(null);
  const [ayahTranslations, setAyahTranslations] = useState<Record<number, string>>({});
  const [, setShowExitPrompt] = useState(false);
  const hideControlsTimer = useRef<number | undefined>(undefined);
  const swipeStartY = useRef<number | null>(null);
  const surahListRef = useRef<HTMLDivElement | null>(null);
  const lastBackPress = useRef(0);
  const overlayState = useRef({ tafsir: false, surah: false, reciter: false, settings: false });

  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installDismissed, setInstallDismissed] = useState(() => localStorage.getItem('quran_install_dismissed') === 'true');

  useEffect(() => {
    const splash = document.getElementById('startup-splash');
    splash?.classList.add('hidden');
    const timer = window.setTimeout(() => splash?.remove(), 300);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (Capacitor.isNativePlatform() || isStandaloneDisplay() || !window.matchMedia('(max-width: 768px)').matches) return;
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const result = await installPrompt.userChoice;
    if (result.outcome === 'dismissed') {
      localStorage.setItem('quran_install_dismissed', 'true');
      setInstallDismissed(true);
    }
    setInstallPrompt(null);
  };

  const completeTutorial = () => {
    localStorage.setItem('quran_tutorial_completed', 'true');
    setTutorialOpen(false);
  };

  useEffect(() => {
    overlayState.current = {
      tafsir: tafsirSelection !== null || ayahInfoSelection !== null,
      surah: surahListOpen,
      reciter: reciterModalOpen,
      settings: settingsOpen,
    };
  }, [ayahInfoSelection, reciterModalOpen, settingsOpen, surahListOpen, tafsirSelection]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const handleNativeBackButton = async () => {
      if (overlayState.current.tafsir) {
        if (ayahInfoSelection) {
          setAyahInfoSelection(null);
          return;
        }
        setTafsirSelection(null);
        return;
      }
      if (overlayState.current.surah) {
        setSurahListOpen(false);
        return;
      }
      if (overlayState.current.reciter) {
        setReciterModalOpen(false);
        return;
      }
      if (overlayState.current.settings) {
        setSettingsOpen(false);
        return;
      }

      const now = Date.now();
      if (now - lastBackPress.current < 2000) {
        await CapApp.exitApp();
        return;
      }
      lastBackPress.current = now;
      // setShowExitPrompt(true);
    };
    window.addEventListener('nativeBackButton', handleNativeBackButton);

    return () => {
      window.removeEventListener('nativeBackButton', handleNativeBackButton);
    };
  }, [ayahInfoSelection, setReciterModalOpen, setSurahListOpen]);

  const handleAyahClick = (surahNumber: number, ayahNumber: number) => {
    handleSelectAyah(surahNumber, ayahNumber);
  };

  const handleSurahClick = (surahNumber: number) => {
    dismissModal('surah', () => handleSelectSurah(surahNumber));
  };

  const handleSurahHeaderClick = () => {
    openSurahSelector();
  };

  const scheduleControlsHide = useCallback(() => {
    window.clearTimeout(hideControlsTimer.current);
    if (isPlaying && !pinned) {
      hideControlsTimer.current = window.setTimeout(() => setControlsVisible(false), 4500);
    }
  }, [isPlaying, pinned]);

  const handleShellPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'touch') {
      swipeStartY.current = event.clientY;
    }
  };

  const handleShellPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'touch' && swipeStartY.current !== null) {
      if (swipeStartY.current - event.clientY > 30) {
        setControlsVisible(true);
        scheduleControlsHide();
      } else if (event.clientY - swipeStartY.current > 30 && controlsVisible) {
        setControlsVisible(false);
      }
      swipeStartY.current = null;
    }
  };

  useEffect(() => {
    window.clearTimeout(hideControlsTimer.current);
    if (!isPlaying || pinned) {
      setControlsVisible(true);
      return;
    }
    scheduleControlsHide();
    return () => window.clearTimeout(hideControlsTimer.current);
  }, [isPlaying, pinned, scheduleControlsHide]);

  // Tap anywhere that isn't an interactive element to quickly collapse/uncollapse the footer
  const handleBackgroundToggle = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest('button, .ayah, input, a, [role="dialog"], .modal-overlay, [role="progressbar"]')) {
      return;
    }
    if (target.closest('.app-footer')) {
      if (isCollapsed) {
        setControlsVisible(true);
        scheduleControlsHide();
      }
      return;
    }
    setControlsVisible((prev) => {
      const next = !prev;
      window.clearTimeout(hideControlsTimer.current);
      if (next) scheduleControlsHide();
      return next;
    });
  };

  const surah = surahs.find((item) => item.number === currentSurah) ?? surahs[0];
  useEffect(() => {
    if (!translationMode) {
      setAyahTranslations({});
      return;
    }
    const controller = new AbortController();
    void fetch(`https://api.quran.com/api/v4/verses/by_chapter/${currentSurah}?translations=20&fields=text_uthmani&per_page=300`, { signal: controller.signal })
      .then((response) => response.ok ? response.json() as Promise<{ verses?: Array<{ verse_number: number; translations?: Array<{ text?: string }> }> }> : Promise.reject(new Error('Translation request failed')))
      .then((data) => {
        const next: Record<number, string> = {};
        for (const verse of data.verses ?? []) {
          const text = verse.translations?.[0]?.text?.replace(/<[^>]+>/g, '').trim();
          if (text) next[verse.verse_number] = cleanTranslationText(text);
        }
        setAyahTranslations(next);
      })
      .catch((error: unknown) => {
        if ((error as { name?: string }).name !== 'AbortError') setAyahTranslations({});
      });
    return () => controller.abort();
  }, [currentSurah, translationMode]);
  const filteredSurahs = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase();
    if (!query) return surahs;
    return surahs.filter((item) =>
      [item.nameArabic, item.nameTransliteration, item.englishName, String(item.number)].some((value) =>
        value.toLocaleLowerCase().includes(query),
      ),
    );
  }, [searchQuery, surahs]);

  const openSettings = () => {
    setSurahListOpen(false);
    setReciterModalOpen(false);
    setSettingsOpen(true);
  };

  const openSurahSelector = () => {
    setSettingsOpen(false);
    setReciterModalOpen(false);
    setIsEditingBookmarks(false);
    setSurahListOpen(true);
  };

  const openReciterSelector = () => {
    setSettingsOpen(false);
    setSurahListOpen(false);
    setReciterModalOpen(true);
  };

  const dismissModal = (modal: 'surah' | 'settings' | 'reciters', after?: () => void) => {
    if (modal === 'surah') setSurahListOpen(false);
    else if (modal === 'settings') setSettingsOpen(false);
    else if (modal === 'reciters') setReciterModalOpen(false);
    if (after) window.setTimeout(after, 260);
  };

  // Accurate real-time progress ratio driven by player time
  const progressPercent = durationMs > 0 ? Math.min(100, Math.max(0, (positionMs / durationMs) * 100)) : 0;

  // Interactive seek on audio progress bar
  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    if (durationMs > 0) {
      void audioService.seekTo(ratio * durationMs);
    }
  };

  // Format sleep timer seconds to MM:SS
  const formatTimerRemaining = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  // Nav button action handlers taking swapping into account
  const handleLeftNavClick = () => {
    if (swapPrevNext) {
      void handleNextAyah();
    } else {
      void handlePreviousAyah();
    }
  };

  const handleRightNavClick = () => {
    if (swapPrevNext) {
      void handlePreviousAyah();
    } else {
      void handleNextAyah();
    }
  };

  // Autoplay / Repeat button icon & label helper
  const repeatBtnConfig = useMemo(() => {
    switch (repeatMode) {
      case 'repeat_single':
        return { icon: repeatOutline, label: t.repeatAyah, title: `${t.repeatAyah} (Tap to cycle)` };
      case 'repeat_surah':
        return { icon: repeatOutline, label: t.repeatSurah, title: `${t.repeatSurah} (Tap to cycle)` };
      case 'off':
        return { icon: pauseCircleOutline, label: t.autoplayOff, title: `${t.autoplayOff} (Stop after ayah)` };
      case 'continuous':
      default:
        return { icon: infiniteOutline, label: t.autoplay, title: `${t.autoplay} (Tap to cycle)` };
    }
  }, [repeatMode, t]);

  const isCollapsed = !controlsVisible && !pinned;

  return (
    <IonApp>
      <div
        className={`quran-shell ${isCollapsed ? 'controls-hidden' : ''} ${isPlaying ? 'is-playing' : ''}`}
        onPointerDown={handleShellPointerDown}
        onPointerUp={handleShellPointerUp}
        onClick={handleBackgroundToggle}
      >
        <IonContent fullscreen>
          <main className="reading-stage">
            {/* Subtle, Compact Continue Listening Banner */}
            {installPrompt && !installDismissed && !isPlaying && (
              <div className="install-prompt" role="dialog" aria-label="Install Quran App">
                <div>
                  <strong>Install Quran App</strong>
                  <span>Add the Quran app to your home screen for a better experience.</span>
                </div>
                <button type="button" onClick={() => void handleInstall()}>Install</button>
                <button type="button" className="install-dismiss" aria-label="Dismiss" onClick={() => {
                  localStorage.setItem('quran_install_dismissed', 'true');
                  setInstallDismissed(true);
                }}>×</button>
              </div>
            )}

            {showContinueCard && lastSession && !isPlaying && (
              <ContinueListeningCard
                surahNumber={lastSession.surah}
                ayahNumber={lastSession.ayah}
                reciterId={lastSession.reciterId}
                positionMs={lastSession.positionMs}
                t={t}
                language={language}
                onContinue={handleContinueListening}
                onDismiss={() => setShowContinueCard(false)}
              />
            )}

            <div className="quran-reading" ref={viewRef}>
              {/* Surah Header Card at Top of Each Surah */}
              <SurahHeader
                surah={surah}
                onOpenSurahPicker={openSurahSelector}
                onSurahClick={handleSurahHeaderClick}
              />

              <div className={`quran-flow ${translationMode ? 'translation-mode' : ''}`} dir="rtl" style={{ fontSize: `${textSize}rem` }}>
                {/* Bismillah Header (Except Surah 9 At-Tawbah) */}
                {surah.number !== 9 && (
                  <div className="basmala-container">
                    <span
                      id={`ayah-${surah.number}-${surah.number === 1 ? 1 : 0}`}
                      role="button"
                      tabIndex={0}
                      className={`ayah basmala-ayah ${translationMode ? 'translation-ayah' : ''} ${currentAyah === (surah.number === 1 ? 1 : 0) ? 'active' : ''} ${tafsirSelection?.surah === surah.number && tafsirSelection.ayah === (surah.number === 1 ? 1 : 0) ? 'tafsir-selected' : ''}`}
                      onClick={() => handleAyahClick(surah.number, surah.number === 1 ? 1 : 0)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          handleSelectAyah(surah.number, surah.number === 1 ? 1 : 0);
                        }
                      }}
                      aria-label="Go to Bismillah"
                    >
                      <span className="ayah-text basmala-calligraphy">{BASMALA}</span>
                      {surah.number === 1 && <span className="ayah-number">{toArabicNumerals(1)}</span>}
                      {translationMode && (
                        <span className="ayah-translation basmala-translation" dir="ltr">
                          In the name of Allah, the Most Compassionate, the Most Merciful
                        </span>
                      )}
                    </span>
                  </div>
                )}

                {/* Verses of the Surah */}
                {surah.ayahs
                  .filter((ayah) => !(surah.number === 1 && ayah.number === 1))
                  .map((ayah) => (
                    <div
                      key={`${surah.number}-${ayah.number}`}
                      id={`ayah-${surah.number}-${ayah.number}`}
                      role="button"
                      tabIndex={0}
                      className={`ayah ${translationMode ? 'translation-ayah' : ''} ${ayah.number === currentAyah ? 'active' : ''} ${tafsirSelection?.surah === surah.number && tafsirSelection.ayah === ayah.number ? 'tafsir-selected' : ''}`}
                      onClick={() => handleAyahClick(surah.number, ayah.number)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          handleSelectAyah(surah.number, ayah.number);
                        }
                      }}
                      aria-label={`Go to ayah ${ayah.number}`}
                    >
                      <span className="ayah-text">{ayah.text}</span>
                      <span className="ayah-number">{toArabicNumerals(ayah.number)}</span>
                      {translationMode && ayahTranslations[ayah.number] && (
                        <span className="ayah-translation" dir="ltr">{ayahTranslations[ayah.number]}</span>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          </main>
        </IonContent>

        {/* Full Player & Toolbar */}
        <footer className="app-footer" dir={language === 'ar' ? 'rtl' : 'ltr'}>
          {/* Interactive Live Audio Progress Bar */}
          <div
            className="audio-progress"
            onClick={handleProgressClick}
            role="progressbar"
            aria-valuenow={progressPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Audio progress bar"
          >
            <div className="audio-progress-fill" style={{ width: `${progressPercent}%` }} />
          </div>

          <div className="footer-toolbar">
            {/* Left Action Buttons */}
            <div className="toolbar-group toolbar-left">
              {/* Circular Download Progress Indicator (Appears ONLY while downloading) */}
              {downloadProgress.isDownloading && (
                <button
                  className="circular-download-btn"
                  type="button"
                  onClick={openReciterSelector}
                  title={`Downloading Surah ${downloadProgress.currentSurah}/${downloadProgress.totalSurahs} (${downloadProgress.progressPercent}%)`}
                  aria-label={`Download progress: ${downloadProgress.progressPercent}%`}
                >
                  <svg className="progress-ring" width="38" height="38" viewBox="0 0 36 36">
                    <circle
                      className="progress-ring-bg"
                      cx="18"
                      cy="18"
                      r="14"
                      fill="none"
                      stroke="rgba(255, 255, 255, 0.14)"
                      strokeWidth="3"
                    />
                    <circle
                      className="progress-ring-fill"
                      cx="18"
                      cy="18"
                      r="14"
                      fill="none"
                      stroke="var(--gold)"
                      strokeWidth="3"
                      strokeDasharray="87.96"
                      strokeDashoffset={87.96 - (87.96 * downloadProgress.progressPercent) / 100}
                      strokeLinecap="round"
                      transform="rotate(-90 18 18)"
                    />
                  </svg>
                  <span className="progress-ring-text">{downloadProgress.progressPercent}%</span>
                </button>
              )}

              {/* Pin Button */}
              <button
                className={`icon-button footer-pin-btn ${pinned ? 'is-pinned' : ''}`}
                type="button"
                onClick={handleTogglePinned}
                aria-label={t.pinnedControls}
                title={t.pinnedControls}
              >
                <IonIcon icon={pinned ? pin : pinOutline} />
              </button>

              {/* Settings Button */}
              <button
                id="tutorial-settings"
                className="icon-button settings-button"
                type="button"
                onClick={openSettings}
                aria-label={t.settings}
                title={t.settings}
              >
                <IonIcon icon={settingsOutline} />
              </button>

              {/* Autoplay / Repeat Cycle Button (Now shown in both portrait & landscape) */}
              <button
                className={`icon-button repeat-cycle-btn portrait-hidden ${repeatMode !== 'continuous' ? 'repeat-active' : ''}`}
                type="button"
                onClick={handleCycleRepeatMode}
                aria-label={repeatBtnConfig.title}
                title={repeatBtnConfig.title}
              >
                <IonIcon icon={repeatBtnConfig.icon} />
                <span className="repeat-cycle-badge">{repeatBtnConfig.label}</span>
              </button>
            </div>

            {/* Center Playback Transport (Previous, Play/Pause, Next) */}
            <div className="toolbar-group toolbar-center" onPointerDown={(event) => event.stopPropagation()}>
              {showPrevNext && (
                <button
                  className="transport-button prev-button"
                  type="button"
                  onClick={handleLeftNavClick}
                  aria-label={swapPrevNext ? t.nextAyah : t.previousAyah}
                  title={swapPrevNext ? t.nextAyah : t.previousAyah}
                >
                  <IonIcon icon={chevronBack} />
                </button>
              )}

              {/* Prominent Play / Pause Button */}
              <button
                id="tutorial-play"
                className={`play-button ${isPlaying ? 'is-playing' : ''}`}
                type="button"
                onClick={handlePlayPause}
                aria-label={isPlaying ? t.pause : t.play}
                title={isPlaying ? t.pause : t.play}
              >
                <IonIcon icon={isPlaying ? pause : play} />
              </button>

              {showPrevNext && (
                <button
                  className="transport-button next-button"
                  type="button"
                  onClick={handleRightNavClick}
                  aria-label={swapPrevNext ? t.previousAyah : t.nextAyah}
                  title={swapPrevNext ? t.previousAyah : t.nextAyah}
                >
                  <IonIcon icon={chevronForward} />
                </button>
              )}
            </div>

            {/* Right Meta & Surah Selection */}
            <div className="toolbar-group toolbar-right">
              {/* Reciter Button */}
              <button
                id="tutorial-reciter-selector"
                className="reciter-live-chip"
                type="button"
                onClick={openReciterSelector}
                aria-label={`${activeReciter.name}, ${formatTimestamp(positionMs)}`}
                title={`${activeReciter.name} • ${formatTimestamp(positionMs)}`}
              >
                <span className="reciter-chip-name">{language === 'ar' ? activeReciter.nameArabic : activeReciter.name}</span>
                <span className="reciter-chip-time">{formatTimestamp(positionMs)}</span>
              </button>

              <button
                id="tutorial-surah-selector"
                className="surah-heading-btn"
                type="button"
                onClick={openSurahSelector}
                aria-label={t.selectSurah}
              >
                <div className="surah-info">
                  <span className="surah-heading-arabic">{surah.nameArabic}</span>
                  <span className="surah-heading-english">{surah.englishName}</span>
                  <span className="surah-heading-latin">
                    ({surah.nameTransliteration}) <b>•</b> {toArabicNumerals(currentAyah)}
                  </span>
                </div>
              </button>
            </div>
          </div>
        </footer>

        {isCollapsed && (
          <div
            className="collapsed-transport-overlay"
            aria-label="Collapsed player controls"
            onClick={(event) => {
              event.stopPropagation();
              if (event.target === event.currentTarget) {
                setControlsVisible(true);
                scheduleControlsHide();
              }
            }}
          >
            {showPrevNext && (
              <button className="transport-button collapsed-transport-button" type="button" onClick={handleLeftNavClick} aria-label={swapPrevNext ? t.nextAyah : t.previousAyah}>
                <IonIcon icon={chevronBack} />
              </button>
            )}
            <button className={`play-button collapsed-transport-play ${isPlaying ? 'is-playing' : ''}`} type="button" onClick={handlePlayPause} aria-label={isPlaying ? t.pause : t.play}>
              <IonIcon icon={isPlaying ? pause : play} />
            </button>
            {showPrevNext && (
              <button className="transport-button collapsed-transport-button" type="button" onClick={handleRightNavClick} aria-label={swapPrevNext ? t.previousAyah : t.nextAyah}>
                <IonIcon icon={chevronForward} />
              </button>
            )}
          </div>
        )}

        {/* Surah Selector Modal (Full Screen, non-sticky) */}
        <IonModal
          isOpen={surahListOpen}
          onDidDismiss={() => setSurahListOpen(false)}
          breakpoints={[0, 0.16, 0.96, 1]}
          initialBreakpoint={1}
          handle
          className="quran-sheet-modal"
          onDidPresent={() => {
            window.requestAnimationFrame(() => scrollSelectedItem(surahListRef.current, '.surah-option.selected'));
          }}
        >
          <IonContent className="sheet-content">
            <div
              className="modal-surface surah-surface"
              dir={language === 'ar' ? 'rtl' : 'ltr'}
            >
              <div className="modal-heading">
                <h2 id="surah-modal-title">{t.selectSurah}</h2>
              </div>

              {/* Search Field with Clear X Button */}
              <div className="selector-search-row">
                <button className="icon-button selector-close-button" type="button" onClick={() => dismissModal('surah')} aria-label={t.close}>
                  <IonIcon icon={close} />
                </button>
                <label className="search-field">
                  <IonIcon icon={searchOutline} />
                  <input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder={t.searchSurahPlaceholder}
                    aria-label={t.selectSurah}
                  />
                  {searchQuery && (
                    <button type="button" className="search-clear-btn" onClick={() => setSearchQuery('')} aria-label={t.clearSearch}>
                      <IonIcon icon={close} />
                    </button>
                  )}
                </label>
              </div>

              {/* Bookmarks Row (When enabled) with Heart icon */}
              {enableBookmarks && !searchQuery && (
                <div className="selector-quick-section bookmark-section">
                  <div className="section-header-row">
                    <div className="section-subtitle">
                      <IonIcon icon={heart} className="gold-heart" /> {t.bookmarked}
                    </div>
                    <button
                      type="button"
                      className={`edit-toggle-btn ${isEditingBookmarks ? 'editing' : ''}`}
                      onClick={() => setIsEditingBookmarks((v) => !v)}
                    >
                      <IonIcon icon={isEditingBookmarks ? checkmarkCircle : createOutline} />
                      <span>{isEditingBookmarks ? t.done : t.edit}</span>
                    </button>
                  </div>

                  <div className="quick-chips-row">
                    {bookmarkedSurahs.length === 0 ? (
                      <span className="empty-hint">
                        {isEditingBookmarks ? t.tapToBookmarkHint : t.noBookmarksYet}
                      </span>
                    ) : (
                      bookmarkedSurahs.map((surahNum) => {
                        const itemSurah = surahs.find((s) => s.number === surahNum);
                        if (!itemSurah) return null;
                        return (
                          <div key={`bookmark-${surahNum}`} className="chip-wrapper">
                            <button
                              type="button"
                              className="recent-chip bookmark-chip"
                              onClick={() => {
                                if (isEditingBookmarks) {
                                  handleToggleBookmark(surahNum);
                                } else {
                                  dismissModal('surah', () => handleSelectSurah(surahNum));
                                }
                              }}
                            >
                              <IonIcon icon={heart} className="recent-chip-play gold-heart" />
                              <span className="recent-chip-title">{itemSurah.englishName}</span>
                              <span className="recent-chip-transliteration">({itemSurah.nameTransliteration})</span>
                              <span className="recent-chip-arabic">{itemSurah.nameArabic}</span>
                              {isEditingBookmarks && (
                                <IonIcon icon={close} className="chip-remove-icon" />
                              )}
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* Recently Played Section (When enabled by setting) */}
              {showRecentlyPlayed && recentlyPlayed.length > 0 && !searchQuery && (
                <div className="selector-quick-section recently-played-section">
                  <div className="section-header-row">
                    <div className="section-subtitle">
                      <IonIcon icon={bookmarkOutline} /> {t.recentlyPlayed}
                    </div>
                  </div>
                  <div className="quick-chips-row">
                    {recentlyPlayed.slice(0, 6).map((item) => {
                      const itemSurah = surahs.find((s) => s.number === item.surah);
                      if (!itemSurah) return null;
                      return (
                        <button
                          key={`recent-${item.surah}-${item.ayah}`}
                          type="button"
                          className="recent-chip"
                          onClick={() =>
                            dismissModal('surah', () => handleSelectSurah(item.surah, item.ayah))
                          }
                        >
                          <IonIcon icon={play} className="recent-chip-play" />
                          <span className="recent-chip-title">
                            {itemSurah.englishName} · Ayah (Verse) {item.ayah}
                          </span>
                          <span className="recent-chip-transliteration">({itemSurah.nameTransliteration})</span>
                          <span className="recent-chip-arabic">{itemSurah.nameArabic}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Surah List Grid - Heart icons ONLY shown in Edit mode */}
              <div className="surah-grid" ref={surahListRef}>
                {filteredSurahs.map((surahItem) => {
                  const isBookmarked = bookmarkedSurahs.includes(surahItem.number);
                  return (
                    <div key={surahItem.number} className="surah-option-wrapper">
                      <button
                        type="button"
                        className={`surah-option ${currentSurah === surahItem.number ? 'selected' : ''} ${tafsirSelection?.surah === surahItem.number && tafsirSelection.ayah === null ? 'tafsir-selected' : ''}`}
                        onClick={() => handleSurahClick(surahItem.number)}
                      >
                        <span className="surah-index-number">{toArabicNumerals(surahItem.number).padStart(3, '٠')}</span>
                        <span className="surah-option-copy">
                          <strong>{surahItem.nameArabic}</strong>
                          <span className="surah-option-english">{surahItem.englishName}</span>
                          <small>({surahItem.nameTransliteration}) · {t.juz} {toArabicNumerals(getSurahJuzNumber(surahItem.number))} (Part {getSurahJuzNumber(surahItem.number)})</small>
                        </span>
                        <span className="surah-option-count">{surahItem.totalAyahs} {t.ayahsCount}</span>
                      </button>

                      {/* Heart bookmark button ONLY shown when edit mode is active */}
                      {enableBookmarks && isEditingBookmarks && (
                        <button
                          type="button"
                          className={`surah-heart-btn ${isBookmarked ? 'is-bookmarked' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleBookmark(surahItem.number);
                          }}
                          aria-label={isBookmarked ? `Unbookmark ${surahItem.nameTransliteration}` : `Bookmark ${surahItem.nameTransliteration}`}
                          title={isBookmarked ? 'Bookmarked' : 'Bookmark surah'}
                        >
                          <IonIcon icon={isBookmarked ? heart : heartOutline} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </IonContent>
        </IonModal>

        {/* Settings Modal (Full Screen, non-sticky) */}
        <IonModal
          isOpen={settingsOpen}
          onDidDismiss={() => setSettingsOpen(false)}
          breakpoints={[0, 0.16, 0.96, 1]}
          initialBreakpoint={1}
          handle
          className="quran-sheet-modal"
        >
          <IonContent className="sheet-content">
            <div
              className="modal-surface settings-surface driving-settings"
              dir={language === 'ar' ? 'rtl' : 'ltr'}
            >
              <div className="modal-heading">
                <h2 id="settings-modal-title">{t.settingsTitle}</h2>
                <button
                  className="icon-button"
                  type="button"
                  onClick={() => dismissModal('settings')}
                  aria-label={t.close}
                >
                  <IonIcon icon={close} />
                </button>
              </div>
              <div className="dedication-credit" dir="rtl">
                <span className="dedication-text">صدقة جارية عن روح والدي المرحوم علي المدني</span>
                <span className="dedication-sub">رحمه الله رحمةً واسعة</span>
              </div>

              <div className="settings-scroll-body">
                {/* 1. Language Setting */}
                <div className="driving-section">
                  <div className="driving-section-header">
                    <span className="driving-section-title">
                      <IonIcon icon={globeOutline} /> {t.language}
                    </span>
                  </div>
                  <div className="driving-pills-row">
                    <button
                      type="button"
                      className={`driving-pill-btn ${language === 'en' ? 'selected' : ''}`}
                      onClick={() => setLanguage('en')}
                    >
                      {language === 'en' && <IonIcon icon={checkmarkCircle} />}
                      {t.english}
                    </button>
                    <button
                      type="button"
                      className={`driving-pill-btn ${language === 'ar' ? 'selected' : ''}`}
                      onClick={() => setLanguage('ar')}
                    >
                      {language === 'ar' && <IonIcon icon={checkmarkCircle} />}
                      {t.arabic}
                    </button>
                  </div>
                </div>

                {/* 2. Reciter Card (Big & Clear) */}
                <div className="driving-section">
                  <span className="driving-section-title">{t.selectSurah} (Chapter)</span>
                  <div className="driving-reciter-card">
                    <div className="driving-reciter-text">
                      <strong>{surah.nameArabic}</strong>
                      <span>{surah.englishName} · ({surah.nameTransliteration}) · Surah {surah.number}</span>
                    </div>
                    <button type="button" className="reciter-btn activate-btn" onClick={openSurahSelector}>{t.change}</button>
                  </div>
                </div>

                {/* 3. Reciter Card (Big & Clear) */}
                <div className="driving-section">
                  <span className="driving-section-title">{t.reciter}</span>
                  <div className="driving-reciter-card">
                    <div className="driving-reciter-text">
                      <strong>{language === 'ar' ? activeReciter.nameArabic : activeReciter.name}</strong>
                      <span>{activeReciter.style} · {activeReciter.nameArabic}</span>
                    </div>
                    <button
                      type="button"
                      className="reciter-btn activate-btn"
                      onClick={openReciterSelector}
                    >
                      {t.change}
                    </button>
                  </div>
                </div>

                {/* 4. Player Preferences */}
                <div className="driving-section">
                  <span className="driving-section-title">{t.player}</span>

                  {/* Pin Player */}
                  <div className="driving-row">
                    <span className="driving-row-label">{t.pinnedControls}</span>
                    <button
                      className={`toggle ${pinned ? 'on' : ''}`}
                      type="button"
                      onClick={handleTogglePinned}
                      aria-pressed={pinned}
                    >
                      <span />
                    </button>
                  </div>

                  <div className="driving-row driving-row-column">
                    <span className="driving-row-label">{t.repeatMode}</span>
                    <div className="driving-pills-row">
                      {[
                        { id: 'off', label: t.repeatOff },
                        { id: 'repeat_single', label: t.repeatOnce },
                        { id: 'repeat_surah', label: t.repeatSurah },
                        { id: 'continuous', label: t.repeatInfinite },
                      ].map((option) => (
                        <button key={option.id} type="button" className={`driving-pill-btn ${repeatMode === option.id ? 'selected' : ''}`} onClick={() => handleSetRepeatMode(option.id as typeof repeatMode)}>
                          {repeatMode === option.id && <IonIcon icon={checkmarkCircle} />}
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Navigation Chevrons */}
                  <div className="driving-row">
                    <span className="driving-row-label">{t.previousNextButtons}</span>
                    <button
                      className={`toggle ${showPrevNext ? 'on' : ''}`}
                      type="button"
                      onClick={handleToggleShowPrevNext}
                      aria-pressed={showPrevNext}
                    >
                      <span />
                    </button>
                  </div>

                  {/* Swap Button Actions */}
                  {showPrevNext && (
                    <div className="driving-row">
                      <span className="driving-row-label">{t.swapButtonDirections}</span>
                      <button
                        className={`toggle ${swapPrevNext ? 'on' : ''}`}
                        type="button"
                        onClick={handleToggleSwapPrevNext}
                        aria-pressed={swapPrevNext}
                      >
                        <span />
                      </button>
                    </div>
                  )}
                </div>

                {/* 5. Sleep / Stop Timer */}
                <div className="driving-section">
                  <div className="driving-section-header">
                    <span className="driving-section-title">{t.sleepTimer}</span>
                    {sleepTimerRemainingSec && (
                      <span className="driving-timer-countdown">
                        <IonIcon icon={timeOutline} /> {formatTimerRemaining(sleepTimerRemainingSec)}
                      </span>
                    )}
                  </div>
                  <div className="driving-pills-row">
                    {[
                      { id: 'off', label: t.timerOff },
                      { id: '5min', label: t.timer5min },
                      { id: '15min', label: t.timer15min },
                      { id: '30min', label: t.timer30min },
                      { id: 'end_of_ayah', label: t.timerEndOfAyah },
                      { id: 'end_of_surah', label: t.timerEndOfSurah },
                    ].map((timer) => (
                      <button
                        key={timer.id}
                        type="button"
                        className={`driving-pill-btn ${sleepTimerMode === timer.id ? 'selected' : ''}`}
                        onClick={() => handleSetSleepTimer(timer.id as SleepTimerMode)}
                      >
                        {sleepTimerMode === timer.id && <IonIcon icon={checkmarkCircle} />}
                        {timer.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 6. Reading & Font Size Options */}
                <div className="driving-section">
                  <span className="driving-section-title">{t.reading}</span>

                  {/* Show Recently Played (Default ON) */}
                  <div className="driving-row">
                    <span className="driving-row-label">{t.showRecentlyPlayed}</span>
                    <button
                      className={`toggle ${showRecentlyPlayed ? 'on' : ''}`}
                      type="button"
                      onClick={handleToggleShowRecentlyPlayed}
                      aria-pressed={showRecentlyPlayed}
                    >
                      <span />
                    </button>
                  </div>

                  {/* Enable Bookmarks (Default ON) */}
                  <div className="driving-row">
                    <span className="driving-row-label">{t.enableBookmarks}</span>
                    <button
                      className={`toggle ${enableBookmarks ? 'on' : ''}`}
                      type="button"
                      onClick={handleToggleEnableBookmarks}
                      aria-pressed={enableBookmarks}
                    >
                      <span />
                    </button>
                  </div>

                  {/* Auto-scroll */}
                  <div className="driving-row">
                    <span className="driving-row-label">{t.autoScroll}</span>
                    <button
                      className={`toggle ${autoScroll ? 'on' : ''}`}
                      type="button"
                      onClick={() => setAutoScroll((value) => !value)}
                      aria-pressed={autoScroll}
                    >
                      <span />
                    </button>
                  </div>

                  <div className="driving-row">
                    <span className="driving-row-label">{t.translationMode}</span>
                    <button className={`toggle ${translationMode ? 'on' : ''}`} type="button" onClick={handleToggleTranslationMode} aria-pressed={translationMode}>
                      <span />
                    </button>
                  </div>

                  <div className="driving-row">
                    <span className="driving-row-label">{t.autoPlayOnSurahSelection}</span>
                    <button className={`toggle ${autoPlayOnSurahSelection ? 'on' : ''}`} type="button" onClick={handleToggleAutoPlayOnSurahSelection} aria-pressed={autoPlayOnSurahSelection}>
                      <span />
                    </button>
                  </div>

                  <div className="driving-row">
                    <span className="driving-row-label">Replay Tutorial</span>
                    <button type="button" className="driving-pill-btn" onClick={() => { setSettingsOpen(false); setTutorialOpen(true); }}>Replay</button>
                  </div>

                  {Capacitor.isNativePlatform() && (
                    <div className="driving-row driving-row-with-description">
                      <span className="driving-row-label">
                        {t.autoPlayOnLaunch}
                        <small>{t.autoPlayOnLaunchDescription}</small>
                      </span>
                      <button
                        className={`toggle ${autoPlayOnLaunch ? 'on' : ''}`}
                        type="button"
                        onClick={handleToggleAutoPlayOnLaunch}
                        aria-pressed={autoPlayOnLaunch}
                        aria-label={t.autoPlayOnLaunch}
                      >
                        <span />
                      </button>
                    </div>
                  )}

                  {/* Font Size Preset Options */}
                  <div className="driving-font-size-box">
                    <div className="driving-section-header">
                      <span className="driving-row-label">{t.fontSize} ({textSize.toFixed(1)})</span>
                      <div className="stepper compact">
                        <button
                          type="button"
                          onClick={() => setTextSize((value) => Math.max(0.6, Number((value - 0.1).toFixed(1))))}
                          aria-label="Decrease text size"
                        >
                          <IonIcon icon={remove} />
                        </button>
                        <span>{textSize.toFixed(1)}</span>
                        <button
                          type="button"
                          onClick={() => setTextSize((value) => Math.min(3.0, Number((value + 0.1).toFixed(1))))}
                          aria-label="Increase text size"
                        >
                          <IonIcon icon={add} />
                        </button>
                      </div>
                    </div>
                    <div className="driving-pills-row font-pills-row">
                      {FONT_SIZE_PRESETS.map((preset) => (
                        <button
                          key={preset.id}
                          type="button"
                          className={`driving-pill-btn ${textSize === preset.size ? 'selected' : ''}`}
                          onClick={() => setTextSize(preset.size)}
                        >
                          {t[preset.labelKey as keyof typeof t] as string}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </IonContent>
        </IonModal>

        {/* Reciter Management Modal (Full Screen, non-sticky) */}
        <ReciterModal
          isOpen={reciterModalOpen}
          activeReciterId={activeReciterId}
          isFirstStartup={isFirstStartup}
          t={t}
          language={language}
          onClose={() => dismissModal('reciters')}
          onSelectReciter={(id) => {
            void handleSelectReciter(id);
            dismissModal('reciters');
          }}
        />

        <TafsirModal
          isOpen={tafsirSelection !== null}
          mode={tafsirSelection?.ayah === null ? 'surah' : 'ayah'}
          surah={tafsirSelection ? surahs.find((item) => item.number === tafsirSelection.surah) : undefined}
          ayahNumber={tafsirSelection?.ayah ?? null}
          onClose={() => setTafsirSelection(null)}
        />

        <AyahInfoModal
          isOpen={ayahInfoSelection !== null}
          surah={ayahInfoSelection ? surahs.find((item) => item.number === ayahInfoSelection.surah) : undefined}
          ayahNumber={ayahInfoSelection?.ayah ?? null}
          onClose={() => setAyahInfoSelection(null)}
        />

        {tutorialOpen && <Tutorial onComplete={completeTutorial} />}

        <IonToast
          isOpen={false}
          message="Press back again to exit"
          duration={2000}
          position="bottom"
          onDidDismiss={() => setShowExitPrompt(false)}
        />
      </div>
    </IonApp>
  );
}

export default App;