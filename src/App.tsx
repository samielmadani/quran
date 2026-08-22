import { IonApp, IonContent, IonIcon } from '@ionic/react';
import {
  add,
  chevronBack,
  chevronForward,
  chevronUp,
  close,
  listOutline,
  micOutline,
  pause,
  pinOutline,
  play,
  remove,
  searchOutline,
  settingsOutline,
} from 'ionicons/icons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import '@fontsource/amiri/400.css';
import '@fontsource/amiri/700.css';
import { useQuranApp } from './hooks/useQuranApp';
import { getSurahJuzNumber } from './data/juzData';
import { ReciterModal } from './components/ReciterModal';
import './App.css';

const BASMALA = '﷽';
const toArabicNumerals = (value: number) => String(value).replace(/\d/g, (digit) => '٠١٢٣٤٥٦٧٨٩'[Number(digit)]);

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
    surahListOpen,
    reciterModalOpen,
    isFirstStartup,
    activeReciter,
    activeReciterId,
    viewRef,
    setTextSize,
    setAutoScroll,
    setSurahListOpen,
    setReciterModalOpen,
    handleSelectAyah,
    handlePlayPause,
    handleNextAyah,
    handlePreviousAyah,
    handleSelectReciter,
  } = useQuranApp();

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [controlsVisible, setControlsVisible] = useState(true);
  const [pinned, setPinned] = useState(false);
  const [closingModal, setClosingModal] = useState<'surah' | 'settings' | 'reciters' | null>(null);
  const hideControlsTimer = useRef<number | undefined>(undefined);
  const swipeStartY = useRef<number | null>(null);

  const scheduleControlsHide = useCallback(() => {
    window.clearTimeout(hideControlsTimer.current);
    if (isPlaying && !pinned) {
      hideControlsTimer.current = window.setTimeout(() => setControlsVisible(false), 3600);
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

  const progressPercent = durationMs > 0 ? Math.min(100, (positionMs / durationMs) * 100) : 0;

  return (
    <IonApp>
      <div
        className={`quran-shell ${controlsVisible || pinned ? '' : 'controls-hidden'}`}
        onPointerDown={handleShellPointerDown}
        onPointerUp={handleShellPointerUp}
      >
        <IonContent fullscreen>
          <main className="reading-stage">
            <div className="quran-reading" ref={viewRef}>
              <div className="quran-flow" dir="rtl" style={{ fontSize: `${textSize}rem` }}>
                {surah.number !== 9 && (
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
                    <span className="ayah-text">{BASMALA}</span>
                    {surah.number === 1 && <span className="ayah-number">{toArabicNumerals(1)}</span>}
                  </span>
                )}
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
          <div className="audio-progress" aria-label="Audio progress">
            <div className="audio-progress-fill" style={{ width: `${progressPercent}%` }} />
          </div>

          <div className="footer-toolbar">
            {/* Left Action Buttons */}
            <div className="toolbar-group toolbar-left">
              <button
                className={`icon-button pin-button ${pinned ? 'pinned' : ''}`}
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setPinned((value) => !value);
                  setControlsVisible(true);
                }}
                aria-label={pinned ? 'Unpin controls' : 'Pin controls'}
                aria-pressed={pinned}
                title={pinned ? 'Unpin player controls' : 'Pin player controls'}
              >
                <IonIcon icon={pinOutline} />
              </button>

              <button
                className="icon-button reciter-button"
                type="button"
                onClick={openReciterSelector}
                aria-label="Select reciter"
                title={`Reciter: ${activeReciter.name}`}
              >
                <IonIcon icon={micOutline} />
              </button>

              <button
                className="icon-button settings-button"
                type="button"
                onClick={openSettings}
                aria-label="Open settings"
                title="Settings"
              >
                <IonIcon icon={settingsOutline} />
              </button>
            </div>

            {/* Center Playback Transport */}
            <div className="toolbar-group toolbar-center" onPointerDown={(event) => event.stopPropagation()}>
              <button
                className="transport-button prev-button"
                type="button"
                onClick={handlePreviousAyah}
                aria-label="Previous ayah"
                title="Previous ayah"
              >
                <IonIcon icon={chevronBack} />
              </button>

              <button
                className={`play-button ${isPlaying ? 'is-playing' : ''}`}
                type="button"
                onClick={handlePlayPause}
                aria-label={isPlaying ? 'Pause' : 'Play'}
                title={isPlaying ? 'Pause' : 'Play'}
              >
                <IonIcon icon={isPlaying ? pause : play} />
              </button>

              <button
                className="transport-button next-button"
                type="button"
                onClick={handleNextAyah}
                aria-label="Next ayah"
                title="Next ayah"
              >
                <IonIcon icon={chevronForward} />
              </button>
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
              <label className="search-field">
                <IonIcon icon={searchOutline} />
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search surah by name or number"
                  aria-label="Search surah"
                />
              </label>
              <div className="surah-grid">
                {filteredSurahs.map((surahItem) => (
                  <button
                    key={surahItem.number}
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
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Settings Modal */}
        {settingsOpen && (
          <div
            className={`modal-overlay ${closingModal === 'settings' ? 'is-closing' : ''}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-modal-title"
            onClick={() => dismissModal('settings')}
          >
            <div className="modal-surface settings-surface" onClick={(event) => event.stopPropagation()}>
              <div className="modal-heading">
                <div>
                  <span className="eyebrow">Reading & Audio preferences</span>
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

              <div className="setting-row">
                <div>
                  <strong>Reciter</strong>
                  <small>{activeReciter.name} ({activeReciter.style})</small>
                </div>
                <button
                  type="button"
                  className="reciter-btn activate-btn"
                  onClick={openReciterSelector}
                >
                  Change
                </button>
              </div>

              <div className="setting-row">
                <div>
                  <strong>Auto-scroll</strong>
                  <small>Follow recitation automatically</small>
                </div>
                <button
                  className={`toggle ${autoScroll ? 'on' : ''}`}
                  type="button"
                  onClick={() => setAutoScroll((value) => !value)}
                  aria-pressed={autoScroll}
                >
                  <span />
                </button>
              </div>

              <div className="setting-row">
                <div>
                  <strong>Text size</strong>
                  <small>Adjust Quran font scale</small>
                </div>
                <div className="stepper">
                  <button
                    type="button"
                    onClick={() => setTextSize((value) => Math.max(2.0, Number((value - 0.1).toFixed(1))))}
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