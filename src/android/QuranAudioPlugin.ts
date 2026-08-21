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
  playAyah: (request: { surah: number; ayah: number }) => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  nextAyah: () => Promise<void>;
  previousAyah: () => Promise<void>;
  seekTo: (positionMs: number) => Promise<void>;
  getState: () => Promise<{ playing: boolean; surah: number; ayah: number; positionMs: number; durationMs: number }>;
  addListener: (eventName: string, listener: (event: QuranAudioEvent) => void) => Promise<PluginListenerHandle>;
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
  }),
});
