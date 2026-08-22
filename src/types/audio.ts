export type AyahTiming = {
  startMs: number;
  endMs: number;
};

export type RepeatMode =
  | 'continuous'     // Autoplay through ayahs and next surahs
  | 'repeat_single'  // Repeat current ayah (1x loop)
  | 'repeat_surah'   // Repeat current surah (loops whole surah)
  | 'off';           // Stop after current ayah finishes

export type SleepTimerMode =
  | 'off'
  | '5min'
  | '15min'
  | '30min'
  | 'end_of_surah'
  | 'end_of_ayah';

export type RecentItem = {
  surah: number;
  ayah: number;
  reciterId: string;
  timestamp: number;
};

export type PlaybackState = {
  playing: boolean;
  surah: number;
  ayah: number;
  positionMs: number;
  durationMs: number;
  repeatMode?: RepeatMode;
  sleepTimerMode?: SleepTimerMode;
  sleepTimerRemainingSec?: number | null;
};

export type AudioPlaybackRequest = {
  surah: number;
  ayah: number;
  positionMs?: number;
};

export type AppSettings = {
  pinned: boolean;
  showPrevNext: boolean;
  swapPrevNext: boolean;
  autoScroll: boolean;
  textSize: number;
  repeatMode: RepeatMode;
  sleepTimerMode: SleepTimerMode;
  showRecentlyPlayed: boolean;
  enableBookmarks: boolean;
  bookmarkedSurahs: number[];
};
