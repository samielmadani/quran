import { badrAlTurkiTimings } from './badrAlTurkiTimings';
import { mishariAlafasyTimings } from './mishariAlafasyTimings';
import { mahmoudAlHusaryTimings } from './mahmoudAlHusaryTimings';
import { abdulBasitTimings } from './abdulBasitTimings';
import { muhammadSiddiqAlMinshawiTimings } from './muhammadSiddiqAlMinshawiTimings';
import { abuBakrAlShatriTimings } from './abuBakrAlShatriTimings';
import { abdulRahmanAlSudaisTimings } from './abdulRahmanAlSudaisTimings';
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
  {
    id: 'muhammad-siddiq-al-minshawi',
    name: 'Muhammad Siddiq Al-Minshawi',
    nameArabic: 'محمد صديق المنشاوي',
    style: 'Murattal',
    description: 'Moving Murattal recitation by Sheikh Muhammad Siddiq Al-Minshawi.',
    totalSurahs: 114,
    audioUrlPattern: (surahNumber: number) =>
      `https://download.quranicaudio.com/qdc/siddiq_minshawi/murattal/${surahNumber}.mp3`,
    timings: muhammadSiddiqAlMinshawiTimings,
    approxSizeBytes: 900000000,
  },
  {
    id: 'maher-al-muaiqly',
    name: 'Maher Al-Muaiqly',
    nameArabic: 'ماهر المعيقلي',
    style: 'Murattal',
    description: 'Clear Murattal recitation by Sheikh Maher Al-Muaiqly.',
    totalSurahs: 114,
    audioUrlPattern: (surahNumber: number) =>
      `https://server12.mp3quran.net/maher/${String(surahNumber).padStart(3, '0')}.mp3`,
    approxSizeBytes: 900000000,
  },
  {
    id: 'yasser-al-dosari',
    name: 'Yasser Al-Dosari',
    nameArabic: 'ياسر الدوسري',
    style: 'Murattal',
    description: 'Expressive Murattal recitation by Sheikh Yasser Al-Dosari.',
    totalSurahs: 114,
    audioUrlPattern: (surahNumber: number) =>
      `https://server11.mp3quran.net/yasser/${String(surahNumber).padStart(3, '0')}.mp3`,
    approxSizeBytes: 900000000,
  },
  {
    id: 'saad-al-ghamdi',
    name: 'Saad Al-Ghamdi',
    nameArabic: 'سعد الغامدي',
    style: 'Murattal',
    description: 'Well-known Murattal recitation by Sheikh Saad Al-Ghamdi.',
    totalSurahs: 114,
    audioUrlPattern: (surahNumber: number) =>
      `https://server7.mp3quran.net/s_gmd/${String(surahNumber).padStart(3, '0')}.mp3`,
    approxSizeBytes: 900000000,
  },
  {
    id: 'abu-bakr-al-shatri',
    name: 'Abu Bakr Al-Shatri',
    nameArabic: 'أبو بكر الشاطري',
    style: 'Murattal',
    description: 'Distinctive Murattal recitation by Sheikh Abu Bakr Al-Shatri.',
    totalSurahs: 114,
    audioUrlPattern: (surahNumber: number) =>
      `https://download.quranicaudio.com/qdc/abu_bakr_shatri/murattal/${surahNumber}.mp3`,
    timings: abuBakrAlShatriTimings,
    approxSizeBytes: 900000000,
  },
  {
    id: 'nasser-al-qatami',
    name: 'Nasser Al-Qatami',
    nameArabic: 'ناصر القطامي',
    style: 'Murattal',
    description: 'Measured Murattal recitation by Sheikh Nasser Al-Qatami.',
    totalSurahs: 114,
    audioUrlPattern: (surahNumber: number) =>
      `https://server6.mp3quran.net/qtm/${String(surahNumber).padStart(3, '0')}.mp3`,
    approxSizeBytes: 900000000,
  },
  {
    id: 'abdullah-awad-al-juhany',
    name: 'Abdullah Awad Al-Juhany',
    nameArabic: 'عبد الله عواد الجهني',
    style: 'Murattal',
    description: 'Melodious Murattal recitation by Sheikh Abdullah Awad Al-Juhany.',
    totalSurahs: 114,
    audioUrlPattern: (surahNumber: number) =>
      `https://server13.mp3quran.net/jhn/${String(surahNumber).padStart(3, '0')}.mp3`,
    approxSizeBytes: 900000000,
  },
  {
    id: 'abdul-rahman-al-sudais',
    name: 'Abdul Rahman Al-Sudais',
    nameArabic: 'عبد الرحمن السديس',
    style: 'Murattal',
    description: 'Renowned Murattal recitation by Sheikh Abdul Rahman Al-Sudais.',
    totalSurahs: 114,
    audioUrlPattern: (surahNumber: number) =>
      `https://download.quranicaudio.com/qdc/abdurrahmaan_as_sudais/murattal/${surahNumber}.mp3`,
    timings: abdulRahmanAlSudaisTimings,
    approxSizeBytes: 900000000,
  },
  {
    id: 'fares-abbad',
    name: 'Fares Abbad',
    nameArabic: 'فارس عباد',
    style: 'Murattal',
    description: 'Distinctive Murattal recitation by Sheikh Fares Abbad.',
    totalSurahs: 114,
    audioUrlPattern: (surahNumber: number) =>
      `https://server8.mp3quran.net/frs_a/${String(surahNumber).padStart(3, '0')}.mp3`,
    approxSizeBytes: 900000000,
  },
  {
    id: 'ahmed-al-ajmi',
    name: 'Ahmed Al-Ajmi',
    nameArabic: 'أحمد العجمي',
    style: 'Murattal',
    description: 'Clear Murattal recitation by Sheikh Ahmed Al-Ajmi.',
    totalSurahs: 114,
    audioUrlPattern: (surahNumber: number) =>
      `https://server10.mp3quran.net/ajm/${String(surahNumber).padStart(3, '0')}.mp3`,
    approxSizeBytes: 900000000,
  },
];

export const DEFAULT_RECITER_ID = 'badr-al-turki';

export const getReciterById = (reciterId: string): Reciter => {
  return RECITERS.find((r) => r.id === reciterId) ?? RECITERS[0];
};
