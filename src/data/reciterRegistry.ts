import { badrAlTurkiTimings } from './badrAlTurkiTimings';
import { mishariAlafasyTimings } from './mishariAlafasyTimings';
import { mahmoudAlHusaryTimings } from './mahmoudAlHusaryTimings';
import { abdulBasitTimings } from './abdulBasitTimings';
import type { AyahTiming } from '../types/audio';

export interface Reciter {
  id: string;
  name: string;
  nameArabic: string;
  style: string;
  description?: string;
  totalSurahs: number;
  audioUrlPattern: (surahNumber: number) => string;
  timings?: Record<number, Record<number, AyahTiming>>;
  approxSizeBytes?: number;
}

export const RECITERS: Reciter[] = [
  {
    id: 'badr-al-turki',
    name: 'Badr Al-Turki',
    nameArabic: 'بدر التركي',
    style: 'Murattal',
    description: 'High-quality Murattal recitation with word/ayah synchronized timing data.',
    totalSurahs: 114,
    audioUrlPattern: (surahNumber: number) =>
      `https://server10.mp3quran.net/bader/Rewayat-Hafs-A-n-Assem/${String(surahNumber).padStart(3, '0')}.mp3`,
    timings: badrAlTurkiTimings,
    approxSizeBytes: 1461018426,
  },
  {
    id: 'mishari-alafasy',
    name: 'Mishary Rashid Alafasy',
    nameArabic: 'مشاري راشد العفاسي',
    style: 'Murattal',
    description: 'World-renowned recitation by Sheikh Mishary Rashid Alafasy.',
    totalSurahs: 114,
    audioUrlPattern: (surahNumber: number) =>
      `https://download.quranicaudio.com/qdc/mishari_al_afasy/murattal/${surahNumber}.mp3`,
    timings: mishariAlafasyTimings,
    approxSizeBytes: 890000000,
  },
  {
    id: 'mahmoud-al-husary',
    name: 'Mahmoud Khalil Al-Husary',
    nameArabic: 'محمود خليل الحصري',
    style: 'Murattal',
    description: 'Standard tajweed reference recitation by Sheikh Mahmoud Khalil Al-Husary.',
    totalSurahs: 114,
    audioUrlPattern: (surahNumber: number) =>
      `https://download.quranicaudio.com/qdc/khalil_al_husary/murattal/${surahNumber}.mp3`,
    timings: mahmoudAlHusaryTimings,
    approxSizeBytes: 950000000,
  },
  {
    id: 'abdul-basit-murattal',
    name: 'Abdul Basit Abdul Samad',
    nameArabic: 'عبد الباسط عبد الصمد',
    style: 'Murattal',
    description: 'Classic Murattal recitation by Sheikh Abdul Basit Abdul Samad.',
    totalSurahs: 114,
    audioUrlPattern: (surahNumber: number) =>
      `https://download.quranicaudio.com/qdc/abdul_baset/murattal/${surahNumber}.mp3`,
    timings: abdulBasitTimings,
    approxSizeBytes: 920000000,
  },
];

export const DEFAULT_RECITER_ID = 'badr-al-turki';

export const getReciterById = (reciterId: string): Reciter => {
  return RECITERS.find((r) => r.id === reciterId) ?? RECITERS[0];
};
