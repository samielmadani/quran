import { IonIcon } from '@ionic/react';
import { play, close } from 'ionicons/icons';
import { quranService } from '../services/quranService';
import { getReciterById } from '../data/reciterRegistry';

interface ContinueListeningCardProps {
  surahNumber: number;
  ayahNumber: number;
  reciterId: string;
  positionMs?: number;
  onContinue: () => void;
  onDismiss: () => void;
}

const formatTimestamp = (ms: number): string => {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
};

export function ContinueListeningCard({
  surahNumber,
  ayahNumber,
  reciterId,
  positionMs = 0,
  onContinue,
  onDismiss,
}: ContinueListeningCardProps) {
  const surah = quranService.getSurah(surahNumber);
  const reciter = getReciterById(reciterId);

  return (
    <div className="continue-listening-card" role="region" aria-label="Continue Listening">
      <div className="continue-listening-info">
        <span className="continue-eyebrow">Continue Listening</span>
        <strong className="continue-surah-title">
          {surah.nameTransliteration} • Ayah {ayahNumber}
        </strong>
        <div className="continue-meta-row">
          <span className="continue-timestamp">{formatTimestamp(positionMs)}</span>
          <span className="continue-dot">•</span>
          <span className="continue-reciter">{reciter.name}</span>
        </div>
      </div>

      <div className="continue-actions-row">
        <button
          type="button"
          className="continue-resume-btn"
          onClick={onContinue}
          aria-label={`Resume listening to ${surah.nameTransliteration} at ${formatTimestamp(positionMs)}`}
        >
          <IonIcon icon={play} />
          <span>RESUME</span>
        </button>

        <button
          type="button"
          className="continue-dismiss-btn"
          onClick={(e) => {
            e.stopPropagation();
            onDismiss();
          }}
          aria-label="Dismiss continue listening card"
          title="Dismiss"
        >
          <IonIcon icon={close} />
        </button>
      </div>
    </div>
  );
}
