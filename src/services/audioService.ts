import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { App as CapApp } from '@capacitor/app';
import { QuranAudio } from '../android/QuranAudioPlugin';
import { getReciterById, DEFAULT_RECITER_ID } from '../data/reciterRegistry';
import { reciterStorage } from './storage';
import { quranService } from './quranService';
import type {
  AudioPlaybackRequest,
  PlaybackState,
  RepeatMode,
  SleepTimerMode,
  RecentItem,
} from '../types/audio';

const DEFAULT_SURAH = 1;
const DEFAULT_AYAH = 1;
const LAST_SESSION_STORAGE_KEY = 'quran_last_session';
const RECENTLY_PLAYED_STORAGE_KEY = 'quran_recently_played';
const SETTINGS_STORAGE_KEY = 'quran_app_settings';

const firstAyahForSurah = (surah: number) => (surah === 9 ? 1 : 0);

export class AudioService {
  private currentSurah = DEFAULT_SURAH;
  private currentAyah = DEFAULT_AYAH;
  private activeReciterId = DEFAULT_RECITER_ID;
  private playing = false;
  private currentPositionMs = 0;
  private durationMs = 0;
  private pendingSeekMs: number | null = null;
  private progressFrame: number | null = null;
  private currentAudioKey: string | null = null;
  private readonly audio = typeof Audio === 'undefined' ? null : new Audio();
  private readonly listeners = new Set<(state: PlaybackState) => void>();

  // Async token guards to prevent race conditions during rapid switching
  private reciterSwitchRequestId = 0;
  private playbackRequestId = 0;

  // Autoplay / Repeat Mode
  private repeatMode: RepeatMode = 'continuous';

  // Sleep Timer
  private sleepTimerMode: SleepTimerMode = 'off';
  private sleepTimerRemainingSec: number | null = null;
  private sleepTimerInterval: number | null = null;

  // Recent History & Tracking
  private recentlyPlayed: RecentItem[] = [];
  private lastRecordedAyahKey: string | null = null;
  private lastPersistTime = 0;

  constructor() {
    if (this.audio) {
      this.audio.preload = 'auto';

      const updatePositionAndDuration = () => {
        if (!this.audio) return;
        this.currentPositionMs = this.audio.currentTime * 1000;
        if (this.audio.duration && !isNaN(this.audio.duration) && isFinite(this.audio.duration) && this.audio.duration > 0) {
          this.durationMs = this.audio.duration * 1000;
        }
      };

      this.audio.addEventListener('timeupdate', () => {
        updatePositionAndDuration();
        if (this.pendingSeekMs !== null) {
          if (this.currentPositionMs < this.pendingSeekMs - 200) return;
          this.pendingSeekMs = null;
        }

        const ayah = this.findAyahAt(this.currentPositionMs);
        if (ayah !== undefined && ayah !== this.currentAyah) {
          this.handleAyahTransition(ayah);
        }

        this.updateMediaSessionPosition();
        this.throttlePersistState();
        this.notify();
      });

      this.audio.addEventListener('durationchange', () => {
        updatePositionAndDuration();
        this.notify();
      });

      this.audio.addEventListener('loadedmetadata', () => {
        updatePositionAndDuration();
        if (this.audio && this.pendingSeekMs !== null) {
          this.audio.currentTime = this.pendingSeekMs / 1000;
        }
        this.updateMediaSession();
        this.notify();
      });

      this.audio.addEventListener('canplay', () => {
        updatePositionAndDuration();
        if (this.audio && this.pendingSeekMs !== null) {
          this.audio.currentTime = this.pendingSeekMs / 1000;
        }
        this.notify();
      });

      this.audio.addEventListener('seeking', () => {
        updatePositionAndDuration();
        this.notify();
      });

      this.audio.addEventListener('seeked', () => {
        updatePositionAndDuration();
        this.notify();
      });

      this.audio.addEventListener('play', () => {
        this.playing = true;
        updatePositionAndDuration();
        this.startProgressLoop();
        this.updateMediaSession();
        this.notify();
      });

      this.audio.addEventListener('playing', () => {
        this.playing = true;
        updatePositionAndDuration();
        this.startProgressLoop();
        if (this.audio && this.pendingSeekMs !== null && this.audio.currentTime * 1000 < this.pendingSeekMs) {
          this.audio.currentTime = this.pendingSeekMs / 1000;
        }
        this.updateMediaSession();
        this.notify();
      });

      this.audio.addEventListener('pause', () => {
        this.stopProgressLoop();
        this.playing = false;
        updatePositionAndDuration();
        this.updateMediaSession();
        this.notify();
        void this.persistState();
      });

      this.audio.addEventListener('ended', () => {
        this.stopProgressLoop();
        updatePositionAndDuration();
        void this.handleAudioEnded();
      });
    }

    this.setupMediaSessionHandlers();
    this.setupLifecycleHandlers();
  }

  async initialize() {
    this.activeReciterId = await reciterStorage.getActiveReciterId();
    await this.restoreSettings();
    await this.restoreRecentlyPlayed();

    if (Capacitor.isNativePlatform()) {
      try {
        await QuranAudio.initialize();
        await QuranAudio.setActiveReciter({ reciterId: this.activeReciterId });
        await this.syncNativeTimingData(this.activeReciterId);
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
      } catch (err) {
        console.warn('Native QuranAudio init fallback to web audio', err);
      }
    }

    // Restore last session
    const lastSession = await this.getLastSession();
    if (lastSession) {
      this.currentSurah = lastSession.surah;
      this.currentAyah = lastSession.ayah;
      this.currentPositionMs = lastSession.positionMs || 0;
      if (lastSession.reciterId) {
        this.activeReciterId = lastSession.reciterId;
      }
      this.computeInitialDuration(this.currentSurah);
    }

    this.notify();
  }

  private computeInitialDuration(surah: number) {
    const reciter = getReciterById(this.activeReciterId);
    const timings = reciter.timings?.[surah];
    if (timings) {
      const endTimes = Object.values(timings).map((t) => t.endMs);
      if (endTimes.length > 0) {
        this.durationMs = Math.max(...endTimes);
      }
    }
  }

  // =========================================================================
  // Reciter Switching (Safe Lifecycle & Race-Free)
  // =========================================================================
  async setReciter(reciterId: string): Promise<void> {
    if (this.activeReciterId === reciterId && this.currentAudioKey?.startsWith(reciterId)) {
      return;
    }

    const requestId = ++this.reciterSwitchRequestId;
    const wasPlaying = this.playing;

    // 1. Immediately halt and reset current audio playback
    if (this.audio) {
      try {
        this.audio.pause();
        this.audio.currentTime = 0;
        this.audio.removeAttribute('src');
        this.audio.load();
      } catch {
        // Ignore
      }
    }
    this.stopProgressLoop();
    this.playing = false;
    this.currentAudioKey = null;

    if (Capacitor.isNativePlatform()) {
      try {
        await QuranAudio.pause();
        await QuranAudio.setActiveReciter({ reciterId });
        await this.syncNativeTimingData(reciterId);
      } catch {
        // Ignore native error
      }
    }

    this.activeReciterId = reciterId;
    await reciterStorage.setActiveReciterId(reciterId);

    // If another switch occurred concurrently, abort
    if (requestId !== this.reciterSwitchRequestId) {
      return;
    }

    if (this.audio) {
      const surah = this.currentSurah;
      const ayah = this.currentAyah;
      const reciter = getReciterById(reciterId);
      const timing = reciter.timings?.[surah]?.[ayah];
      let startMs = 0;
      if (timing) {
        startMs = timing.startMs;
      } else if (ayah === 0) {
        startMs = 0;
      } else if (ayah === 1 && reciter.timings?.[surah]?.[1]) {
        startMs = reciter.timings[surah][1].startMs;
      }

      await this.loadSurahAudio(surah);
      if (requestId !== this.reciterSwitchRequestId) {
        return;
      }

      this.pendingSeekMs = startMs;
      this.currentPositionMs = startMs;

      if (this.audio.readyState >= HTMLMediaElement.HAVE_METADATA) {
        this.audio.currentTime = startMs / 1000;
      }

      if (wasPlaying) {
        try {
          await this.audio.play();
          this.playing = true;
          this.startProgressLoop();
        } catch (err) {
          console.warn('Audio play after reciter change interrupted', err);
          this.playing = false;
        }
      }
    }

    this.updateMediaSession();
    this.notify();
    await this.persistState();
  }

  getReciterId(): string {
    return this.activeReciterId;
  }

  private async syncNativeTimingData(reciterId: string): Promise<void> {
    const timings = getReciterById(reciterId).timings;
    await QuranAudio.setTimingData({ timingsJson: JSON.stringify(timings ?? {}) });
  }

  // =========================================================================
  // Playback Controls
  // =========================================================================
  async playAyah(payload: AudioPlaybackRequest): Promise<void> {
    const requestId = ++this.playbackRequestId;

    if (Capacitor.isNativePlatform()) {
      try {
        await QuranAudio.playAyah(payload);
        this.currentSurah = payload.surah;
        this.currentAyah = payload.ayah;
        this.playing = true;
        this.recordRecentPlay(payload.surah, payload.ayah);
        this.updateMediaSession();
        this.notify();
        await this.persistState();
        return;
      } catch {
        // Fallback to web
      }
    }

    this.currentSurah = payload.surah;
    this.currentAyah = payload.ayah;

    if (this.audio) {
      const reciter = getReciterById(this.activeReciterId);
      const timing = reciter.timings?.[payload.surah]?.[payload.ayah];
      let startMs = 0;

      if (payload.positionMs !== undefined) {
        startMs = payload.positionMs;
      } else if (timing) {
        startMs = timing.startMs;
      } else if (payload.ayah === 0) {
        startMs = 0;
      } else if (payload.ayah === 1 && reciter.timings?.[payload.surah]?.[1]) {
        startMs = reciter.timings[payload.surah][1].startMs;
      }

      await this.loadSurahAudio(payload.surah);
      if (requestId !== this.playbackRequestId) {
        return;
      }

      this.currentSurah = payload.surah;
      this.currentAyah = payload.ayah;
      this.pendingSeekMs = startMs;
      this.currentPositionMs = startMs;

      if (this.audio.readyState >= HTMLMediaElement.HAVE_METADATA) {
        this.audio.currentTime = startMs / 1000;
      }

      try {
        await this.audio.play();
        this.playing = true;
        this.startProgressLoop();
      } catch (e) {
        console.warn('Audio play request interrupted or requires user gesture', e);
        this.playing = false;
      }
    }

    this.recordRecentPlay(payload.surah, payload.ayah);
    this.updateMediaSession();
    this.notify();
    await this.persistState();
  }

  async resumeAtSavedPosition(): Promise<void> {
    const session = await this.getLastSession();
    if (session) {
      if (session.reciterId && session.reciterId !== this.activeReciterId) {
        await this.setReciter(session.reciterId);
      }
      await this.playAyah({
        surah: session.surah,
        ayah: session.ayah,
        positionMs: session.positionMs,
      });
    } else {
      await this.playAyah({ surah: this.currentSurah, ayah: this.currentAyah });
    }
  }

  async pause(): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      try {
        await QuranAudio.pause();
        this.playing = false;
        this.updateMediaSession();
        this.notify();
        await this.persistState();
        return;
      } catch {
        // Fallback
      }
    }
    if (this.audio) {
      this.audio.pause();
    }
    this.playing = false;
    this.stopProgressLoop();
    this.updateMediaSession();
    this.notify();
    await this.persistState();
  }

  async resume(): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      try {
        await QuranAudio.resume();
        this.playing = true;
        this.updateMediaSession();
        this.notify();
        await this.persistState();
        return;
      } catch {
        // Fallback
      }
    }

    if (this.audio) {
      const key = `${this.activeReciterId}_${this.currentSurah}`;
      if (!this.audio.src || this.currentAudioKey !== key) {
        await this.loadSurahAudio(this.currentSurah);
        const reciter = getReciterById(this.activeReciterId);
        const timing = reciter.timings?.[this.currentSurah]?.[this.currentAyah];
        if (timing && this.currentPositionMs < timing.startMs) {
          this.currentPositionMs = timing.startMs;
        }
        if (this.audio.readyState >= HTMLMediaElement.HAVE_METADATA) {
          this.audio.currentTime = this.currentPositionMs / 1000;
        }
      }
      try {
        await this.audio.play();
        this.playing = true;
        this.startProgressLoop();
      } catch (err) {
        console.warn('Resume play interrupted', err);
        this.playing = false;
      }
    }

    this.recordRecentPlay(this.currentSurah, this.currentAyah);
    this.updateMediaSession();
    this.notify();
    await this.persistState();
  }

  async nextAyah() {
    const surah = quranService.getSurah(this.currentSurah);
    const next = this.currentAyah + 1;

    if (next <= surah.totalAyahs) {
      await this.playAyah({ surah: this.currentSurah, ayah: next });
      return;
    }

    // End of surah
    if (this.repeatMode === 'repeat_surah') {
      await this.playAyah({ surah: this.currentSurah, ayah: firstAyahForSurah(this.currentSurah), positionMs: 0 });
      return;
    }

    if (this.repeatMode === 'off') {
      await this.pause();
      return;
    }

    const nextSurahNum = this.currentSurah < 114 ? this.currentSurah + 1 : 1;
    await this.playAyah({ surah: nextSurahNum, ayah: firstAyahForSurah(nextSurahNum) });
  }

  async previousAyah() {
    if (this.currentAyah > 1) {
      await this.playAyah({ surah: this.currentSurah, ayah: this.currentAyah - 1 });
      return;
    }

    if (this.currentSurah > 1) {
      const prevSurahNum = this.currentSurah - 1;
      const prevSurah = quranService.getSurah(prevSurahNum);
      await this.playAyah({ surah: prevSurahNum, ayah: prevSurah.totalAyahs });
    }
  }

  async seekTo(positionMs: number) {
    if (Capacitor.isNativePlatform()) {
      try {
        await QuranAudio.seekTo(positionMs);
      } catch {
        // Fallback
      }
    }
    this.currentPositionMs = Math.max(0, positionMs);
    if (this.audio) {
      this.audio.currentTime = this.currentPositionMs / 1000;
    }
    const ayah = this.findAyahAt(this.currentPositionMs);
    if (ayah !== undefined && ayah !== this.currentAyah) {
      this.currentAyah = ayah;
    }
    this.updateMediaSession();
    this.notify();
    await this.persistState();
  }

  // =========================================================================
  // Autoplay / Repeat Mode (Single Footer Button Cycle)
  // =========================================================================
  cycleRepeatMode(): RepeatMode {
    const cycleMap: Record<RepeatMode, RepeatMode> = {
      continuous: 'repeat_single',
      repeat_single: 'repeat_surah',
      repeat_surah: 'off',
      off: 'continuous',
    };
    const nextMode = cycleMap[this.repeatMode] || 'continuous';
    this.setRepeatMode(nextMode);
    return nextMode;
  }

  setRepeatMode(mode: RepeatMode) {
    this.repeatMode = mode;
    this.notify();
    void this.saveSettings();
  }

  getRepeatMode(): RepeatMode {
    return this.repeatMode;
  }

  // =========================================================================
  // Sleep / Stop Timer Management
  // =========================================================================
  setSleepTimer(mode: SleepTimerMode) {
    this.sleepTimerMode = mode;

    if (this.sleepTimerInterval !== null) {
      window.clearInterval(this.sleepTimerInterval);
      this.sleepTimerInterval = null;
    }

    if (mode === 'off' || mode === 'end_of_ayah' || mode === 'end_of_surah') {
      this.sleepTimerRemainingSec = null;
      this.notify();
      return;
    }

    let durationSeconds = 0;
    if (mode === '5min') durationSeconds = 5 * 60;
    else if (mode === '15min') durationSeconds = 15 * 60;
    else if (mode === '30min') durationSeconds = 30 * 60;

    this.sleepTimerRemainingSec = durationSeconds;
    this.notify();

    this.sleepTimerInterval = window.setInterval(() => {
      if (this.sleepTimerRemainingSec === null || this.sleepTimerRemainingSec <= 1) {
        if (this.sleepTimerInterval !== null) {
          window.clearInterval(this.sleepTimerInterval);
          this.sleepTimerInterval = null;
        }
        this.sleepTimerRemainingSec = 0;
        void this.pause();
        this.sleepTimerMode = 'off';
        this.sleepTimerRemainingSec = null;
        this.notify();
        return;
      }
      this.sleepTimerRemainingSec -= 1;
      this.notify();
    }, 1000);
  }

  getSleepTimerMode(): SleepTimerMode {
    return this.sleepTimerMode;
  }

  getSleepTimerRemainingSec(): number | null {
    return this.sleepTimerRemainingSec;
  }

  // =========================================================================
  // Recently Played History
  // =========================================================================
  getRecentlyPlayed(): RecentItem[] {
    return this.recentlyPlayed;
  }

  private recordRecentPlay(surah: number, ayah: number) {
    const key = `${surah}:${ayah}`;
    if (this.lastRecordedAyahKey === key) return;
    this.lastRecordedAyahKey = key;

    const filtered = this.recentlyPlayed.filter((item) => !(item.surah === surah && item.ayah === ayah));
    const newItem: RecentItem = {
      surah,
      ayah,
      reciterId: this.activeReciterId,
      timestamp: Date.now(),
    };
    this.recentlyPlayed = [newItem, ...filtered].slice(0, 10);
    void this.saveRecentlyPlayed();
  }

  private async saveRecentlyPlayed() {
    try {
      const value = JSON.stringify(this.recentlyPlayed);
      localStorage.setItem(RECENTLY_PLAYED_STORAGE_KEY, value);
      if (Capacitor.isNativePlatform()) {
        await Preferences.set({ key: RECENTLY_PLAYED_STORAGE_KEY, value });
      }
    } catch {
      // Ignore
    }
  }

  private async restoreRecentlyPlayed() {
    try {
      let raw = localStorage.getItem(RECENTLY_PLAYED_STORAGE_KEY);
      if (Capacitor.isNativePlatform()) {
        const pref = await Preferences.get({ key: RECENTLY_PLAYED_STORAGE_KEY });
        raw = pref.value || raw;
      }
      if (raw) {
        this.recentlyPlayed = JSON.parse(raw);
      }
    } catch {
      this.recentlyPlayed = [];
    }
  }

  // =========================================================================
  // Last Session & State Persistence
  // =========================================================================
  async getLastSession(): Promise<{ surah: number; ayah: number; reciterId: string; positionMs: number } | null> {
    try {
      const nativeVal = await Preferences.get({ key: LAST_SESSION_STORAGE_KEY });
      if (nativeVal.value) {
        return JSON.parse(nativeVal.value);
      }
      const localVal = localStorage.getItem(LAST_SESSION_STORAGE_KEY);
      if (localVal) {
        return JSON.parse(localVal);
      }
    } catch {
      // Ignore
    }
    return null;
  }

  private throttlePersistState() {
    const now = Date.now();
    if (now - this.lastPersistTime > 3000) {
      this.lastPersistTime = now;
      void this.persistState();
    }
  }

  async persistState() {
    const sessionData = {
      surah: this.currentSurah,
      ayah: this.currentAyah,
      reciterId: this.activeReciterId,
      positionMs: Math.floor(this.currentPositionMs),
      timestamp: Date.now(),
    };
    try {
      localStorage.setItem(LAST_SESSION_STORAGE_KEY, JSON.stringify(sessionData));
      if (Capacitor.isNativePlatform()) {
        await Preferences.set({
          key: LAST_SESSION_STORAGE_KEY,
          value: JSON.stringify(sessionData),
        });
      }
    } catch {
      // Ignore
    }
  }

  private async saveSettings() {
    try {
      const settings = {
        repeatMode: this.repeatMode,
      };
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
      if (Capacitor.isNativePlatform()) {
        await Preferences.set({
          key: SETTINGS_STORAGE_KEY,
          value: JSON.stringify(settings),
        });
      }
    } catch {
      // Ignore
    }
  }

  private async restoreSettings() {
    try {
      let raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (!raw && Capacitor.isNativePlatform()) {
        const pref = await Preferences.get({ key: SETTINGS_STORAGE_KEY });
        raw = pref.value;
      }
      if (raw) {
        const s = JSON.parse(raw);
        if (s.repeatMode) this.repeatMode = s.repeatMode;
      }
    } catch {
      // Ignore
    }
  }

  // =========================================================================
  // Transition & Audio Loop Handlers
  // =========================================================================
  private handleAyahTransition(newAyah: number) {
    if (this.sleepTimerMode === 'end_of_ayah') {
      this.currentAyah = newAyah;
      this.notify();
      void this.pause();
      this.sleepTimerMode = 'off';
      return;
    }

    if (this.repeatMode === 'off') {
      this.currentAyah = newAyah;
      this.notify();
      void this.pause();
      return;
    }

    if (this.repeatMode === 'repeat_single') {
      const reciter = getReciterById(this.activeReciterId);
      const timing = reciter.timings?.[this.currentSurah]?.[this.currentAyah];
      if (timing && this.audio) {
        this.audio.currentTime = timing.startMs / 1000;
        return;
      }
    }

    this.currentAyah = newAyah;
    this.recordRecentPlay(this.currentSurah, newAyah);
    this.updateMediaSession();
    this.notify();
    void this.persistState();
  }

  private async handleAudioEnded() {
    if (this.sleepTimerMode === 'end_of_surah' || this.repeatMode === 'off') {
      this.playing = false;
      this.sleepTimerMode = 'off';
      this.notify();
      await this.persistState();
      return;
    }

    if (this.repeatMode === 'repeat_surah') {
      await this.playAyah({ surah: this.currentSurah, ayah: firstAyahForSurah(this.currentSurah), positionMs: 0 });
      return;
    }

    // Continuous advance to next surah
    const nextSurah = this.currentSurah < 114 ? this.currentSurah + 1 : 1;
    await this.playAyah({ surah: nextSurah, ayah: firstAyahForSurah(nextSurah) });
  }

  getState(): PlaybackState {
    return {
      playing: this.playing,
      surah: this.currentSurah,
      ayah: this.currentAyah,
      positionMs: this.currentPositionMs,
      durationMs: this.durationMs,
      repeatMode: this.repeatMode,
      sleepTimerMode: this.sleepTimerMode,
      sleepTimerRemainingSec: this.sleepTimerRemainingSec,
    };
  }

  subscribe(listener: (state: PlaybackState) => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private findAyahAt(currentMs: number): number | undefined {
    const reciter = getReciterById(this.activeReciterId);
    const timings = reciter.timings?.[this.currentSurah];
    if (!timings) return undefined;

    const entries = Object.entries(timings)
      .map(([k, v]) => ({ ayah: Number(k), timing: v }))
      .sort((a, b) => a.ayah - b.ayah);

    if (entries.length === 0) return undefined;

    for (const entry of entries) {
      if (currentMs >= entry.timing.startMs && currentMs < entry.timing.endMs) {
        return entry.ayah;
      }
    }

    // If past last timing start
    if (currentMs >= entries[entries.length - 1].timing.startMs) {
      return entries[entries.length - 1].ayah;
    }

    // If before first timing start (e.g. Bismillah before ayah 1)
    if (currentMs < entries[0].timing.startMs) {
      return this.currentSurah === 1 ? 1 : 0;
    }

    return undefined;
  }

  private async loadSurahAudio(surah: number) {
    if (!this.audio) return;
    const key = `${this.activeReciterId}_${surah}`;
    if (this.currentAudioKey === key && this.audio.src && this.audio.readyState >= 1) return;

    this.computeInitialDuration(surah);

    let source = await reciterStorage.getAudioUrl(this.activeReciterId, surah);
    if (!source) {
      const reciter = getReciterById(this.activeReciterId);
      source = reciter.audioUrlPattern(surah);
    }

    this.audio.pause();
    this.pendingSeekMs = null;
    this.audio.src = source;
    this.currentAudioKey = key;
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
      if (this.audio.duration && !isNaN(this.audio.duration) && isFinite(this.audio.duration) && this.audio.duration > 0) {
        this.durationMs = this.audio.duration * 1000;
      }
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
    this.updateMediaSession();
    this.notify();
  }

  private setupLifecycleHandlers() {
    if (typeof window === 'undefined') return;

    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        void this.persistState();
      }
    });

    window.addEventListener('pagehide', () => {
      void this.persistState();
    });

    window.addEventListener('beforeunload', () => {
      void this.persistState();
    });

    if (Capacitor.isNativePlatform()) {
      void CapApp.addListener('appStateChange', (state) => {
        if (!state.isActive) {
          void this.persistState();
        }
      });
    }
  }

  private setupMediaSessionHandlers() {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;

    try {
      navigator.mediaSession.setActionHandler('play', () => {
        void this.resume();
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        void this.pause();
      });
      navigator.mediaSession.setActionHandler('previoustrack', () => {
        void this.previousAyah();
      });
      navigator.mediaSession.setActionHandler('nexttrack', () => {
        void this.nextAyah();
      });
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined && details.seekTime !== null) {
          void this.seekTo(details.seekTime * 1000);
        }
      });
    } catch (e) {
      console.warn('Failed to set up MediaSession handlers', e);
    }
  }

  private updateMediaSession() {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;

    try {
      const surahData = quranService.getSurah(this.currentSurah);
      const reciter = getReciterById(this.activeReciterId);

      navigator.mediaSession.metadata = new MediaMetadata({
        title: `${surahData.nameTransliteration} (${surahData.nameArabic}) — Ayah ${this.currentAyah}`,
        artist: `${reciter.name} (${reciter.nameArabic})`,
        album: 'The Holy Quran - القرآن الكريم',
        artwork: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      });

      navigator.mediaSession.playbackState = this.playing ? 'playing' : 'paused';
      this.updateMediaSessionPosition();
    } catch {
      // Ignore
    }
  }

  private updateMediaSessionPosition() {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator) || !navigator.mediaSession.setPositionState) {
      return;
    }
    try {
      const durationSec = Math.max(1, this.durationMs / 1000);
      const positionSec = Math.min(durationSec, Math.max(0, this.currentPositionMs / 1000));
      navigator.mediaSession.setPositionState({
        duration: durationSec,
        playbackRate: 1.0,
        position: positionSec,
      });
    } catch {
      // Ignore
    }
  }
}

export const audioService = new AudioService();
