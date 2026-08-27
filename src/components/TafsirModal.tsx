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

type TafsirSource = {
  id: number;
  name: string;
  author: string;
  language: 'ar' | 'en';
  languageLabel: string;
};

const TAFSIR_SOURCES: TafsirSource[] = [
  { id: 168, name: "Ma'arif al-Qur'an", author: 'Mufti Muhammad Shafi', language: 'en', languageLabel: 'English' },
  { id: 169, name: 'Tafsir Ibn Kathir (Abridged)', author: 'Hafiz Ibn Kathir', language: 'en', languageLabel: 'English' },
  { id: 14, name: 'Tafsir Ibn Kathir', author: 'Hafiz Ibn Kathir', language: 'ar', languageLabel: 'العربية' },
  { id: 16, name: 'Tafsir Muyassar', author: 'المیسر', language: 'ar', languageLabel: 'العربية' },
  { id: 91, name: 'Al-Sa\'di', author: 'Abd al-Rahman al-Sa\'di', language: 'ar', languageLabel: 'العربية' },
];

const TAFSIR_PREFERENCE_KEY = 'quran_tafsir_preferences';

const getSavedSourceId = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(TAFSIR_PREFERENCE_KEY) || '{}') as { sourceId?: number };
    return typeof saved.sourceId === 'number' ? saved.sourceId : 168;
  } catch {
    return 168;
  }
};

const sanitizeTafsirMarkup = (value: string) => {
  const document = new DOMParser().parseFromString(value, 'text/html');
  document.querySelectorAll('script, style, iframe, object, embed, link').forEach((element) => element.remove());
  document.body.querySelectorAll('*').forEach((element) => {
    Array.from(element.attributes).forEach((attribute) => {
      if (attribute.name !== 'style') {
        element.removeAttribute(attribute.name);
        return;
      }

      const allowedStyles = attribute.value
        .split(';')
        .filter((declaration) => /^(font-size|font-weight|font-style|text-align|direction)\s*:/i.test(declaration))
        .join(';');
      if (allowedStyles) element.setAttribute('style', allowedStyles);
      else element.removeAttribute('style');
    });
  });
  return document.body.innerHTML.trim();
};

export function TafsirModal({ isOpen, surah, ayahNumber, onClose }: TafsirModalProps) {
  const [text, setText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pageAyah, setPageAyah] = useState(ayahNumber ?? 1);
  const [sourceId, setSourceId] = useState(getSavedSourceId);
  const ayah = surah?.ayahs.find((item) => item.number === pageAyah);
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
    if (isOpen) setPageAyah(ayahNumber ?? 1);
  }, [isOpen, ayahNumber, surah?.number]);

  useEffect(() => {
    if (!isOpen || !surah) return;

    const controller = new AbortController();
    let active = true;
    setText('');
    setIsLoading(true);
    const endpoint = `https://api.quran.com/api/v4/tafsirs/${selectedSource.id}/by_ayah/${surah.number}:${pageAyah}`;
    fetch(endpoint, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error('Tafsir request failed');
        const data = await response.json() as {
          tafsir?: { text?: string };
        };
        if (active) setText(sanitizeTafsirMarkup(data.tafsir?.text ?? ''));
      })
      .catch((error: unknown) => {
        if (active && (error as { name?: string }).name !== 'AbortError') {
          setText(`Tafsir could not be loaded from ${selectedSource.name}. Please check your connection and try again.`);
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [isOpen, surah, pageAyah, selectedSource]);

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onClose} breakpoints={[0, 0.16, 0.96, 1]} initialBreakpoint={1} handle className="quran-sheet-modal tafsir-modal">
      <IonContent className="sheet-content">
        <div
          className="modal-surface tafsir-surface"
          dir={selectedSource.language === 'ar' ? 'rtl' : 'ltr'}
          onKeyDown={(event) => {
            if (event.key === 'ArrowLeft' && pageAyah < (surah?.totalAyahs ?? 1)) {
              setPageAyah((value) => Math.min(surah?.totalAyahs ?? value, value + 1));
            } else if (event.key === 'ArrowRight' && pageAyah > 1) {
              setPageAyah((value) => Math.max(1, value - 1));
            }
          }}
        >
          <div className="modal-heading">
            <h2>{surah?.englishName} ({surah?.nameTransliteration})</h2>
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
          <div className="tafsir-surah-details">
            <strong>{surah?.nameArabic}</strong>
            <span>Surah {surah?.number} · Ayah {pageAyah} of {surah?.totalAyahs} · {surah?.type}</span>
          </div>
          {ayah && <p className="tafsir-ayah-text" dir="rtl">{ayah.text}</p>}
          <div className="tafsir-navigation" dir="ltr">
            <button type="button" disabled={pageAyah <= 1} onClick={() => setPageAyah((value) => Math.max(1, value - 1))}>‹ Previous</button>
            <label className="tafsir-ayah-select">
              <select value={pageAyah} onChange={(event) => setPageAyah(Number(event.target.value))} aria-label="Jump to ayah">
                {surah?.ayahs.map((item) => <option key={item.number} value={item.number}>{item.number} of {surah.totalAyahs}</option>)}
              </select>
            </label>
            <button type="button" disabled={pageAyah >= (surah?.totalAyahs ?? 1)} onClick={() => setPageAyah((value) => Math.min(surah?.totalAyahs ?? value, value + 1))}>Next ›</button>
          </div>
          <div className="tafsir-body">
            {isLoading ? <p>Loading {selectedSource.name}...</p> : text ? <div dangerouslySetInnerHTML={{ __html: text }} /> : <p>{`${selectedSource.name} data is unavailable for ${surah?.number}:${pageAyah}.`}</p>}
          </div>
        </div>
      </IonContent>
    </IonModal>
  );
}
