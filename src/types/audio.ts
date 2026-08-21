export type AyahTiming = {
  surah: number;
  ayah: number;
  startMs: number;
  endMs: number;
};

export type PlaybackState = {
  playing: boolean;
  surah: number;
  ayah: number;
  positionMs: number;
  durationMs: number;
};

export type AudioPlaybackRequest = {
  surah: number;
  ayah: number;
};
