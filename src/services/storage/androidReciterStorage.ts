import { QuranAudio } from '../../android/QuranAudioPlugin';
import { DEFAULT_RECITER_ID } from '../../data/reciterRegistry';
import type { IReciterStorage } from './reciterStorage';

export class AndroidReciterStorage implements IReciterStorage {
  private activeReciterId = DEFAULT_RECITER_ID;

  async isSurahDownloaded(reciterId: string, surah: number): Promise<boolean> {
    try {
      const result = await QuranAudio.getDownloadedSurahs({ reciterId });
      return (result.surahs ?? []).includes(surah);
    } catch {
      return false;
    }
  }

  async getDownloadedSurahs(reciterId: string): Promise<number[]> {
    try {
      const result = await QuranAudio.getDownloadedSurahs({ reciterId });
      return result.surahs ?? [];
    } catch {
      return [];
    }
  }

  async getAudioUrl(reciterId: string, surah: number): Promise<string | null> {
    const isDownloaded = await this.isSurahDownloaded(reciterId, surah);
    if (!isDownloaded) return null;
    const padded = String(surah).padStart(3, '0');
    return `reciters/${reciterId}/${padded}.mp3`;
  }

  async downloadSurah(
    reciterId: string,
    surah: number,
    remoteUrl: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _signal?: AbortSignal,
  ): Promise<void> {
    const res = await QuranAudio.downloadSurah({
      reciterId,
      surah,
      url: remoteUrl,
    });
    if (!res.success) {
      throw new Error(`Native download failed for surah ${surah}`);
    }
  }

  async deleteReciter(reciterId: string): Promise<void> {
    await QuranAudio.deleteReciter({ reciterId });
  }

  async isReciterFullyDownloaded(reciterId: string, totalSurahs = 114): Promise<boolean> {
    const downloaded = await this.getDownloadedSurahs(reciterId);
    return downloaded.length >= totalSurahs;
  }

  async getActiveReciterId(): Promise<string> {
    try {
      const res = await QuranAudio.getActiveReciter();
      this.activeReciterId = res.reciterId || DEFAULT_RECITER_ID;
      return this.activeReciterId;
    } catch {
      return this.activeReciterId;
    }
  }

  async setActiveReciterId(reciterId: string): Promise<void> {
    this.activeReciterId = reciterId;
    try {
      await QuranAudio.setActiveReciter({ reciterId });
    } catch {
      // Ignore
    }
  }
}

