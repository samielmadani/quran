import { useEffect, useMemo, useRef, useState } from 'react';
import { quranService } from '../services/quranService';
import { audioService } from '../services/audioService';

const DEFAULT_SURAH = 1;
const DEFAULT_AYAH = 1;

export function useQuranApp() {
  const [currentSurah, setCurrentSurah] = useState(DEFAULT_SURAH);
  const [currentAyah, setCurrentAyah] = useState(DEFAULT_AYAH);
  const [isPlaying, setIsPlaying] = useState(false);
  const [positionMs, setPositionMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);
  const [textSize, setTextSize] = useState(2.8);
  const [autoScroll, setAutoScroll] = useState(true);
  const [surahListOpen, setSurahListOpen] = useState(false);
  const viewRef = useRef<HTMLDivElement | null>(null);

  const surahs = useMemo(() => quranService.getSurahs(), []);

  useEffect(() => {
    const unsubscribe = audioService.subscribe((nextState) => {
      setCurrentSurah(nextState.surah);
      setCurrentAyah(nextState.ayah);
      setIsPlaying(nextState.playing);
      setPositionMs(nextState.positionMs);
      setDurationMs(nextState.durationMs);
    });
    void audioService.initialize();
    const state = audioService.getState();
    setCurrentSurah(state.surah);
    setCurrentAyah(state.ayah);
    setIsPlaying(state.playing);
    setPositionMs(state.positionMs);
    setDurationMs(state.durationMs);
    return unsubscribe;
  }, []);

  useEffect(() => {
    const reading = viewRef.current;
    if (!autoScroll || !reading) {
      return;
    }

    const target = reading.querySelector<HTMLElement>(`#ayah-${currentSurah}-${currentAyah}`);
    if (!target) {
      return;
    }

    const targetTop = target.getBoundingClientRect().top - reading.getBoundingClientRect().top + reading.scrollTop - (reading.clientHeight - target.offsetHeight) / 2;
    reading.scrollTo({
      top: Math.max(0, targetTop),
      behavior: 'smooth',
    });
  }, [currentSurah, currentAyah, autoScroll]);

  const handleSelectAyah = (surahNumber: number, ayahNumber: number) => {
    setCurrentSurah(surahNumber);
    setCurrentAyah(ayahNumber);
    void audioService.playAyah({ surah: surahNumber, ayah: ayahNumber });
    setIsPlaying(true);
  };

  const handlePlayPause = async () => {
    if (isPlaying) {
      await audioService.pause();
      setIsPlaying(false);
      return;
    }

    await audioService.resume();
    setIsPlaying(true);
  };

  const handleNextAyah = async () => {
    const surah = quranService.getSurah(currentSurah);
    const nextAyah = currentAyah + 1;

    if (nextAyah <= surah.totalAyahs) {
      await audioService.playAyah({ surah: currentSurah, ayah: nextAyah });
      setCurrentAyah(nextAyah);
      setIsPlaying(true);
      return;
    }

    const nextSurah = Math.min(currentSurah + 1, surahs.length);
    const targetSurah = quranService.getSurah(nextSurah);
    await audioService.playAyah({ surah: nextSurah, ayah: 1 });
    setCurrentSurah(nextSurah);
    setCurrentAyah(1);
    setIsPlaying(true);
    if (targetSurah.totalAyahs < 1) {
      setCurrentAyah(1);
    }
  };

  const handlePreviousAyah = async () => {
    if (currentAyah > 1) {
      const previousAyah = currentAyah - 1;
      await audioService.playAyah({ surah: currentSurah, ayah: previousAyah });
      setCurrentAyah(previousAyah);
      setIsPlaying(true);
      return;
    }

    if (currentSurah > 1) {
      const previousSurah = currentSurah - 1;
      const targetSurah = quranService.getSurah(previousSurah);
      await audioService.playAyah({ surah: previousSurah, ayah: targetSurah.totalAyahs });
      setCurrentSurah(previousSurah);
      setCurrentAyah(targetSurah.totalAyahs);
      setIsPlaying(true);
    }
  };

  return {
    surahs,
    currentSurah,
    currentAyah,
    isPlaying,
    positionMs,
    durationMs,
    textSize,
    autoScroll,
    surahListOpen,
    viewRef,
    setTextSize,
    setAutoScroll,
    setSurahListOpen,
    setCurrentSurah,
    setCurrentAyah,
    handleSelectAyah,
    handlePlayPause,
    handleNextAyah,
    handlePreviousAyah,
  };
}
