import { useEffect, useMemo, useState } from 'react';
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

type TafsirSource = {
  id: number;
  name: string;
  author: string;
  language: 'ar' | 'en';
  languageLabel: string;
};

const TAFSIR_SOURCES: TafsirSource[] = [
  { id: 169, name: 'Tafsir Ibn Kathir (Abridged)', author: 'Hafiz Ibn Kathir', language: 'en', languageLabel: 'English' },
  { id: 168, name: "Ma'arif al-Qur'an", author: 'Mufti Muhammad Shafi', language: 'en', languageLabel: 'English' },
  { id: 14, name: 'Tafsir Ibn Kathir', author: 'Hafiz Ibn Kathir', language: 'ar', languageLabel: 'العربية' },
  { id: 16, name: 'Tafsir Muyassar', author: 'المیسر', language: 'ar', languageLabel: 'العربية' },
  { id: 91, name: 'Al-Sa\'di', author: 'Abd al-Rahman al-Sa\'di', language: 'ar', languageLabel: 'العربية' },
];

const TAFSIR_PREFERENCE_KEY = 'quran_tafsir_preferences';

const getSavedSourceId = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(TAFSIR_PREFERENCE_KEY) || '{}') as { sourceId?: number };
    return typeof saved.sourceId === 'number' ? saved.sourceId : 169;
  } catch {
    return 169;
  }
};

const stripMarkup = (value: string) => value.replace(/<[^>]+>/g, '').trim();

export function TafsirModal({ isOpen, surah, ayahNumber, mode = 'ayah', onClose }: TafsirModalProps) {
  const [text, setText] = useState('');
  const [entries, setEntries] = useState<TafsirEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sourceId, setSourceId] = useState(getSavedSourceId);
  const ayah = surah?.ayahs.find((item) => item.number === ayahNumber);
  const isSurahView = mode === 'surah';
  const selectedSource = TAFSIR_SOURCES.find((source) => source.id === sourceId) ?? TAFSIR_SOURCES[0];
  const languageSources = useMemo(
    () => TAFSIR_SOURCES.filter((source) => source.language === selectedSource.language),
    [selectedSource.language],
  );

  const selectSource = (nextSourceId: number) => {
    setSourceId(nextSourceId);
    localStorage.setItem(TAFSIR_PREFERENCE_KEY, JSON.stringify({ sourceId: nextSourceId }));
  };

  const selectLanguage = (language: TafsirSource['language']) => {
    const nextSource = TAFSIR_SOURCES.find((source) => source.language === language);
    if (nextSource) selectSource(nextSource.id);
  };

  useEffect(() => {
    if (!isOpen || !surah || (!isSurahView && ayahNumber === null)) return;

    const controller = new AbortController();
    setText('');
    setEntries([]);
    setIsLoading(true);
    const endpoint = isSurahView
      ? `https://api.quran.com/api/v4/tafsirs/${selectedSource.id}/by_chapter/${surah.number}`
      : `https://api.quran.com/api/v4/tafsirs/${selectedSource.id}/by_ayah/${surah.number}:${ayahNumber}`;
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
          setText(`Tafsir could not be loaded from ${selectedSource.name}. Please check your connection and try again.`);
        }
      })
      .finally(() => setIsLoading(false));

    return () => controller.abort();
  }, [isOpen, isSurahView, surah, ayahNumber, selectedSource]);

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onClose} breakpoints={[0, 0.16, 0.96, 1]} initialBreakpoint={0.96} handle className="quran-sheet-modal tafsir-modal">
      <IonContent className="sheet-content">
        <div className="modal-surface tafsir-surface" dir={selectedSource.language === 'ar' ? 'rtl' : 'ltr'}>
          <div className="modal-heading">
            <h2>{isSurahView ? surah?.nameTransliteration : `${surah?.nameTransliteration} ${ayahNumber}`}</h2>
            <button className="icon-button" type="button" onClick={onClose} aria-label="Close">
              <IonIcon icon={close} />
            </button>
          </div>
          <div className="tafsir-source" aria-label="Tafsir source">
            <strong>{selectedSource.name}</strong>
            <span>{selectedSource.author} · Quran.com Tafsir API, resource {selectedSource.id} · {selectedSource.languageLabel}</span>
          </div>
          <div className="tafsir-source-controls" aria-label="Tafsir language and source">
            <div className="tafsir-language-toggle" role="group" aria-label="Tafsir language">
              <button type="button" className={selectedSource.language === 'ar' ? 'selected' : ''} onClick={() => selectLanguage('ar')}>العربية</button>
              <button type="button" className={selectedSource.language === 'en' ? 'selected' : ''} onClick={() => selectLanguage('en')}>English</button>
            </div>
            <label className="tafsir-source-select">
              <span>Source</span>
              <select value={selectedSource.id} onChange={(event) => selectSource(Number(event.target.value))}>
                {languageSources.map((source) => <option key={source.id} value={source.id}>{source.name} · {source.author}</option>)}
              </select>
            </label>
          </div>
          {isSurahView ? (
            <>
              <div className="tafsir-surah-details">
                <strong>{surah?.nameArabic}</strong>
                <span>Surah {surah?.number} · {surah?.totalAyahs} ayahs · {surah?.type}</span>
              </div>
              <div className="tafsir-body tafsir-surah-body">
                {isLoading ? <p>Loading {selectedSource.name}...</p> : entries.length > 0 ? entries.map((entry) => (
                  <section key={entry.verse_key} className="tafsir-entry">
                    <h3>{entry.verse_key}</h3>
                    <p>{stripMarkup(entry.text ?? '')}</p>
                  </section>
                )) : <p>{selectedSource.name} data is unavailable for Surah {surah?.number}.</p>}
              </div>
            </>
          ) : (
            <>
              {ayah && <p className="tafsir-ayah-text" dir="rtl">{ayah.text}</p>}
              <div className="tafsir-body">
                {isLoading ? <p>Loading {selectedSource.name}...</p> : <p>{text || `${selectedSource.name} data is unavailable for ${surah?.number}:${ayahNumber}.`}</p>}
              </div>
            </>
          )}
        </div>
      </IonContent>
    </IonModal>
  );
}
