import { reciterStorage } from './storage';
import type { Reciter } from '../data/reciterRegistry';

export interface DownloadProgress {
  reciterId: string | null;
  isDownloading: boolean;
  currentSurah: number;
  downloadedCount: number;
  totalSurahs: number;
  progressPercent: number;
  error: string | null;
}

export type DownloadListener = (progress: DownloadProgress) => void;

export class ReciterDownloadManager {
  private isDownloading = false;
  private activeReciterId: string | null = null;
  private currentSurah = 0;
  private downloadedCount = 0;
  private totalSurahs = 114;
  private progressPercent = 0;
  private error: string | null = null;
  private abortController: AbortController | null = null;
  private readonly listeners = new Set<DownloadListener>();

  getProgress(): DownloadProgress {
    return {
      reciterId: this.activeReciterId,
      isDownloading: this.isDownloading,
      currentSurah: this.currentSurah,
      downloadedCount: this.downloadedCount,
      totalSurahs: this.totalSurahs,
      progressPercent: this.progressPercent,
      error: this.error,
    };
  }

  subscribe(listener: DownloadListener): () => void {
    this.listeners.add(listener);
    listener(this.getProgress());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const progress = this.getProgress();
    for (const listener of this.listeners) {
      listener(progress);
    }
  }

  async startDownload(reciter: Reciter): Promise<void> {
    if (this.isDownloading) {
      if (this.activeReciterId === reciter.id) return;
      this.cancelDownload();
    }

    this.isDownloading = true;
    this.activeReciterId = reciter.id;
    this.error = null;
    this.totalSurahs = reciter.totalSurahs || 114;
    this.abortController = new AbortController();

    const existing = await reciterStorage.getDownloadedSurahs(reciter.id);
    const existingSet = new Set(existing);
    this.downloadedCount = existingSet.size;
    this.progressPercent = Math.round((this.downloadedCount / this.totalSurahs) * 100);
    this.notify();

    const pendingSurahs: number[] = [];
    for (let s = 1; s <= this.totalSurahs; s++) {
      if (!existingSet.has(s)) {
        pendingSurahs.push(s);
      }
    }

    if (pendingSurahs.length === 0) {
      this.isDownloading = false;
      this.progressPercent = 100;
      this.notify();
      return;
    }

    try {
      // Process downloads sequentially or with small concurrency
      const concurrency = 2;
      let currentIndex = 0;

      const worker = async () => {
        while (currentIndex < pendingSurahs.length) {
          if (this.abortController?.signal.aborted) break;

          const surahIndex = currentIndex++;
          const surah = pendingSurahs[surahIndex];
          if (!surah) break;

          this.currentSurah = surah;
          this.notify();

          const url = reciter.audioUrlPattern(surah);
          await reciterStorage.downloadSurah(
            reciter.id,
            surah,
            url,
            this.abortController?.signal,
          );

          this.downloadedCount += 1;
          this.progressPercent = Math.min(
            100,
            Math.round((this.downloadedCount / this.totalSurahs) * 100),
          );
          this.notify();
        }
      };

      const workers = Array.from({ length: concurrency }, () => worker());
      await Promise.all(workers);

      if (!this.abortController?.signal.aborted) {
        this.progressPercent = 100;
      }
    } catch (err: unknown) {
      if (this.abortController?.signal.aborted) {
        // Download was intentionally cancelled
      } else {
        this.error = err instanceof Error ? err.message : 'Download failed';
      }
    } finally {
      this.isDownloading = false;
      this.abortController = null;
      this.notify();
    }
  }

  cancelDownload(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    this.isDownloading = false;
    this.notify();
  }

  isDownloadingReciter(reciterId: string): boolean {
    return this.isDownloading && this.activeReciterId === reciterId;
  }
}

export const reciterDownloadManager = new ReciterDownloadManager();

