import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { badrAlTurkiTimings, resolveAudioUrl } from '../data/timingData';
import type { AudioPlaybackRequest, PlaybackState } from '../types/audio';

const DEFAULT_SURAH = 1;
const DEFAULT_AYAH = 1;

export class AudioService {
  private currentSurah = DEFAULT_SURAH;
  private currentAyah = DEFAULT_AYAH;
  private playing = false;
  private currentPositionMs = 0;
  private durationMs = 0;
  private readonly audio = typeof Audio === 'undefined' ? null : new Audio();
  private readonly listeners = new Set<(state: PlaybackState) => void>();

  constructor() {
    this.audio?.addEventListener('timeupdate', () => {
      this.currentPositionMs = this.audio ? this.audio.currentTime * 1000 : 0;
      const ayah = this.findAyahAt(this.currentPositionMs);
      if (ayah !== undefined && ayah !== this.currentAyah) {
        this.currentAyah = ayah;
        this.notify();
        void this.persistState();
      }
    });
    this.audio?.addEventListener('loadedmetadata', () => {
      this.durationMs = this.audio ? this.audio.duration * 1000 : 0;
    });
    this.audio?.addEventListener('ended', () => {
      this.playing = false;
      this.notify();
      void this.persistState();
    });
  }

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
    if (this.audio) {
      this.audio.src = resolveAudioUrl(payload.surah);
      const timing = badrAlTurkiTimings[payload.surah]?.[payload.ayah];
      if (!timing) throw new Error(`Missing timing for ${payload.surah}:${payload.ayah}`);
      this.audio.currentTime = timing.startMs / 1000;
      await this.audio.play();
    }
    this.playing = true;
    this.notify();
    await this.persistState();
  }

  async pause() {
    this.audio?.pause();
    this.playing = false;
    this.notify();
    await this.persistState();
  }

  async resume() {
    if (this.audio) {
      if (!this.audio.src) {
        this.audio.src = resolveAudioUrl(this.currentSurah);
      }
      await this.audio.play();
    }
    this.playing = true;
    this.notify();
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
    if (this.audio) {
      this.audio.currentTime = this.currentPositionMs / 1000;
    }
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

  subscribe(listener: (state: PlaybackState) => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private findAyahAt(currentMs: number) {
    const timings = badrAlTurkiTimings[this.currentSurah];
    if (!timings) return undefined;
    const ayahs = Object.entries(timings).sort(([left], [right]) => Number(left) - Number(right));
    for (const [ayahText, timing] of ayahs) {
      if (timing.startMs <= currentMs && currentMs < timing.endMs) return Number(ayahText);
    }
    return undefined;
  }

  private notify() {
    const state = this.getState();
    for (const listener of this.listeners) listener(state);
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
