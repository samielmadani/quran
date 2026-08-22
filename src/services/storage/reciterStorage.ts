export interface IReciterStorage {
  /**
   * Check if a specific surah has been downloaded for the given reciter.
   */
  isSurahDownloaded(reciterId: string, surah: number): Promise<boolean>;

  /**
   * Get all downloaded surah numbers (1..114) for a reciter.
   */
  getDownloadedSurahs(reciterId: string): Promise<number[]>;

  /**
   * Get a playable audio URL (blob URL in web, file URI in native, or null if not downloaded).
   */
  getAudioUrl(reciterId: string, surah: number): Promise<string | null>;

  /**
   * Download a single surah's audio file from remote URL and save it persistently.
   */
  downloadSurah(
    reciterId: string,
    surah: number,
    remoteUrl: string,
    signal?: AbortSignal,
  ): Promise<void>;

  /**
   * Delete all downloaded audio and data for the given reciter.
   */
  deleteReciter(reciterId: string): Promise<void>;

  /**
   * Check if a reciter has all surahs downloaded (default 114).
   */
  isReciterFullyDownloaded(reciterId: string, totalSurahs?: number): Promise<boolean>;

  /**
   * Get the ID of the currently active reciter.
   */
  getActiveReciterId(): Promise<string>;

  /**
   * Set the ID of the currently active reciter.
   */
  setActiveReciterId(reciterId: string): Promise<void>;
}

