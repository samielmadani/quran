import { useEffect, useState } from 'react';
import { IonContent, IonIcon, IonModal } from '@ionic/react';
import { close } from 'ionicons/icons';
import type { Surah } from '../data/quranData';

interface TafsirModalProps {
  isOpen: boolean;
  surah: Surah | undefined;
  ayahNumber: number | null;
  mode?: 'ayah' | 'surah';
  onClose: () => void;
}

type TafsirEntry = { verse_key?: string; text?: string };

const TAFSIR_SOURCE = 'Tafsir Ibn Kathir (Abridged)';
const TAFSIR_AUTHOR = 'Ibn Kathir';
const TAFSIR_SOURCE_DETAIL = 'Quran.com Tafsir API, resource 169';

const stripMarkup = (value: string) => value.replace(/<[^>]+>/g, '').trim();

export function TafsirModal({ isOpen, surah, ayahNumber, mode = 'ayah', onClose }: TafsirModalProps) {
  const [text, setText] = useState('');
  const [entries, setEntries] = useState<TafsirEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const ayah = surah?.ayahs.find((item) => item.number === ayahNumber);
  const isSurahView = mode === 'surah';

  useEffect(() => {
    if (!isOpen || !surah || (!isSurahView && ayahNumber === null)) return;

    const controller = new AbortController();
    setText('');
    setEntries([]);
    setIsLoading(true);
    const endpoint = isSurahView
      ? `https://api.quran.com/api/v4/tafsirs/169/by_chapter/${surah.number}`
      : `https://api.quran.com/api/v4/tafsirs/169/by_ayah/${surah.number}:${ayahNumber}`;
    fetch(endpoint, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error('Tafsir request failed');
        const data = await response.json() as {
          tafsir?: { text?: string };
          tafsirs?: TafsirEntry[];
        };
        if (isSurahView) {
          setEntries(data.tafsirs?.filter((entry) => entry.text && entry.verse_key) ?? []);
        } else {
          setText(stripMarkup(data.tafsir?.text ?? ''));
        }
      })
      .catch((error: unknown) => {
        if ((error as { name?: string }).name !== 'AbortError') {
          setText(`Tafsir could not be loaded from ${TAFSIR_SOURCE}. Please check your connection and try again.`);
        }
      })
      .finally(() => setIsLoading(false));

    return () => controller.abort();
  }, [isOpen, isSurahView, surah, ayahNumber]);

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onClose} className="quran-sheet-modal tafsir-modal">
      <IonContent className="sheet-content">
        <div className="modal-surface tafsir-surface" dir="ltr">
          <div className="modal-heading">
            <h2>{isSurahView ? surah?.nameTransliteration : `${surah?.nameTransliteration} ${ayahNumber}`}</h2>
            <button className="icon-button" type="button" onClick={onClose} aria-label="Close">
              <IonIcon icon={close} />
            </button>
          </div>
          <div className="tafsir-source" aria-label="Tafsir source">
            <strong>{TAFSIR_SOURCE}</strong>
            <span>{TAFSIR_AUTHOR} · {TAFSIR_SOURCE_DETAIL} · English</span>
          </div>
          {isSurahView ? (
            <>
              <div className="tafsir-surah-details">
                <strong>{surah?.nameArabic}</strong>
                <span>Surah {surah?.number} · {surah?.totalAyahs} ayahs · {surah?.type}</span>
              </div>
              <div className="tafsir-body tafsir-surah-body">
                {isLoading ? <p>Loading {TAFSIR_SOURCE}...</p> : entries.length > 0 ? entries.map((entry) => (
                  <section key={entry.verse_key} className="tafsir-entry">
                    <h3>{entry.verse_key}</h3>
                    <p>{stripMarkup(entry.text ?? '')}</p>
                  </section>
                )) : <p>{TAFSIR_SOURCE} data is unavailable for Surah {surah?.number}.</p>}
              </div>
            </>
          ) : (
            <>
              {ayah && <p className="tafsir-ayah-text" dir="rtl">{ayah.text}</p>}
              <div className="tafsir-body">
                {isLoading ? <p>Loading {TAFSIR_SOURCE}...</p> : <p>{text || `${TAFSIR_SOURCE} data is unavailable for ${surah?.number}:${ayahNumber}.`}</p>}
              </div>
            </>
          )}
        </div>
      </IonContent>
    </IonModal>
  );
}
