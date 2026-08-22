import { Capacitor } from '@capacitor/core';
import type { IReciterStorage } from './reciterStorage';
import { WebReciterStorage } from './webReciterStorage';
import { AndroidReciterStorage } from './androidReciterStorage';

export type { IReciterStorage } from './reciterStorage';
export { WebReciterStorage } from './webReciterStorage';
export { AndroidReciterStorage } from './androidReciterStorage';

let storageInstance: IReciterStorage | null = null;

export const getReciterStorage = (): IReciterStorage => {
  if (!storageInstance) {
    if (Capacitor.isNativePlatform()) {
      storageInstance = new AndroidReciterStorage();
    } else {
      storageInstance = new WebReciterStorage();
    }
  }
  return storageInstance;
};

export const reciterStorage = getReciterStorage();

