import { useEffect, useMemo, useRef, useState } from 'react';
import { IonContent, IonIcon, IonModal } from '@ionic/react';
import {
  checkmarkCircle,
  close,
  cloudDownloadOutline,
  trashOutline,
  pauseCircleOutline,
  radioOutline,
  searchOutline,
} from 'ionicons/icons';
import { RECITERS, type Reciter } from '../data/reciterRegistry';
import { reciterStorage } from '../services/storage';
import { reciterDownloadManager, type DownloadProgress } from '../services/reciterDownloadManager';
import type { Translations } from '../data/translations';

interface ReciterModalProps {
  isOpen: boolean;
  activeReciterId: string;
  isFirstStartup?: boolean;
  t: Translations;
  language: 'en' | 'ar';
  onClose: () => void;
  onSelectReciter: (reciterId: string) => void;
}

export function ReciterModal({
  isOpen,
  activeReciterId,
  isFirstStartup = false,
  t,
  language,
  onClose,
  onSelectReciter,
}: ReciterModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [downloadMap, setDownloadMap] = useState<Record<string, number[]>>({});
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress>(
    reciterDownloadManager.getProgress(),
  );
  const reciterListRef = useRef<HTMLDivElement | null>(null);
  const refreshInstalledStatus = async () => {
    const map: Record<string, number[]> = {};
    for (const r of RECITERS) {
      map[r.id] = await reciterStorage.getDownloadedSurahs(r.id);
    }
    setDownloadMap(map);
  };

  useEffect(() => {
    if (isOpen) {
      void refreshInstalledStatus();
    }
  }, [isOpen]);

  useEffect(() => {
    const unsubscribe = reciterDownloadManager.subscribe((progress) => {
      setDownloadProgress(progress);
      if (!progress.isDownloading) {
        void refreshInstalledStatus();
      }
    });
    return unsubscribe;
  }, []);

  const filteredReciters = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return RECITERS;
    return RECITERS.filter((reciter) =>
      [reciter.name, reciter.nameArabic, reciter.style, reciter.description || ''].some((val) =>
        val.toLowerCase().includes(q),
      ),
    );
  }, [searchQuery]);

  const handleSelect = (reciterId: string) => {
    setSearchQuery('');
    onSelectReciter(reciterId);
  };

  const handleStartDownload = async (reciter: Reciter, event?: React.MouseEvent) => {
    event?.stopPropagation();
    await reciterDownloadManager.startDownload(reciter);
    await refreshInstalledStatus();
  };

  const handleCancelDownload = (event?: React.MouseEvent) => {
    event?.stopPropagation();
    reciterDownloadManager.cancelDownload();
  };

  const handleDelete = async (reciter: Reciter, event?: React.MouseEvent) => {
    event?.stopPropagation();
    if (window.confirm(`${t.deleteDownload} (${reciter.name})?`)) {
      if (reciterDownloadManager.isDownloadingReciter(reciter.id)) {
        reciterDownloadManager.cancelDownload();
      }
      await reciterStorage.deleteReciter(reciter.id);
      await refreshInstalledStatus();
    }
  };

  return (
    <IonModal
      isOpen={isOpen}
      onDidDismiss={onClose}
      breakpoints={[0, 0.16, 0.96, 1]}
      initialBreakpoint={0.96}
      handle
      className="quran-sheet-modal"
      onDidPresent={() => {
        window.requestAnimationFrame(() => {
          const selected = reciterListRef.current?.querySelector<HTMLElement>('.reciter-card.active');
          if (!selected) return;
          const itemRect = selected.getBoundingClientRect();
          if (itemRect.top >= 0 && itemRect.bottom <= window.innerHeight) return;
          selected.scrollIntoView({ block: 'center', behavior: 'smooth' });
        });
      }}
    >
      <IonContent className="sheet-content">
        <div className="modal-surface reciter-surface" dir={language === 'ar' ? 'rtl' : 'ltr'}>
        <div className="modal-heading">
          <h2 id="reciter-modal-title">{t.chooseReciter}</h2>
        </div>

        {isFirstStartup && (
          <div className="reciter-welcome-banner">
            <IonIcon icon={cloudDownloadOutline} className="welcome-banner-icon" />
            <div>
              <strong>{language === 'ar' ? 'اختر قارئك المفضل' : 'Select Your Preferred Reciter'}</strong>
              <p>
                {language === 'ar'
                  ? 'اختر أي قارئ للبدء في الاستماع فوراً أو تحميل التلاوات بدون إنترنت.'
                  : 'Choose any reciter to begin listening. You can stream instantly or download for offline playback.'}
              </p>
            </div>
          </div>
        )}

        {/* Search input with clear X button */}
        <div className="selector-search-row">
          {!isFirstStartup && (
            <button className="icon-button selector-close-button" type="button" onClick={onClose} aria-label={t.close}>
              <IonIcon icon={close} />
            </button>
          )}
          <label className="search-field">
            <IonIcon icon={searchOutline} />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.searchReciterPlaceholder}
              aria-label={t.chooseReciter}
            />
            {searchQuery && (
              <button type="button" className="search-clear-btn" onClick={() => setSearchQuery('')} aria-label={t.clearSearch}>
                <IonIcon icon={close} />
              </button>
            )}
          </label>
        </div>

        <div className="reciter-list" ref={reciterListRef}>
          {filteredReciters.map((reciter) => {
            const downloadedSurahs = downloadMap[reciter.id] ?? [];
            const count = downloadedSurahs.length;
            const isFullyInstalled = count >= reciter.totalSurahs;
            const isPartiallyInstalled = count > 0 && !isFullyInstalled;
            const isActive = activeReciterId === reciter.id;
            const isCurrentlyDownloading =
              downloadProgress.isDownloading && downloadProgress.reciterId === reciter.id;

            return (
              <div
                key={reciter.id}
                className={`reciter-card ${isActive ? 'active' : ''} ${isCurrentlyDownloading ? 'downloading' : ''}`}
                onClick={() => handleSelect(reciter.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    handleSelect(reciter.id);
                  }
                }}
              >
                <div className="reciter-card-header">
                  <div className="reciter-names">
                    <span className="reciter-name-arabic">{reciter.nameArabic}</span>
                    <strong className="reciter-name-latin">{language === 'ar' ? reciter.nameArabic : reciter.name}</strong>
                    <small className="reciter-style">{reciter.style}</small>
                  </div>

                  <div className="reciter-badges">
                    {isActive && (
                      <span className="reciter-badge active-badge">
                        <IonIcon icon={checkmarkCircle} /> {t.activeReciter}
                      </span>
                    )}
                    {isFullyInstalled && !isCurrentlyDownloading && (
                      <span className="reciter-badge installed-badge">
                        {t.offlineReady} ({count}/{reciter.totalSurahs})
                      </span>
                    )}
                    {isPartiallyInstalled && !isCurrentlyDownloading && (
                      <span className="reciter-badge partial-badge">
                        {t.offlinePartial} ({count}/{reciter.totalSurahs})
                      </span>
                    )}
                    {!isFullyInstalled && !isPartiallyInstalled && !isCurrentlyDownloading && (
                      <span className="reciter-badge not-installed-badge">
                        <IonIcon icon={radioOutline} /> {t.streamAndOffline}
                      </span>
                    )}
                    {isCurrentlyDownloading && (
                      <span className="reciter-badge downloading-badge">
                        {t.downloadingPercent} {downloadProgress.progressPercent}%
                      </span>
                    )}
                  </div>
                </div>

                {reciter.description && (
                  <p className="reciter-description">{reciter.description}</p>
                )}

                {isCurrentlyDownloading && (
                  <div className="reciter-download-progress" onClick={(e) => e.stopPropagation()}>
                    <div className="progress-info-row">
                      <span>
                        {language === 'ar'
                          ? `تحميل سورة ${downloadProgress.currentSurah} من ${downloadProgress.totalSurahs}`
                          : `Downloading Surah ${downloadProgress.currentSurah} of ${downloadProgress.totalSurahs}`}
                      </span>
                      <span>{downloadProgress.downloadedCount}/{downloadProgress.totalSurahs} ({downloadProgress.progressPercent}%)</span>
                    </div>
                    <div className="download-progress-track">
                      <div
                        className="download-progress-bar"
                        style={{ width: `${downloadProgress.progressPercent}%` }}
                      />
                    </div>
                  </div>
                )}

                {downloadProgress.error && downloadProgress.reciterId === reciter.id && (
                  <div className="download-error-msg">
                    Error: {downloadProgress.error}
                  </div>
                )}

                <div className="reciter-actions" onClick={(e) => e.stopPropagation()}>
                  {/* Select / Active State */}
                  {!isActive ? (
                    <button
                      type="button"
                      className="reciter-btn activate-btn"
                      onClick={() => handleSelect(reciter.id)}
                    >
                      <IonIcon icon={checkmarkCircle} /> {t.chooseReciter}
                    </button>
                  ) : (
                    <button type="button" className="reciter-btn active-state-btn" disabled>
                      <IonIcon icon={checkmarkCircle} /> {t.currentlyActive}
                    </button>
                  )}

                  {/* Download button for offline listening */}
                  {!isFullyInstalled && !isCurrentlyDownloading && (
                    <button
                      type="button"
                      className="reciter-btn download-btn"
                      onClick={(e) => void handleStartDownload(reciter, e)}
                    >
                      <IonIcon icon={cloudDownloadOutline} />
                      {count > 0 ? `${t.resumeDownload} (${count}/${reciter.totalSurahs})` : t.downloadOfflineAudio}
                    </button>
                  )}

                  {/* Cancel button */}
                  {isCurrentlyDownloading && (
                    <button
                      type="button"
                      className="reciter-btn cancel-btn"
                      onClick={(e) => handleCancelDownload(e)}
                    >
                      <IonIcon icon={pauseCircleOutline} /> {t.cancelDownload}
                    </button>
                  )}

                  {/* Delete button */}
                  {count > 0 && !isCurrentlyDownloading && (
                    <button
                      type="button"
                      className="reciter-btn delete-btn"
                      onClick={(e) => void handleDelete(reciter, e)}
                      title={t.deleteDownload}
                    >
                      <IonIcon icon={trashOutline} /> {t.delete}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        </div>
      </IonContent>
    </IonModal>
  );
}
