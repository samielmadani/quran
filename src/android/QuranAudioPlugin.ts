import { registerPlugin, type PluginListenerHandle } from '@capacitor/core';

export interface QuranAudioEvent {
  surah: number;
  ayah: number;
  playing?: boolean;
  positionMs?: number;
  durationMs?: number;
}

export interface QuranAudioApi {
  initialize: () => Promise<void>;
  playAyah: (request: { surah: number; ayah: number; positionMs?: number }) => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  nextAyah: () => Promise<void>;
  previousAyah: () => Promise<void>;
  seekTo: (positionMs: number) => Promise<void>;
  getState: () => Promise<{ playing: boolean; surah: number; ayah: number; positionMs: number; durationMs: number }>;
  addListener: (eventName: string, listener: (event: QuranAudioEvent) => void) => Promise<PluginListenerHandle>;

  // Reciter management methods
  downloadSurah: (request: { reciterId: string; surah: number; url: string }) => Promise<{ success: boolean; bytes?: number }>;
  getDownloadedSurahs: (request: { reciterId: string }) => Promise<{ surahs: number[] }>;
  deleteReciter: (request: { reciterId: string }) => Promise<{ success: boolean }>;
  setActiveReciter: (request: { reciterId: string }) => Promise<{ success: boolean }>;
  getActiveReciter: () => Promise<{ reciterId: string }>;
  setTimingData: (request: { timingsJson: string }) => Promise<{ success: boolean }>;
  setRepeatMode: (request: { mode: string }) => Promise<{ success: boolean }>;
}

export const QuranAudio = registerPlugin<QuranAudioApi>('QuranAudio', {
  web: () => ({
    initialize: async () => undefined,
    playAyah: async () => undefined,
    pause: async () => undefined,
    resume: async () => undefined,
    nextAyah: async () => undefined,
    previousAyah: async () => undefined,
    seekTo: async () => undefined,
    getState: async () => ({ playing: false, surah: 1, ayah: 1, positionMs: 0, durationMs: 0 }),
    addListener: async () => ({ remove: async () => undefined }),
    downloadSurah: async () => ({ success: false }),
    getDownloadedSurahs: async () => ({ surahs: [] }),
    deleteReciter: async () => ({ success: true }),
    setActiveReciter: async () => ({ success: true }),
    getActiveReciter: async () => ({ reciterId: 'badr-al-turki' }),
    setTimingData: async () => ({ success: true }),
    setRepeatMode: async () => ({ success: true }),
  }),
});
