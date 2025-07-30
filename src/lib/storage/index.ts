// IndexedDB wrapper for local storage and caching
import { ExportedProject, Chapter, Scene, ProjectConfiguration, EpubMetadata } from '@/lib/types/export';
import { Character } from '@/components/character-viewer/CharacterViewer';

export interface StoredProject {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  epubFile: {
    name: string;
    size: number;
    type: string;
  };
  metadata: EpubMetadata;
  chapters: Chapter[];
  characters: Character[];
  scenes: Scene[];
  generatedImages: StoredImage[];
  configuration: ProjectConfiguration;
}

export interface StoredImage {
  id: string;
  sceneId: string;
  url: string;
  prompt: string;
  createdAt: string;
  metadata: {
    model?: string;
    quality?: string;
    dimensions?: {
      width: number;
      height: number;
    };
  };
}

class VividPagesStorage {
  private dbName = 'VividPagesDB';
  private version = 1;
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Projects store
        if (!db.objectStoreNames.contains('projects')) {
          const projectStore = db.createObjectStore('projects', { keyPath: 'id' });
          projectStore.createIndex('name', 'name', { unique: false });
          projectStore.createIndex('createdAt', 'createdAt', { unique: false });
        }

        // Images store
        if (!db.objectStoreNames.contains('images')) {
          const imageStore = db.createObjectStore('images', { keyPath: 'id' });
          imageStore.createIndex('sceneId', 'sceneId', { unique: false });
          imageStore.createIndex('createdAt', 'createdAt', { unique: false });
        }

        // Cache store for API responses
        if (!db.objectStoreNames.contains('cache')) {
          const cacheStore = db.createObjectStore('cache', { keyPath: 'key' });
          cacheStore.createIndex('expiresAt', 'expiresAt', { unique: false });
        }
      };
    });
  }

  private async ensureDB(): Promise<IDBDatabase> {
    if (!this.db) {
      await this.init();
    }
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    return this.db;
  }

  async saveProject(project: StoredProject): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction(['projects'], 'readwrite');
    const store = transaction.objectStore('projects');
    
    const updatedProject = {
      ...project,
      updatedAt: new Date().toISOString(),
    };

    return new Promise((resolve, reject) => {
      const request = store.put(updatedProject);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to save project'));
    });
  }

  async getProject(id: string): Promise<StoredProject | null> {
    const db = await this.ensureDB();
    const transaction = db.transaction(['projects'], 'readonly');
    const store = transaction.objectStore('projects');

    return new Promise((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(new Error('Failed to get project'));
    });
  }

  async getAllProjects(): Promise<StoredProject[]> {
    const db = await this.ensureDB();
    const transaction = db.transaction(['projects'], 'readonly');
    const store = transaction.objectStore('projects');

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(new Error('Failed to get projects'));
    });
  }

  async deleteProject(id: string): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction(['projects'], 'readwrite');
    const store = transaction.objectStore('projects');

    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to delete project'));
    });
  }

  async saveImage(image: StoredImage): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction(['images'], 'readwrite');
    const store = transaction.objectStore('images');

    return new Promise((resolve, reject) => {
      const request = store.put(image);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to save image'));
    });
  }

  async getImagesByScene(sceneId: string): Promise<StoredImage[]> {
    const db = await this.ensureDB();
    const transaction = db.transaction(['images'], 'readonly');
    const store = transaction.objectStore('images');
    const index = store.index('sceneId');

    return new Promise((resolve, reject) => {
      const request = index.getAll(sceneId);
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(new Error('Failed to get images'));
    });
  }

  async deleteImage(id: string): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction(['images'], 'readwrite');
    const store = transaction.objectStore('images');

    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to delete image'));
    });
  }

  async getProjectImages(projectId: string): Promise<StoredImage[]> {
    const db = await this.ensureDB();
    const transaction = db.transaction(['images'], 'readonly');
    const store = transaction.objectStore('images');
    const index = store.index('projectId');

    return new Promise((resolve, reject) => {
      const request = index.getAll(projectId);
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(new Error('Failed to get project images'));
    });
  }

  async getImagesByIds(ids: string[]): Promise<StoredImage[]> {
    const db = await this.ensureDB();
    const transaction = db.transaction(['images'], 'readonly');
    const store = transaction.objectStore('images');

    const images: StoredImage[] = [];
    const promises = ids.map(id => 
      new Promise<void>((resolve) => {
        const request = store.get(id);
        request.onsuccess = () => {
          if (request.result) {
            images.push(request.result);
          }
          resolve();
        };
        request.onerror = () => resolve();
      })
    );

    await Promise.all(promises);
    return images;
  }

  async exportProject(projectId: string): Promise<ExportedProject | null> {
    const project = await this.getProject(projectId);
    if (!project) return null;

    const images = await this.getProjectImages(projectId);
    
    return {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      project: {
        id: project.id,
        name: project.name,
        createdAt: project.createdAt,
        metadata: project.metadata,
        configuration: project.configuration,
      },
      images: images.map(img => ({
        id: img.id,
        projectId: img.projectId,
        type: img.type,
        title: img.title,
        description: img.description,
        imageUrl: img.imageUrl,
        prompt: img.prompt,
        chapter: img.chapter,
        scene: img.scene,
        characterId: img.characterId,
        tags: img.tags,
        createdAt: img.createdAt,
        metadata: img.metadata,
      })),
    };
  }

  async importProject(data: ExportedProject): Promise<boolean> {
    try {
      if (!data.project || !data.version) {
        throw new Error('Invalid import data format');
      }

      // Convert exported project back to stored project format
      const projectToSave: StoredProject = {
        id: data.project.id,
        name: data.project.name,
        createdAt: data.project.createdAt,
        updatedAt: new Date().toISOString(),
        epubFile: {
          name: data.project.name + '.epub',
          size: 0,
          type: 'application/epub+zip',
        },
        metadata: data.project.metadata,
        chapters: [],
        characters: [],
        scenes: [],
        generatedImages: [],
        configuration: data.project.configuration,
      };

      // Save project
      await this.saveProject(projectToSave);

      // Save images if present
      if (data.images && Array.isArray(data.images)) {
        for (const image of data.images) {
          await this.saveImage(image as StoredImage);
        }
      }

      return true;
    } catch (error) {
      console.error('Import project error:', error);
      return false;
    }
  }

  // Cache management
  async setCache<T>(key: string, value: T, ttlMinutes = 60): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction(['cache'], 'readwrite');
    const store = transaction.objectStore('cache');

    const cacheItem = {
      key,
      value,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString(),
    };

    return new Promise((resolve, reject) => {
      const request = store.put(cacheItem);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to set cache'));
    });
  }

  async getCache<T>(key: string): Promise<T | null> {
    const db = await this.ensureDB();
    const transaction = db.transaction(['cache'], 'readonly');
    const store = transaction.objectStore('cache');

    return new Promise((resolve, reject) => {
      const request = store.get(key);
      request.onsuccess = () => {
        const result = request.result;
        if (!result) {
          resolve(null);
          return;
        }

        // Check if expired
        if (new Date(result.expiresAt) < new Date()) {
          // Clean up expired cache
          this.deleteCache(key);
          resolve(null);
          return;
        }

        resolve(result.value);
      };
      request.onerror = () => reject(new Error('Failed to get cache'));
    });
  }

  async deleteCache(key: string): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction(['cache'], 'readwrite');
    const store = transaction.objectStore('cache');

    return new Promise((resolve, reject) => {
      const request = store.delete(key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to delete cache'));
    });
  }

  async clearExpiredCache(): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction(['cache'], 'readwrite');
    const store = transaction.objectStore('cache');
    const index = store.index('expiresAt');

    const now = new Date().toISOString();
    const range = IDBKeyRange.upperBound(now);

    return new Promise((resolve, reject) => {
      const request = index.openCursor(range);
      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };
      request.onerror = () => reject(new Error('Failed to clear expired cache'));
    });
  }

  // Utility functions
  async getStorageUsage(): Promise<{ used: number; quota: number }> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      return {
        used: estimate.usage || 0,
        quota: estimate.quota || 0,
      };
    }
    return { used: 0, quota: 0 };
  }

  async exportProject(id: string): Promise<Blob> {
    const project = await this.getProject(id);
    if (!project) {
      throw new Error('Project not found');
    }

    const exportData = {
      project,
      exportedAt: new Date().toISOString(),
      version: '1.0',
    };

    return new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });
  }

  async importProject(file: File): Promise<string> {
    const text = await file.text();
    const data = JSON.parse(text);
    
    if (!data.project || !data.project.id) {
      throw new Error('Invalid project file');
    }

    // Generate new ID to avoid conflicts
    const newId = `project-${Date.now()}`;
    const project = {
      ...data.project,
      id: newId,
      name: `${data.project.name} (Imported)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await this.saveProject(project);
    return newId;
  }
}

// Export singleton instance
export const storage = new VividPagesStorage();