import { getSurahByNumber } from './quranData';

const juzStarts: Array<[number, number]> = [
  [1, 1], [2, 142], [2, 253], [3, 93], [4, 24], [4, 148],
  [5, 82], [6, 111], [7, 88], [8, 41], [9, 93], [11, 6],
  [12, 53], [15, 1], [17, 1], [18, 75], [21, 1], [23, 1],
  [25, 21], [27, 56], [29, 46], [33, 31], [36, 28], [39, 32],
  [41, 47], [46, 1], [51, 31], [58, 1], [67, 1], [78, 1],
];

export function getJuzNumber(surahNumber: number, ayahNumber: number): number {
  let juz = 1;
  for (const [startSurah, startAyah] of juzStarts) {
    if (surahNumber > startSurah || (surahNumber === startSurah && ayahNumber >= startAyah)) {
      juz += 1;
    } else {
      break;
    }
  }
  return Math.min(30, juz - 1);
}

export function getSurahJuzNumber(surahNumber: number): number {
  return getJuzNumber(surahNumber, getSurahByNumber(surahNumber).ayahs[0]?.number ?? 1);
}
