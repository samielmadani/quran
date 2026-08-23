import { useEffect, useState } from 'react';
import { IonContent, IonIcon, IonModal } from '@ionic/react';
import { close } from 'ionicons/icons';
import type { Surah } from '../data/quranData';

interface TafsirModalProps {
  isOpen: boolean;
  surah: Surah | undefined;
  ayahNumber: number | null;
  onClose: () => void;
}

export function TafsirModal({ isOpen, surah, ayahNumber, onClose }: TafsirModalProps) {
  const [text, setText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const ayah = surah?.ayahs.find((item) => item.number === ayahNumber);

  useEffect(() => {
    if (!isOpen || !surah || ayahNumber === null) return;

    const controller = new AbortController();
    setText('');
    setIsLoading(true);
    fetch(`https://api.quran.com/api/v4/tafsirs/169/by_ayah/${surah.number}:${ayahNumber}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error('Tafsir request failed');
        const data = await response.json() as { tafsir?: { text?: string } };
        setText(data.tafsir?.text?.replace(/<[^>]+>/g, '') || 'Tafsir is unavailable for this ayah.');
      })
      .catch((error: unknown) => {
        if ((error as { name?: string }).name !== 'AbortError') {
          setText('Tafsir could not be loaded. Please check your connection and try again.');
        }
      })
      .finally(() => setIsLoading(false));

    return () => controller.abort();
  }, [isOpen, surah, ayahNumber]);

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onClose} className="quran-sheet-modal tafsir-modal">
      <IonContent className="sheet-content">
        <div className="modal-surface tafsir-surface" dir="ltr">
          <div className="modal-heading">
            <h2>{surah?.nameTransliteration} {ayahNumber}</h2>
            <button className="icon-button" type="button" onClick={onClose} aria-label="Close">
              <IonIcon icon={close} />
            </button>
          </div>
          {ayah && <p className="tafsir-ayah-text" dir="rtl">{ayah.text}</p>}
          <div className="tafsir-body">
            {isLoading ? <p>Loading tafsir...</p> : <p>{text}</p>}
          </div>
        </div>
      </IonContent>
    </IonModal>
  );
}
