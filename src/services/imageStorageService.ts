import { Scene } from './imageGenerationService';

const DB_NAME = 'VividPages';
const STORE_NAME = 'scenes';
const DB_VERSION = 1;

export class ImageStorageService {
  private db: IDBDatabase | null = null;

  constructor() {
    this.initDB();
  }

  private async initDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('Error opening IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: ['chapterId', 'paragraphIndex'] });
          store.createIndex('chapterId', 'chapterId', { unique: false });
        }
      };
    });
  }

  async saveScene(scene: Scene): Promise<void> {
    if (!this.db) {
      await this.initDB();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      const request = store.put(scene);

      request.onsuccess = () => resolve();
      request.onerror = () => {
        console.error('Error saving scene:', request.error);
        reject(request.error);
      };
    });
  }

  async getScenesForChapter(chapterId: string): Promise<Scene[]> {
    if (!this.db) {
      await this.initDB();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('chapterId');
      const request = index.getAll(chapterId);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        console.error('Error getting scenes:', request.error);
        reject(request.error);
      };
    });
  }

  async deleteScenesForChapter(chapterId: string): Promise<void> {
    if (!this.db) {
      await this.initDB();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('chapterId');
      const request = index.openCursor(chapterId);

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };

      request.onerror = () => {
        console.error('Error deleting scenes:', request.error);
        reject(request.error);
      };
    });
  }

  async clearAllScenes(): Promise<void> {
    if (!this.db) {
      await this.initDB();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => {
        console.error('Error clearing scenes:', request.error);
        reject(request.error);
      };
    });
  }
} 