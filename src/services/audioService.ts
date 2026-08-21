import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import type { AudioPlaybackRequest, AyahTiming, PlaybackState } from '../types/audio';

const DEFAULT_SURAH = 1;
const DEFAULT_AYAH = 1;

export class AudioService {
  private currentSurah = DEFAULT_SURAH;
  private currentAyah = DEFAULT_AYAH;
  private playing = false;
  private currentPositionMs = 0;
  private durationMs = 0;

  async initialize() {
    const state = await this.restoreState();
    this.currentSurah = state.surah;
    this.currentAyah = state.ayah;
    this.currentPositionMs = state.positionMs;
    this.durationMs = state.durationMs;
    this.playing = state.playing;
  }

  async playAyah(payload: AudioPlaybackRequest): Promise<void> {
    this.currentSurah = payload.surah;
    this.currentAyah = payload.ayah;
    this.playing = true;
    await this.persistState();
  }

  async pause() {
    this.playing = false;
    await this.persistState();
  }

  async resume() {
    this.playing = true;
    await this.persistState();
  }

  async nextAyah() {
    this.currentAyah += 1;
    await this.persistState();
  }

  async previousAyah() {
    this.currentAyah = Math.max(1, this.currentAyah - 1);
    await this.persistState();
  }

  async seekTo(positionMs: number) {
    this.currentPositionMs = Math.max(0, positionMs);
    await this.persistState();
  }

  getState(): PlaybackState {
    return {
      playing: this.playing,
      surah: this.currentSurah,
      ayah: this.currentAyah,
      positionMs: this.currentPositionMs,
      durationMs: this.durationMs,
    };
  }

  async loadTimingData(): Promise<AyahTiming[]> {
    return [];
  }

  private async persistState() {
    if (Capacitor.isNativePlatform()) {
      await Preferences.set({
        key: 'quran-playback-state',
        value: JSON.stringify(this.getState()),
      });
    }
  }

  private async restoreState(): Promise<PlaybackState> {
    if (!Capacitor.isNativePlatform()) {
      return {
        playing: false,
        surah: DEFAULT_SURAH,
        ayah: DEFAULT_AYAH,
        positionMs: 0,
        durationMs: 0,
      };
    }

    const result = await Preferences.get({ key: 'quran-playback-state' });
    if (!result.value) {
      return {
        playing: false,
        surah: DEFAULT_SURAH,
        ayah: DEFAULT_AYAH,
        positionMs: 0,
        durationMs: 0,
      };
    }

    try {
      return JSON.parse(result.value) as PlaybackState;
    } catch {
      return {
        playing: false,
        surah: DEFAULT_SURAH,
        ayah: DEFAULT_AYAH,
        positionMs: 0,
        durationMs: 0,
      };
    }
  }
}

export const audioService = new AudioService();
