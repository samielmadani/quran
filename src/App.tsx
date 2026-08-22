import { IonApp, IonContent, IonIcon } from '@ionic/react';
import {
  add,
  bookmark,
  bookmarkOutline,
  checkmarkCircle,
  chevronBack,
  chevronForward,
  chevronUp,
  close,
  createOutline,
  infiniteOutline,
  listOutline,
  pause,
  pauseCircleOutline,
  play,
  remove,
  repeatOutline,
  searchOutline,
  settingsOutline,
  star,
  starOutline,
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
import type { SleepTimerMode } from './types/audio';
import { audioService } from './services/audioService';
import './App.css';

const BASMALA = '﷽';
const toArabicNumerals = (value: number) => String(value).replace(/\d/g, (digit) => '٠١٢٣٤٥٦٧٨٩'[Number(digit)]);

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
    setTextSize,
    setAutoScroll,
    setSurahListOpen,
    setReciterModalOpen,
    setShowContinueCard,
    handleSelectAyah,
    handlePlayPause,
    handleNextAyah,
    handlePreviousAyah,
    handleSelectReciter,
    handleContinueListening,
    handleCycleRepeatMode,
    handleSetSleepTimer,
    handleTogglePinned,
    handleToggleShowPrevNext,
    handleToggleSwapPrevNext,
    handleToggleShowRecentlyPlayed,
    handleToggleEnableBookmarks,
    handleToggleBookmark,
  } = useQuranApp();

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [controlsVisible, setControlsVisible] = useState(true);
  const [isEditingBookmarks, setIsEditingBookmarks] = useState(false);
  const [closingModal, setClosingModal] = useState<'surah' | 'settings' | 'reciters' | null>(null);
  const hideControlsTimer = useRef<number | undefined>(undefined);
  const swipeStartY = useRef<number | null>(null);

  const scheduleControlsHide = useCallback(() => {
    window.clearTimeout(hideControlsTimer.current);
    if (isPlaying && !pinned) {
      hideControlsTimer.current = window.setTimeout(() => setControlsVisible(false), 4000);
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

  const surah = surahs.find((item) => item.number === currentSurah) ?? surahs[0];
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
    setClosingModal(null);
    setSurahListOpen(false);
    setReciterModalOpen(false);
    setSettingsOpen(true);
  };

  const openSurahSelector = () => {
    setClosingModal(null);
    setSettingsOpen(false);
    setReciterModalOpen(false);
    setIsEditingBookmarks(false);
    setSurahListOpen(true);
  };

  const openReciterSelector = () => {
    setClosingModal(null);
    setSettingsOpen(false);
    setSurahListOpen(false);
    setReciterModalOpen(true);
  };

  const dismissModal = (modal: 'surah' | 'settings' | 'reciters', after?: () => void) => {
    setClosingModal(modal);
    window.setTimeout(() => {
      if (modal === 'surah') setSurahListOpen(false);
      else if (modal === 'settings') setSettingsOpen(false);
      else if (modal === 'reciters') setReciterModalOpen(false);
      setClosingModal(null);
      after?.();
    }, 180);
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
        return { icon: repeatOutline, label: '1×', title: 'Repeat Current Ayah (Tap to cycle)' };
      case 'repeat_surah':
        return { icon: repeatOutline, label: 'Surah', title: 'Repeat Surah (Tap to cycle)' };
      case 'off':
        return { icon: pauseCircleOutline, label: 'Off', title: 'Autoplay Off (Stop after ayah)' };
      case 'continuous':
      default:
        return { icon: infiniteOutline, label: 'Auto', title: 'Autoplay Continuous (Tap to cycle)' };
    }
  }, [repeatMode]);

  return (
    <IonApp>
      <div
        className={`quran-shell ${controlsVisible || pinned ? '' : 'controls-hidden'}`}
        onPointerDown={handleShellPointerDown}
        onPointerUp={handleShellPointerUp}
      >
        <IonContent fullscreen>
          <main className="reading-stage">
            {/* Continue Listening Hero Banner */}
            {showContinueCard && lastSession && !isPlaying && (
              <ContinueListeningCard
                surahNumber={lastSession.surah}
                ayahNumber={lastSession.ayah}
                reciterId={lastSession.reciterId}
                positionMs={lastSession.positionMs}
                onContinue={handleContinueListening}
                onDismiss={() => setShowContinueCard(false)}
              />
            )}

            <div className="quran-reading" ref={viewRef}>
              {/* Surah Header Card at Top of Each Surah */}
              <SurahHeader surah={surah} onOpenSurahPicker={openSurahSelector} />

              <div className="quran-flow" dir="rtl" style={{ fontSize: `${textSize}rem` }}>
                {/* Bismillah Header (Except Surah 9 At-Tawbah) */}
                {surah.number !== 9 && (
                  <div className="basmala-container">
                    <span
                      id={`ayah-${surah.number}-${surah.number === 1 ? 1 : 0}`}
                      role="button"
                      tabIndex={0}
                      className={`ayah basmala-ayah ${currentAyah === (surah.number === 1 ? 1 : 0) ? 'active' : ''}`}
                      onClick={() => handleSelectAyah(surah.number, surah.number === 1 ? 1 : 0)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          handleSelectAyah(surah.number, surah.number === 1 ? 1 : 0);
                        }
                      }}
                      aria-label="Go to Bismillah"
                    >
                      <span className="ayah-text basmala-calligraphy">{BASMALA}</span>
                      {surah.number === 1 && <span className="ayah-number">{toArabicNumerals(1)}</span>}
                    </span>
                  </div>
                )}

                {/* Verses of the Surah */}
                {surah.ayahs
                  .filter((ayah) => !(surah.number === 1 && ayah.number === 1))
                  .map((ayah) => (
                    <span
                      key={`${surah.number}-${ayah.number}`}
                      id={`ayah-${surah.number}-${ayah.number}`}
                      role="button"
                      tabIndex={0}
                      className={`ayah ${ayah.number === currentAyah ? 'active' : ''}`}
                      onClick={() => handleSelectAyah(surah.number, ayah.number)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          handleSelectAyah(surah.number, ayah.number);
                        }
                      }}
                      aria-label={`Go to ayah ${ayah.number}`}
                    >
                      <span className="ayah-text">{ayah.text}</span>
                      <span className="ayah-number">{toArabicNumerals(ayah.number)}</span>
                    </span>
                  ))}
              </div>
            </div>
          </main>
        </IonContent>

        {/* Full Player & Toolbar */}
        <footer className="app-footer">
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
                  title={`Downloading Surah ${downloadProgress.currentSurah}/${downloadProgress.totalSurahs} (${downloadProgress.progressPercent}%) - Tap to view`}
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

              <button
                className="icon-button settings-button"
                type="button"
                onClick={openSettings}
                aria-label="Open settings"
                title="Settings"
              >
                <IonIcon icon={settingsOutline} />
              </button>

              {/* Current Reciter + Live Audio Timestamp (Compact) */}
              <button
                className="reciter-live-chip"
                type="button"
                onClick={openReciterSelector}
                aria-label={`Reciter: ${activeReciter.name}, Audio position: ${formatTimestamp(positionMs)}`}
                title={`Reciter: ${activeReciter.name} • ${formatTimestamp(positionMs)}`}
              >
                <span className="reciter-chip-name">{activeReciter.name}</span>
                <span className="reciter-chip-time">{formatTimestamp(positionMs)}</span>
              </button>

              {/* Single Autoplay / Repeat Mode Cycle Button */}
              <button
                className={`icon-button repeat-cycle-btn ${repeatMode !== 'continuous' ? 'repeat-active' : ''}`}
                type="button"
                onClick={handleCycleRepeatMode}
                aria-label={repeatBtnConfig.title}
                title={repeatBtnConfig.title}
              >
                <IonIcon icon={repeatBtnConfig.icon} />
                <span className="repeat-cycle-badge">{repeatBtnConfig.label}</span>
              </button>
            </div>

            {/* Center Playback Transport (Strictly Centered via Grid) */}
            <div className="toolbar-group toolbar-center" onPointerDown={(event) => event.stopPropagation()}>
              {/* Optional Previous / Swapped Left Button */}
              {showPrevNext && (
                <button
                  className="transport-button prev-button"
                  type="button"
                  onClick={handleLeftNavClick}
                  aria-label={swapPrevNext ? 'Next ayah' : 'Previous ayah'}
                  title={swapPrevNext ? 'Next ayah' : 'Previous ayah'}
                >
                  <IonIcon icon={swapPrevNext ? chevronForward : chevronBack} />
                </button>
              )}

              {/* Center Play / Pause Button */}
              <button
                className={`play-button ${isPlaying ? 'is-playing' : ''}`}
                type="button"
                onClick={handlePlayPause}
                aria-label={isPlaying ? 'Pause' : 'Play'}
                title={isPlaying ? 'Pause' : 'Play'}
              >
                <IonIcon icon={isPlaying ? pause : play} />
              </button>

              {/* Optional Next / Swapped Right Button */}
              {showPrevNext && (
                <button
                  className="transport-button next-button"
                  type="button"
                  onClick={handleRightNavClick}
                  aria-label={swapPrevNext ? 'Previous ayah' : 'Next ayah'}
                  title={swapPrevNext ? 'Previous ayah' : 'Next ayah'}
                >
                  <IonIcon icon={swapPrevNext ? chevronBack : chevronForward} />
                </button>
              )}
            </div>

            {/* Right Meta & Surah Selection */}
            <div className="toolbar-group toolbar-right">
              <button
                className="surah-heading-btn"
                type="button"
                onClick={openSurahSelector}
                aria-label="Choose surah"
              >
                <div className="surah-info">
                  <span className="surah-heading-arabic">{surah.nameArabic}</span>
                  <span className="surah-heading-latin">
                    {surah.nameTransliteration} <b>•</b> {toArabicNumerals(currentAyah)}
                  </span>
                </div>
              </button>

              <button
                className="icon-button surah-list-btn"
                type="button"
                onClick={openSurahSelector}
                aria-label="Open surah selector"
                title="Surah index"
              >
                <IonIcon icon={listOutline} />
              </button>
            </div>
          </div>
        </footer>

        {/* Collapsed Mini-Player */}
        <aside
          className="mini-player"
          onClick={() => setControlsVisible(true)}
          role="region"
          aria-label="Mini audio player"
        >
          <div className="mini-progress-track">
            <div className="mini-progress-fill" style={{ width: `${progressPercent}%` }} />
          </div>
          <div className="mini-player-body">
            <button
              className="mini-play-btn"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                void handlePlayPause();
              }}
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              <IonIcon icon={isPlaying ? pause : play} />
            </button>

            <div className="mini-player-title">
              <span className="mini-player-reciter">{activeReciter.name}</span>
              <span className="mini-player-divider">—</span>
              <span className="mini-player-surah">{surah.nameTransliteration}</span>
              <span className="mini-player-ayah">{currentAyah}</span>
              <span className="mini-player-time">{formatTimestamp(positionMs)}</span>
              <span className="mini-player-expand-symbol">↑</span>
            </div>

            <button
              className="mini-expand-btn"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setControlsVisible(true);
              }}
              aria-label="Expand player"
            >
              <IonIcon icon={chevronUp} />
            </button>
          </div>
        </aside>

        {/* Surah Selector Modal */}
        {surahListOpen && (
          <div
            className={`modal-overlay ${closingModal === 'surah' ? 'is-closing' : ''}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="surah-modal-title"
            onClick={() => dismissModal('surah')}
          >
            <div className="modal-surface surah-surface" onClick={(event) => event.stopPropagation()}>
              <div className="modal-heading">
                <div>
                  <span className="eyebrow">Quran index</span>
                  <h2 id="surah-modal-title">Select Surah</h2>
                </div>
                <button
                  className="icon-button"
                  type="button"
                  onClick={() => dismissModal('surah')}
                  aria-label="Close surah selector"
                >
                  <IonIcon icon={close} />
                </button>
              </div>

              {/* Search Field with Clear X Button */}
              <label className="search-field">
                <IonIcon icon={searchOutline} />
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search surah by name or number"
                  aria-label="Search surah"
                />
                {searchQuery && (
                  <button
                    type="button"
                    className="search-clear-btn"
                    onClick={() => setSearchQuery('')}
                    aria-label="Clear search"
                  >
                    <IonIcon icon={close} />
                  </button>
                )}
              </label>

              {/* Bookmarks Row (When enabled) */}
              {enableBookmarks && !searchQuery && (
                <div className="selector-quick-section bookmark-section">
                  <div className="section-header-row">
                    <div className="section-subtitle">
                      <IonIcon icon={bookmark} /> Bookmarked
                    </div>
                    <button
                      type="button"
                      className={`edit-toggle-btn ${isEditingBookmarks ? 'editing' : ''}`}
                      onClick={() => setIsEditingBookmarks((v) => !v)}
                    >
                      <IonIcon icon={isEditingBookmarks ? checkmarkCircle : createOutline} />
                      <span>{isEditingBookmarks ? 'Done' : 'Edit'}</span>
                    </button>
                  </div>

                  <div className="quick-chips-row">
                    {bookmarkedSurahs.length === 0 ? (
                      <span className="empty-hint">
                        {isEditingBookmarks ? 'Tap stars below to bookmark surahs' : 'No bookmarks yet. Tap Edit to add.'}
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
                                  dismissModal('surah', () => handleSelectAyah(surahNum, 1));
                                }
                              }}
                            >
                              <IonIcon icon={star} className="recent-chip-play gold-star" />
                              <span className="recent-chip-title">{itemSurah.nameTransliteration}</span>
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
                      <IonIcon icon={bookmarkOutline} /> Recently Played
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
                            dismissModal('surah', () => handleSelectAyah(item.surah, item.ayah))
                          }
                        >
                          <IonIcon icon={play} className="recent-chip-play" />
                          <span className="recent-chip-title">
                            {itemSurah.nameTransliteration} {item.ayah}
                          </span>
                          <span className="recent-chip-arabic">{itemSurah.nameArabic}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Surah List Grid */}
              <div className="surah-grid">
                {filteredSurahs.map((surahItem) => {
                  const isBookmarked = bookmarkedSurahs.includes(surahItem.number);
                  return (
                    <div key={surahItem.number} className="surah-option-wrapper">
                      <button
                        type="button"
                        className={`surah-option ${currentSurah === surahItem.number ? 'selected' : ''}`}
                        onClick={() => dismissModal('surah', () => handleSelectAyah(surahItem.number, 1))}
                      >
                        <span className="surah-index-number">{toArabicNumerals(surahItem.number).padStart(3, '٠')}</span>
                        <span className="surah-option-copy">
                          <strong>{surahItem.nameArabic}</strong>
                          <small>{surahItem.nameTransliteration} · Juz&apos; {toArabicNumerals(getSurahJuzNumber(surahItem.number))}</small>
                        </span>
                        <span className="surah-option-count">{surahItem.totalAyahs} ayahs</span>
                      </button>

                      {/* Bookmark toggle star in list when bookmarks enabled */}
                      {enableBookmarks && (
                        <button
                          type="button"
                          className={`surah-star-btn ${isBookmarked ? 'is-bookmarked' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleBookmark(surahItem.number);
                          }}
                          aria-label={isBookmarked ? `Remove ${surahItem.nameTransliteration} from bookmarks` : `Bookmark ${surahItem.nameTransliteration}`}
                          title={isBookmarked ? 'Bookmarked' : 'Bookmark surah'}
                        >
                          <IonIcon icon={isBookmarked ? star : starOutline} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Driving-Optimized Quick Glance Settings Modal */}
        {settingsOpen && (
          <div
            className={`modal-overlay ${closingModal === 'settings' ? 'is-closing' : ''}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-modal-title"
            onClick={() => dismissModal('settings')}
          >
            <div className="modal-surface settings-surface driving-settings" onClick={(event) => event.stopPropagation()}>
              <div className="modal-heading">
                <div>
                  <span className="eyebrow">Quick Preferences</span>
                  <h2 id="settings-modal-title">Settings</h2>
                </div>
                <button
                  className="icon-button"
                  type="button"
                  onClick={() => dismissModal('settings')}
                  aria-label="Close settings"
                >
                  <IonIcon icon={close} />
                </button>
              </div>

              <div className="settings-scroll-body">
                {/* 1. Reciter Card (Big & Clear) */}
                <div className="driving-section">
                  <span className="driving-section-title">Reciter</span>
                  <div className="driving-reciter-card">
                    <div className="driving-reciter-text">
                      <strong>{activeReciter.name}</strong>
                      <span>{activeReciter.style} · {activeReciter.nameArabic}</span>
                    </div>
                    <button
                      type="button"
                      className="reciter-btn activate-btn"
                      onClick={openReciterSelector}
                    >
                      Change
                    </button>
                  </div>
                </div>

                {/* 2. Player Preferences */}
                <div className="driving-section">
                  <span className="driving-section-title">Player</span>
                  
                  {/* Pin Player */}
                  <div className="driving-row">
                    <span className="driving-row-label">Pinned Controls</span>
                    <button
                      className={`toggle ${pinned ? 'on' : ''}`}
                      type="button"
                      onClick={handleTogglePinned}
                      aria-pressed={pinned}
                    >
                      <span />
                    </button>
                  </div>

                  {/* Navigation Chevrons */}
                  <div className="driving-row">
                    <span className="driving-row-label">Previous / Next Buttons</span>
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
                      <span className="driving-row-label">Swap Button Directions (RTL)</span>
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

                {/* 3. Sleep / Stop Timer */}
                <div className="driving-section">
                  <div className="driving-section-header">
                    <span className="driving-section-title">Sleep Timer</span>
                    {sleepTimerRemainingSec && (
                      <span className="driving-timer-countdown">
                        <IonIcon icon={timeOutline} /> {formatTimerRemaining(sleepTimerRemainingSec)}
                      </span>
                    )}
                  </div>
                  <div className="driving-pills-row">
                    {[
                      { id: 'off', label: 'Off' },
                      { id: '5min', label: '5 min' },
                      { id: '15min', label: '15 min' },
                      { id: '30min', label: '30 min' },
                      { id: 'end_of_ayah', label: 'End of Ayah' },
                      { id: 'end_of_surah', label: 'End of Surah' },
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

                {/* 4. Reading & Font Size Options */}
                <div className="driving-section">
                  <span className="driving-section-title">Reading</span>

                  {/* Show Recently Played (Default OFF) */}
                  <div className="driving-row">
                    <span className="driving-row-label">Show Recently Played</span>
                    <button
                      className={`toggle ${showRecentlyPlayed ? 'on' : ''}`}
                      type="button"
                      onClick={handleToggleShowRecentlyPlayed}
                      aria-pressed={showRecentlyPlayed}
                    >
                      <span />
                    </button>
                  </div>

                  {/* Enable Bookmarks (Default OFF) */}
                  <div className="driving-row">
                    <span className="driving-row-label">Enable Bookmarks</span>
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
                    <span className="driving-row-label">Auto-scroll</span>
                    <button
                      className={`toggle ${autoScroll ? 'on' : ''}`}
                      type="button"
                      onClick={() => setAutoScroll((value) => !value)}
                      aria-pressed={autoScroll}
                    >
                      <span />
                    </button>
                  </div>

                  {/* Font Size Preset Options */}
                  <div className="driving-font-size-box">
                    <div className="driving-section-header">
                      <span className="driving-row-label">Font Size ({textSize.toFixed(1)})</span>
                      <div className="stepper compact">
                        <button
                          type="button"
                          onClick={() => setTextSize((value) => Math.max(1.8, Number((value - 0.1).toFixed(1))))}
                          aria-label="Decrease text size"
                        >
                          <IonIcon icon={remove} />
                        </button>
                        <span>{textSize.toFixed(1)}</span>
                        <button
                          type="button"
                          onClick={() => setTextSize((value) => Math.min(4.5, Number((value + 0.1).toFixed(1))))}
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
                          className={`driving-pill-btn ${Math.abs(textSize - preset.size) < 0.1 ? 'selected' : ''}`}
                          onClick={() => setTextSize(preset.size)}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Reciter Management Modal */}
        <ReciterModal
          isOpen={reciterModalOpen}
          isClosing={closingModal === 'reciters'}
          activeReciterId={activeReciterId}
          isFirstStartup={isFirstStartup}
          onClose={() => dismissModal('reciters')}
          onSelectReciter={(id) => {
            void handleSelectReciter(id);
            dismissModal('reciters');
          }}
        />
      </div>
    </IonApp>
  );
}

export default App;