export { badrAlTurkiTimings } from './badrAlTurkiTimings';

export const resolveAudioUrl = (surahNumber: number) => {
  const padded = String(surahNumber).padStart(3, '0');
  return `/assets/audio/badr-al-turki/${padded}.mp3`;
};
