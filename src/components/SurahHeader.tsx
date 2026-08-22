import type { Surah } from '../data/quranData';
import { getSurahJuzNumber } from '../data/juzData';

interface SurahHeaderProps {
  surah: Surah;
  onOpenSurahPicker?: () => void;
}

const toArabicNumerals = (value: number) =>
  String(value).replace(/\d/g, (digit) => '٠١٢٣٤٥٦٧٨٩'[Number(digit)]);

export function SurahHeader({ surah, onOpenSurahPicker }: SurahHeaderProps) {
  const juz = getSurahJuzNumber(surah.number);
  const isMeccan = surah.type?.toLowerCase().includes('mecc') || surah.type?.toLowerCase().includes('makk');
  const revelationLabel = isMeccan ? 'Meccan • مكية' : 'Medinan • مدنية';

  return (
    <header className="surah-header-banner" role="banner" onClick={onOpenSurahPicker}>
      <div className="surah-header-ornament-top">
        <span className="ornament-line" />
        <span className="ornament-gem">۞</span>
        <span className="ornament-line" />
      </div>

      <div className="surah-header-main">
        <h1 className="surah-header-title-arabic" lang="ar" dir="rtl">
          سُورَةُ {surah.nameArabic.replace(/^سُورَةُ\s+|^سورة\s+/i, '')}
        </h1>
        <div className="surah-header-sub">
          <span className="surah-transliteration">{surah.nameTransliteration}</span>
        </div>
      </div>

      <div className="surah-header-badges">
        <span className="surah-badge">Surah {toArabicNumerals(surah.number)} ({surah.number})</span>
        <span className="surah-badge">{toArabicNumerals(surah.totalAyahs)} Ayahs</span>
        <span className="surah-badge">Juz&apos; {toArabicNumerals(juz)}</span>
        <span className="surah-badge revelation-badge">{revelationLabel}</span>
      </div>

      <div className="surah-header-ornament-bottom">
        <span className="ornament-line" />
        <span className="ornament-diamond">◆</span>
        <span className="ornament-line" />
      </div>
    </header>
  );
}
