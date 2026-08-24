import { useEffect, useState } from 'react';
import { IonContent, IonIcon, IonModal } from '@ionic/react';
import { close } from 'ionicons/icons';
import type { Surah } from '../data/quranData';

type AyahInfoModalProps = {
  isOpen: boolean;
  surah: Surah | undefined;
  ayahNumber: number | null;
  onClose: () => void;
};

export function AyahInfoModal({ isOpen, surah, ayahNumber, onClose }: AyahInfoModalProps) {
  const [translation, setTranslation] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const ayah = surah?.ayahs.find((item) => item.number === ayahNumber);

  useEffect(() => {
    if (!isOpen || !surah || ayahNumber === null) return;

    const controller = new AbortController();
    setTranslation('');
    setIsLoading(true);
    fetch(`https://api.quran.com/api/v4/verses/by_key/${surah.number}:${ayahNumber}?translations=20`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('Translation request failed');
        const data = await response.json() as { verse?: { translations?: Array<{ text?: string }> } };
        setTranslation((data.verse?.translations?.[0]?.text ?? '').replace(/<[^>]+>/g, '').trim());
      })
      .catch((error: unknown) => {
        if ((error as { name?: string }).name !== 'AbortError') setTranslation('Translation could not be loaded.');
      })
      .finally(() => setIsLoading(false));

    return () => controller.abort();
  }, [ayahNumber, isOpen, surah]);

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onClose} breakpoints={[0, 0.16, 0.96, 1]} initialBreakpoint={1} handle className="quran-sheet-modal ayah-info-modal">
      <IonContent className="sheet-content">
        <div className="modal-surface ayah-info-surface" dir="ltr">
          <div className="modal-heading">
            <h2>{surah?.nameTransliteration} {ayahNumber}</h2>
            <button className="icon-button" type="button" onClick={onClose} aria-label="Close">
              <IonIcon icon={close} />
            </button>
          </div>
          <div className="ayah-info-meta">Surah {surah?.number} · Ayah {ayahNumber}</div>
          <p className="ayah-info-arabic" dir="rtl">{ayah?.text}</p>
          <div className="ayah-info-translation">
            <strong>English translation</strong>
            <p>{isLoading ? 'Loading translation...' : translation || 'Translation unavailable.'}</p>
          </div>
        </div>
      </IonContent>
    </IonModal>
  );
}
