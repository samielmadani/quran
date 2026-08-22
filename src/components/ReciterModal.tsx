import { useEffect, useMemo, useState } from 'react';
import { IonIcon } from '@ionic/react';
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

interface ReciterModalProps {
  isOpen: boolean;
  isClosing: boolean;
  activeReciterId: string;
  isFirstStartup?: boolean;
  onClose: () => void;
  onSelectReciter: (reciterId: string) => void;
}

export function ReciterModal({
  isOpen,
  isClosing,
  activeReciterId,
  isFirstStartup = false,
  onClose,
  onSelectReciter,
}: ReciterModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [downloadMap, setDownloadMap] = useState<Record<string, number[]>>({});
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress>(
    reciterDownloadManager.getProgress(),
  );

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

  if (!isOpen) return null;

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
    if (window.confirm(`Delete downloaded offline audio for ${reciter.name}?`)) {
      if (reciterDownloadManager.isDownloadingReciter(reciter.id)) {
        reciterDownloadManager.cancelDownload();
      }
      await reciterStorage.deleteReciter(reciter.id);
      await refreshInstalledStatus();
    }
  };

  return (
    <div
      className={`modal-overlay ${isClosing ? 'is-closing' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="reciter-modal-title"
      onClick={onClose}
    >
      <div className="modal-surface reciter-surface" onClick={(e) => e.stopPropagation()}>
        <div className="modal-heading">
          <div>
            <span className="eyebrow">Audio & Recitations</span>
            <h2 id="reciter-modal-title">Choose Reciter</h2>
          </div>
          {!isFirstStartup && (
            <button className="icon-button" type="button" onClick={onClose} aria-label="Close reciter modal">
              <IonIcon icon={close} />
            </button>
          )}
        </div>

        {isFirstStartup && (
          <div className="reciter-welcome-banner">
            <IonIcon icon={cloudDownloadOutline} className="welcome-banner-icon" />
            <div>
              <strong>Select Your Preferred Reciter</strong>
              <p>Choose any reciter to begin listening. You can stream instantly or download for offline playback.</p>
            </div>
          </div>
        )}

        {/* Search input with clear X button (Identical to Surah selector) */}
        <label className="search-field">
          <IonIcon icon={searchOutline} />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search reciter by name or style"
            aria-label="Search reciter"
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

        <div className="reciter-list">
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
                    <strong className="reciter-name-latin">{reciter.name}</strong>
                    <small className="reciter-style">{reciter.style}</small>
                  </div>

                  <div className="reciter-badges">
                    {isActive && (
                      <span className="reciter-badge active-badge">
                        <IonIcon icon={checkmarkCircle} /> Active Reciter
                      </span>
                    )}
                    {isFullyInstalled && !isCurrentlyDownloading && (
                      <span className="reciter-badge installed-badge">
                        Offline Ready ({count}/{reciter.totalSurahs})
                      </span>
                    )}
                    {isPartiallyInstalled && !isCurrentlyDownloading && (
                      <span className="reciter-badge partial-badge">
                        Offline ({count}/{reciter.totalSurahs})
                      </span>
                    )}
                    {!isFullyInstalled && !isPartiallyInstalled && !isCurrentlyDownloading && (
                      <span className="reciter-badge not-installed-badge">
                        <IonIcon icon={radioOutline} /> Stream & Offline
                      </span>
                    )}
                    {isCurrentlyDownloading && (
                      <span className="reciter-badge downloading-badge">
                        Downloading {downloadProgress.progressPercent}%
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
                      <span>Downloading Surah {downloadProgress.currentSurah} of {downloadProgress.totalSurahs}</span>
                      <span>{downloadProgress.downloadedCount}/{downloadProgress.totalSurahs} surahs ({downloadProgress.progressPercent}%)</span>
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
                      <IonIcon icon={checkmarkCircle} /> Select Reciter
                    </button>
                  ) : (
                    <button type="button" className="reciter-btn active-state-btn" disabled>
                      <IonIcon icon={checkmarkCircle} /> Currently Active
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
                      {count > 0 ? `Resume Download (${count}/${reciter.totalSurahs})` : 'Download Offline Audio'}
                    </button>
                  )}

                  {/* Cancel button */}
                  {isCurrentlyDownloading && (
                    <button
                      type="button"
                      className="reciter-btn cancel-btn"
                      onClick={(e) => handleCancelDownload(e)}
                    >
                      <IonIcon icon={pauseCircleOutline} /> Cancel Download
                    </button>
                  )}

                  {/* Delete button */}
                  {count > 0 && !isCurrentlyDownloading && (
                    <button
                      type="button"
                      className="reciter-btn delete-btn"
                      onClick={(e) => void handleDelete(reciter, e)}
                      title="Delete downloaded offline audio files"
                    >
                      <IonIcon icon={trashOutline} /> Delete Download
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
