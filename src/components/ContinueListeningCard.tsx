import { IonIcon } from '@ionic/react';
import { play, close } from 'ionicons/icons';
import { quranService } from '../services/quranService';
import type { Translations } from '../data/translations';

interface ContinueListeningCardProps {
  surahNumber: number;
  ayahNumber: number;
  reciterId: string;
  positionMs?: number;
  t?: Translations;
  language?: 'en' | 'ar';
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
  positionMs = 0,
  language = 'en',
  onContinue,
  onDismiss,
}: ContinueListeningCardProps) {
  const surah = quranService.getSurah(surahNumber);

  return (
    <div className="continue-listening-card compact-banner" role="region" aria-label="Continue Listening" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <button
        type="button"
        className="continue-main-pill"
        onClick={onContinue}
        aria-label={`Continue listening to ${surah.nameTransliteration} ${ayahNumber}`}
      >
        <span className="continue-play-dot">
          <IonIcon icon={play} />
        </span>
        <span className="continue-label">
          {language === 'ar' ? 'متابعة الاستماع:' : 'Continue:'}
        </span>
        <strong className="continue-surah-title">
          {language === 'ar' ? `${surah.nameArabic} • آية ${ayahNumber}` : `${surah.nameTransliteration} • Ayah ${ayahNumber}`}
        </strong>
        <span className="continue-timestamp">
          ({formatTimestamp(positionMs)})
        </span>
      </button>

      <button
        type="button"
        className="continue-dismiss-btn compact"
        onClick={(e) => {
          e.stopPropagation();
          onDismiss();
        }}
        aria-label="Dismiss"
        title="Dismiss"
      >
        <IonIcon icon={close} />
      </button>
    </div>
  );
}
