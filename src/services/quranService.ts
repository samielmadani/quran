import { getAyahReference, quranDataset } from '../data/quranData';
import { getReciterById, DEFAULT_RECITER_ID } from '../data/reciterRegistry';

export const quranService = {
  getSurahs: () => quranDataset.surahs,
  getSurah: (surahNumber: number) => quranDataset.surahs.find((surah) => surah.number === surahNumber) ?? quranDataset.surahs[0],
  getAyahText: (surahNumber: number, ayahNumber: number) => {
    const ayahRef = getAyahReference(surahNumber, ayahNumber);
    return ayahRef.ayah?.text ?? '';
  },
  getAudioFileName: (surahNumber: number, reciterId: string = DEFAULT_RECITER_ID) => {
    const reciter = getReciterById(reciterId);
    return reciter.audioUrlPattern(surahNumber);
  },
};
