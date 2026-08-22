import { DEFAULT_RECITER_ID } from '../../data/reciterRegistry';
import type { IReciterStorage } from './reciterStorage';

export class WebReciterStorage implements IReciterStorage {
  private currentObjectUrls = new Map<string, string>();

  private getCacheName(reciterId: string): string {
    return `quran-audio-${reciterId}`;
  }

  private getSurahKey(reciterId: string, surah: number): string {
    const padded = String(surah).padStart(3, '0');
    return `https://quran.local/audio/${reciterId}/${padded}.mp3`;
  }

  private getMetadataKey(reciterId: string): string {
    return `quran_installed_${reciterId}`;
  }

  private getLocalSurahSet(reciterId: string): Set<number> {
    try {
      const raw = localStorage.getItem(this.getMetadataKey(reciterId));
      if (!raw) return new Set();
      const list: number[] = JSON.parse(raw);
      return new Set(list);
    } catch {
      return new Set();
    }
  }

  private saveLocalSurahSet(reciterId: string, set: Set<number>): void {
    try {
      localStorage.setItem(this.getMetadataKey(reciterId), JSON.stringify(Array.from(set)));
    } catch {
      // Ignore storage quota error
    }
  }

  async isSurahDownloaded(reciterId: string, surah: number): Promise<boolean> {
    if (typeof caches === 'undefined') return false;
    const localSet = this.getLocalSurahSet(reciterId);
    if (localSet.has(surah)) return true;

    try {
      const cache = await caches.open(this.getCacheName(reciterId));
      const res = await cache.match(this.getSurahKey(reciterId, surah));
      if (res) {
        localSet.add(surah);
        this.saveLocalSurahSet(reciterId, localSet);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  async getDownloadedSurahs(reciterId: string): Promise<number[]> {
    if (typeof caches === 'undefined') return [];
    try {
      const cache = await caches.open(this.getCacheName(reciterId));
      const keys = await cache.keys();
      const surahs: number[] = [];

      for (const request of keys) {
        const match = request.url.match(/\/(\d{3})\.mp3$/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num >= 1 && num <= 114) {
            surahs.push(num);
          }
        }
      }

      surahs.sort((a, b) => a - b);
      this.saveLocalSurahSet(reciterId, new Set(surahs));
      return surahs;
    } catch {
      return Array.from(this.getLocalSurahSet(reciterId)).sort((a, b) => a - b);
    }
  }

  async getAudioUrl(reciterId: string, surah: number): Promise<string | null> {
    if (typeof caches === 'undefined') return null;
    try {
      const cache = await caches.open(this.getCacheName(reciterId));
      const key = this.getSurahKey(reciterId, surah);
      const res = await cache.match(key);
      if (!res) return null;

      const blob = await res.blob();
      const objectKey = `${reciterId}_${surah}`;

      // Revoke previous object URL if existing
      const oldUrl = this.currentObjectUrls.get(objectKey);
      if (oldUrl) {
        URL.revokeObjectURL(oldUrl);
      }

      const url = URL.createObjectURL(blob);
      this.currentObjectUrls.set(objectKey, url);
      return url;
    } catch {
      return null;
    }
  }

  async downloadSurah(
    reciterId: string,
    surah: number,
    remoteUrl: string,
    signal?: AbortSignal,
  ): Promise<void> {
    if (typeof caches === 'undefined') {
      throw new Error('Cache storage is not supported in this environment.');
    }

    const response = await fetch(remoteUrl, { signal });
    if (!response.ok) {
      throw new Error(`Download failed with status ${response.status}: ${response.statusText}`);
    }

    const cache = await caches.open(this.getCacheName(reciterId));
    const key = this.getSurahKey(reciterId, surah);
    await cache.put(key, response);

    const localSet = this.getLocalSurahSet(reciterId);
    localSet.add(surah);
    this.saveLocalSurahSet(reciterId, localSet);
  }

  async deleteReciter(reciterId: string): Promise<void> {
    // Revoke any active object URLs for this reciter
    for (const [key, url] of this.currentObjectUrls.entries()) {
      if (key.startsWith(`${reciterId}_`)) {
        URL.revokeObjectURL(url);
        this.currentObjectUrls.delete(key);
      }
    }

    if (typeof caches !== 'undefined') {
      try {
        await caches.delete(this.getCacheName(reciterId));
      } catch {
        // Ignore cache delete failure
      }
    }

    try {
      localStorage.removeItem(this.getMetadataKey(reciterId));
    } catch {
      // Ignore
    }
  }

  async isReciterFullyDownloaded(reciterId: string, totalSurahs = 114): Promise<boolean> {
    const downloaded = await this.getDownloadedSurahs(reciterId);
    return downloaded.length >= totalSurahs;
  }

  async getActiveReciterId(): Promise<string> {
    try {
      return localStorage.getItem('quran_active_reciter') || DEFAULT_RECITER_ID;
    } catch {
      return DEFAULT_RECITER_ID;
    }
  }

  async setActiveReciterId(reciterId: string): Promise<void> {
    try {
      localStorage.setItem('quran_active_reciter', reciterId);
    } catch {
      // Ignore
    }
  }
}

