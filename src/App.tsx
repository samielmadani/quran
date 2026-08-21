import {
  IonApp,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonModal,
  IonPage,
  IonRange,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import { chevronBack, chevronForward, menuOutline, pause, play } from 'ionicons/icons';
import '@fontsource/amiri/400.css';
import '@fontsource/amiri/700.css';
import { useQuranApp } from './hooks/useQuranApp';
import './App.css';

function App() {
  const {
    surahs,
    currentSurah,
    currentAyah,
    isPlaying,
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

  const surah = surahs.find((item) => item.number === currentSurah) ?? surahs[0];

  return (
    <IonApp>
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonTitle className="app-title">
              {surah.nameArabic} <span className="title-muted">Badr Al-Turki</span>
            </IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={() => setSurahListOpen(true)} aria-label="Open surah list">
                <IonIcon icon={menuOutline} />
              </IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>

        <IonContent fullscreen>
          <div className="quran-shell">
            <div className="quran-reading" ref={viewRef}>
              {surah.ayahs.map((ayah) => {
                const isActive = ayah.number === currentAyah;

                return (
                  <button
                    key={`${surah.number}-${ayah.number}`}
                    id={`ayah-${surah.number}-${ayah.number}`}
                    type="button"
                    className={`ayah ${isActive ? 'active' : ''}`}
                    onClick={() => handleSelectAyah(surah.number, ayah.number)}
                    aria-label={`Go to ayah ${ayah.number}`}
                    style={{ fontSize: `${textSize}rem` }}
                  >
                    <span className="ayah-number">{ayah.number}</span>
                    <span className="ayah-text">{ayah.text}</span>
                  </button>
                );
              })}
            </div>

            <div className="playback-bar">
              <IonButton fill="clear" onClick={handlePreviousAyah} aria-label="Previous ayah">
                <IonIcon icon={chevronBack} slot="icon-only" />
              </IonButton>
              <IonButton fill="clear" onClick={handlePlayPause} aria-label={isPlaying ? 'Pause' : 'Play'}>
                <IonIcon icon={isPlaying ? pause : play} slot="icon-only" />
              </IonButton>
              <IonButton fill="clear" onClick={handleNextAyah} aria-label="Next ayah">
                <IonIcon icon={chevronForward} slot="icon-only" />
              </IonButton>
            </div>

            <div className="status-row">
              <div className="status-item">
                <span>Surah</span>
                <strong>{surah.number}</strong>
              </div>
              <div className="status-item">
                <span>Ayah</span>
                <strong>{currentAyah}</strong>
              </div>
              <div className="status-item status-toggle">
                <span>Auto-scroll</span>
                <IonButton fill="clear" size="small" onClick={() => setAutoScroll((value) => !value)}>
                  {autoScroll ? 'On' : 'Off'}
                </IonButton>
              </div>
            </div>

            <div className="settings-panel">
              <label>
                Quran text size
                <IonRange min={2.2} max={4.2} step={0.1} value={textSize} onIonChange={(event) => setTextSize(Number(event.detail.value))} />
              </label>
            </div>
          </div>
        </IonContent>

        <IonModal isOpen={surahListOpen} onDidDismiss={() => setSurahListOpen(false)}>
          <IonHeader>
            <IonToolbar>
              <IonTitle>Surah Index</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => setSurahListOpen(false)}>Close</IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent>
            <IonList>
              {surahs.map((surahItem) => (
                <IonItem
                  key={surahItem.number}
                  button
                  onClick={() => {
                    setSurahListOpen(false);
                    handleSelectAyah(surahItem.number, 1);
                  }}
                >
                  <IonLabel>
                    <h2>
                      {surahItem.number}. {surahItem.nameArabic}
                    </h2>
                    <p>{surahItem.nameTransliteration}</p>
                  </IonLabel>
                </IonItem>
              ))}
            </IonList>
          </IonContent>
        </IonModal>
      </IonPage>
    </IonApp>
  );
}

export default App;
