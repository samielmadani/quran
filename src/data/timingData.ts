export const badrTimingData = {
  reciter: 'Badr Al-Turki',
  status: 'local-metadata-ready-for-supply',
  surahs: [],
} as const;

export const resolveAudioUrl = (surahNumber: number) => {
  const padded = String(surahNumber).padStart(3, '0');
  return `/assets/audio/badr-al-turki/${padded}.mp3`;
};
