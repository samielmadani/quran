import { getAyahReference, quranDataset } from '../data/quranData';

export const quranService = {
  getSurahs: () => quranDataset.surahs,
  getSurah: (surahNumber: number) => quranDataset.surahs.find((surah) => surah.number === surahNumber) ?? quranDataset.surahs[0],
  getAyahText: (surahNumber: number, ayahNumber: number) => {
    const ayahRef = getAyahReference(surahNumber, ayahNumber);
    return ayahRef.ayah?.text ?? '';
  },
  getAudioFileName: (surahNumber: number) => `assets/audio/badr-al-turki/${String(surahNumber).padStart(3, '0')}.mp3`,
};
