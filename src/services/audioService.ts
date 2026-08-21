import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { QuranAudio } from '../android/QuranAudioPlugin';
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
  private pendingSeekMs: number | null = null;
  private progressFrame: number | null = null;
  private readonly audio = typeof Audio === 'undefined' ? null : new Audio();
  private readonly listeners = new Set<(state: PlaybackState) => void>();

  constructor() {
    this.audio?.addEventListener('timeupdate', () => {
      this.currentPositionMs = this.audio ? this.audio.currentTime * 1000 : 0;
      if (this.pendingSeekMs !== null) {
        if (this.currentPositionMs < this.pendingSeekMs) return;
        this.pendingSeekMs = null;
      }
      const ayah = this.findAyahAt(this.currentPositionMs);
      if (ayah !== undefined && ayah !== this.currentAyah) {
        this.currentAyah = ayah;
        this.notify();
        void this.persistState();
      }
    });
    this.audio?.addEventListener('loadedmetadata', () => {
      this.durationMs = this.audio ? this.audio.duration * 1000 : 0;
      if (this.audio && this.pendingSeekMs !== null) {
        this.audio.currentTime = this.pendingSeekMs / 1000;
      }
    });
    this.audio?.addEventListener('canplay', () => {
      if (this.audio && this.pendingSeekMs !== null) {
        this.audio.currentTime = this.pendingSeekMs / 1000;
      }
    });
    this.audio?.addEventListener('play', () => {
      this.startProgressLoop();
    });
    this.audio?.addEventListener('playing', () => {
      this.startProgressLoop();
      if (this.audio && this.pendingSeekMs !== null && this.audio.currentTime * 1000 < this.pendingSeekMs) {
        this.audio.currentTime = this.pendingSeekMs / 1000;
      }
    });
    this.audio?.addEventListener('pause', () => {
      this.stopProgressLoop();
    });
    this.audio?.addEventListener('ended', () => {
      this.stopProgressLoop();
      this.playing = false;
      this.notify();
      void this.persistState();
    });
  }

  async initialize() {
    if (Capacitor.isNativePlatform()) {
      await QuranAudio.initialize();
      const state = await QuranAudio.getState();
      this.applyNativeState(state);
      await QuranAudio.addListener('playbackStateChanged', (nextState) => {
        this.applyNativeState({
          playing: nextState.playing ?? false,
          surah: nextState.surah,
          ayah: nextState.ayah,
          positionMs: nextState.positionMs ?? 0,
          durationMs: nextState.durationMs ?? 0,
        });
      });
      return;
    }
    const state = await this.restoreState();
    this.currentSurah = state.surah;
    this.currentAyah = state.ayah;
    this.currentPositionMs = state.positionMs;
    this.durationMs = state.durationMs;
    this.playing = state.playing;
  }

  async playAyah(payload: AudioPlaybackRequest): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      await QuranAudio.playAyah(payload);
      return;
    }
    this.currentSurah = payload.surah;
    this.currentAyah = payload.ayah;
    if (this.audio) {
      const timing = badrAlTurkiTimings[payload.surah]?.[payload.ayah];
      if (!timing) throw new Error(`Missing timing for ${payload.surah}:${payload.ayah}`);
      this.loadSurahAudio(payload.surah);
      this.currentSurah = payload.surah;
      this.currentAyah = payload.ayah;
      this.pendingSeekMs = timing.startMs;
      this.currentPositionMs = timing.startMs;
      if (this.audio.readyState >= HTMLMediaElement.HAVE_METADATA) {
        this.audio.currentTime = timing.startMs / 1000;
      }
      await this.audio.play();
    }
    this.playing = true;
    this.notify();
    await this.persistState();
  }

  async pause() {
    if (Capacitor.isNativePlatform()) {
      await QuranAudio.pause();
      return;
    }
    this.audio?.pause();
    this.stopProgressLoop();
    this.playing = false;
    this.notify();
    await this.persistState();
  }

  async resume() {
    if (Capacitor.isNativePlatform()) {
      await QuranAudio.resume();
      return;
    }
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
    if (Capacitor.isNativePlatform()) {
      await QuranAudio.nextAyah();
      return;
    }
    this.currentAyah += 1;
    await this.persistState();
  }

  async previousAyah() {
    if (Capacitor.isNativePlatform()) {
      await QuranAudio.previousAyah();
      return;
    }
    this.currentAyah = Math.max(1, this.currentAyah - 1);
    await this.persistState();
  }

  async seekTo(positionMs: number) {
    if (Capacitor.isNativePlatform()) {
      await QuranAudio.seekTo(positionMs);
      return;
    }
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

  private loadSurahAudio(surah: number) {
    if (!this.audio) return;
    const source = new URL(resolveAudioUrl(surah), window.location.href).href;
    if (this.audio.src === source && this.audio.readyState >= 1) return;

    this.audio.pause();
    this.pendingSeekMs = null;
    this.audio.src = source;
    this.audio.load();
  }

  private notify() {
    const state = this.getState();
    for (const listener of this.listeners) listener(state);
  }

  private startProgressLoop() {
    if (this.progressFrame !== null || !this.audio) return;
    const update = () => {
      if (!this.audio || this.audio.paused || this.audio.ended) {
        this.progressFrame = null;
        return;
      }
      this.currentPositionMs = this.audio.currentTime * 1000;
      this.notify();
      this.progressFrame = window.requestAnimationFrame(update);
    };
    this.progressFrame = window.requestAnimationFrame(update);
  }

  private stopProgressLoop() {
    if (this.progressFrame !== null && typeof window !== 'undefined') {
      window.cancelAnimationFrame(this.progressFrame);
    }
    this.progressFrame = null;
  }

  private applyNativeState(state: PlaybackState) {
    this.currentSurah = state.surah;
    this.currentAyah = state.ayah;
    this.playing = state.playing;
    this.currentPositionMs = state.positionMs;
    this.durationMs = state.durationMs;
    this.notify();
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
