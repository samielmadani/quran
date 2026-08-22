import { IonApp, IonContent, IonIcon } from '@ionic/react';
import { add, chevronBack, chevronForward, close, listOutline, pause, pinOutline, play, remove, searchOutline, settingsOutline } from 'ionicons/icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import '@fontsource/amiri/400.css';
import '@fontsource/amiri/700.css';
import { useQuranApp } from './hooks/useQuranApp';
import { getSurahJuzNumber } from './data/juzData';
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
    viewRef,
    setTextSize,
    setAutoScroll,
    setSurahListOpen,
    handleSelectAyah,
    handlePlayPause,
    handleNextAyah,
    handlePreviousAyah,
  } = useQuranApp();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [controlsVisible, setControlsVisible] = useState(true);
  const [pinned, setPinned] = useState(false);
  const [closingModal, setClosingModal] = useState<'surah' | 'settings' | null>(null);
  const hideControlsTimer = useRef<number | undefined>(undefined);
  const swipeStartY = useRef<number | null>(null);

  const scheduleControlsHide = () => {
    window.clearTimeout(hideControlsTimer.current);
    if (isPlaying) {
      hideControlsTimer.current = window.setTimeout(() => setControlsVisible(false), 3200);
    }
  };

  const handleShellPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'touch') {
      swipeStartY.current = event.clientY;
    }
  };

  const handleShellPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'touch' && swipeStartY.current !== null) {
      if (swipeStartY.current - event.clientY > 40) {
        setControlsVisible(true);
        scheduleControlsHide();
      }
      swipeStartY.current = null;
    }
  };

  useEffect(() => {
    window.clearTimeout(hideControlsTimer.current);
    if (!isPlaying) {
      setControlsVisible(true);
      return () => window.clearTimeout(hideControlsTimer.current);
    }
    setControlsVisible(true);
    scheduleControlsHide();
    return () => window.clearTimeout(hideControlsTimer.current);
  }, [isPlaying]);

  const surah = surahs.find((item) => item.number === currentSurah) ?? surahs[0];
  const filteredSurahs = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase();
    if (!query) return surahs;
    return surahs.filter((item) =>
      [item.nameArabic, item.nameTransliteration, item.englishName, String(item.number)].some((value) => value.toLocaleLowerCase().includes(query)),
    );
  }, [searchQuery, surahs]);

  const openSettings = () => {
    setClosingModal(null);
    setSurahListOpen(false);
    setSettingsOpen(true);
  };

  const openSurahSelector = () => {
    setClosingModal(null);
    setSettingsOpen(false);
    setSurahListOpen(true);
  };

  const dismissModal = (modal: 'surah' | 'settings', after?: () => void) => {
    setClosingModal(modal);
    window.setTimeout(() => {
      if (modal === 'surah') setSurahListOpen(false);
      else setSettingsOpen(false);
      setClosingModal(null);
      after?.();
    }, 180);
  };

  return (
    <IonApp>
      <div className={`quran-shell ${controlsVisible || pinned ? '' : 'controls-hidden'}`} onPointerDown={handleShellPointerDown} onPointerUp={handleShellPointerUp}>
        <header className="app-header">
          <button className={`icon-button pin-button ${pinned ? 'pinned' : ''}`} type="button" onClick={(event) => { event.stopPropagation(); setPinned((value) => !value); setControlsVisible(true); }} aria-label={pinned ? 'Unpin controls' : 'Pin controls'} aria-pressed={pinned}><IonIcon icon={pinOutline} /></button>
          <button className="icon-button" type="button" onClick={openSettings} aria-label="Open settings"><IonIcon icon={settingsOutline} /></button>
          <button className="surah-heading" type="button" onClick={openSurahSelector} aria-label="Choose surah">
            <span className="surah-heading-arabic">{surah.nameArabic}</span>
            <span className="surah-heading-latin">{surah.nameTransliteration} <b>•</b> Juz&apos; {toArabicNumerals(getSurahJuzNumber(surah.number))}</span>
          </button>
          <div className="playback-dock" onPointerDown={(event) => event.stopPropagation()}>
            <button className="transport-button" type="button" onClick={handlePreviousAyah} aria-label="Previous ayah"><IonIcon icon={chevronBack} /><span>Previous</span></button>
            <button className={`play-button ${isPlaying ? 'is-playing' : ''}`} type="button" onClick={handlePlayPause} aria-label={isPlaying ? 'Pause' : 'Play'}><IonIcon icon={isPlaying ? pause : play} /></button>
            <button className="transport-button" type="button" onClick={handleNextAyah} aria-label="Next ayah"><IonIcon icon={chevronForward} /><span>Next</span></button>
          </div>
          <div className="header-meta">
            <span className="reciter-name">Badr Al-Turki</span>
            <span className="ayah-position">{isPlaying ? 'Playing' : 'Ready'} <b>·</b> Ayah {toArabicNumerals(currentAyah)}</span>
          </div>
          <button className="icon-button" type="button" onClick={openSurahSelector} aria-label="Open surah selector"><IonIcon icon={listOutline} /></button>
        </header>

        <IonContent fullscreen>
          <main className="reading-stage">
            <div className="quran-reading" ref={viewRef}>
              <div className="quran-flow" dir="rtl" style={{ fontSize: `${textSize}rem` }}>
                {surah.number !== 9 && <span id={`ayah-${surah.number}-${surah.number === 1 ? 1 : 0}`} role="button" tabIndex={0} className={`ayah basmala-ayah ${currentAyah === (surah.number === 1 ? 1 : 0) ? 'active' : ''}`} onClick={() => handleSelectAyah(surah.number, surah.number === 1 ? 1 : 0)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') handleSelectAyah(surah.number, surah.number === 1 ? 1 : 0); }} aria-label="Go to Bismillah"><span className="ayah-text">{BASMALA}</span>{surah.number === 1 && <span className="ayah-number">{toArabicNumerals(1)}</span>}</span>}
                {surah.ayahs.filter((ayah) => !(surah.number === 1 && ayah.number === 1)).map((ayah) => (
                  <span key={`${surah.number}-${ayah.number}`} id={`ayah-${surah.number}-${ayah.number}`} role="button" tabIndex={0} className={`ayah ${ayah.number === currentAyah ? 'active' : ''}`} onClick={() => handleSelectAyah(surah.number, ayah.number)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') handleSelectAyah(surah.number, ayah.number); }} aria-label={`Go to ayah ${ayah.number}`}>
                    <span className="ayah-text">{ayah.text}</span><span className="ayah-number">{toArabicNumerals(ayah.number)}</span>
                  </span>
                ))}
              </div>
            </div>
          </main>
        </IonContent>

        <div className="audio-progress" aria-label="Audio progress">
          <div className="audio-progress-fill" style={{ width: `${durationMs > 0 ? Math.min(100, (positionMs / durationMs) * 100) : 0}%` }} />
        </div>

        {surahListOpen && <div className={`modal-overlay ${closingModal === 'surah' ? 'is-closing' : ''}`} role="dialog" aria-modal="true" aria-labelledby="surah-modal-title" onClick={() => dismissModal('surah')}>
          <div className="modal-surface surah-surface" onClick={(event) => event.stopPropagation()}>
            <div className="modal-heading"><div><span className="eyebrow">Quran index</span><h2 id="surah-modal-title">Select Surah</h2></div><button className="icon-button" type="button" onClick={() => dismissModal('surah')} aria-label="Close surah selector"><IonIcon icon={close} /></button></div>
            <label className="search-field"><IonIcon icon={searchOutline} /><input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search surah" aria-label="Search surah" /></label>
            <div className="surah-grid">
              {filteredSurahs.map((surahItem) => (
                <button key={surahItem.number} type="button" className={`surah-option ${currentSurah === surahItem.number ? 'selected' : ''}`} onClick={() => dismissModal('surah', () => handleSelectAyah(surahItem.number, 1))}>
                  <span className="surah-index-number">{toArabicNumerals(surahItem.number).padStart(3, '٠')}</span>
                  <span className="surah-option-copy"><strong>{surahItem.nameArabic}</strong><small>{surahItem.nameTransliteration}</small></span>
                  <span className="surah-option-count">{surahItem.totalAyahs}</span>
                </button>
              ))}
            </div>
          </div>
        </div>}

        {settingsOpen && <div className={`modal-overlay ${closingModal === 'settings' ? 'is-closing' : ''}`} role="dialog" aria-modal="true" aria-labelledby="settings-modal-title" onClick={() => dismissModal('settings')}>
          <div className="modal-surface settings-surface" onClick={(event) => event.stopPropagation()}>
            <div className="modal-heading"><div><span className="eyebrow">Reading preferences</span><h2 id="settings-modal-title">Settings</h2></div><button className="icon-button" type="button" onClick={() => dismissModal('settings')} aria-label="Close settings"><IonIcon icon={close} /></button></div>
            <div className="setting-row"><div><strong>Auto-scroll</strong><small>Follow the recitation</small></div><button className={`toggle ${autoScroll ? 'on' : ''}`} type="button" onClick={() => setAutoScroll((value) => !value)} aria-pressed={autoScroll}><span /></button></div>
            <div className="setting-row"><div><strong>Text size</strong><small>Adjust Quran readability</small></div><div className="stepper"><button type="button" onClick={() => setTextSize((value) => Math.max(2.2, Number((value - 0.1).toFixed(1))))} aria-label="Decrease text size"><IonIcon icon={remove} /></button><span>{textSize.toFixed(1)}</span><button type="button" onClick={() => setTextSize((value) => Math.min(4.2, Number((value + 0.1).toFixed(1))))} aria-label="Increase text size"><IonIcon icon={add} /></button></div></div>
          </div>
        </div>}
      </div>
    </IonApp>
  );
}

export default App;