import quranData from 'quran-json/dist/quran.json';

export type Ayah = {
  number: number;
  text: string;
};

export type Surah = {
  number: number;
  nameArabic: string;
  nameTransliteration: string;
  englishName: string;
  type: string;
  totalAyahs: number;
  ayahs: Ayah[];
};

export type QuranDataset = {
  surahs: Surah[];
};

const raw = quranData as Array<{
  id: number;
  name: string;
  transliteration: string;
  type: string;
  total_verses: number;
  verses: Array<{ id: number; text: string }>;
}>;

export const quranDataset: QuranDataset = {
  surahs: raw.map((surah) => ({
    number: surah.id,
    nameArabic: surah.name,
    nameTransliteration: surah.transliteration,
    englishName: surah.transliteration,
    type: surah.type || 'meccan',
    totalAyahs: surah.total_verses,
    ayahs: surah.verses.map((ayah) => ({
      number: ayah.id,
      text: ayah.text,
    })),
  })),
};

export const totalSurahs = quranDataset.surahs.length;

export const getSurahByNumber = (surahNumber: number) =>
  quranDataset.surahs.find((surah) => surah.number === surahNumber) ?? quranDataset.surahs[0];

export const getAyahReference = (surahNumber: number, ayahNumber: number) => {
  const surah = getSurahByNumber(surahNumber);
  const ayah = surah.ayahs.find((item) => item.number === ayahNumber);

  return { surah, ayah };
};
