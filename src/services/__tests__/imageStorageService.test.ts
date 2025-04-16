import { ImageStorageService } from '../imageStorageService';
import { Scene } from '../imageGenerationService';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('ImageStorageService', () => {
  let service: ImageStorageService;
  let mockScene: Scene;

  beforeEach(() => {
    service = new ImageStorageService();
    mockScene = {
      description: 'Test scene',
      prompt: 'Test prompt',
      imageData: 'base64_encoded_image_data',
      chapterId: 'chapter1',
      paragraphIndex: 0
    };
  });

  afterEach(async () => {
    await service.clearAllScenes();
  });

  it('should save and retrieve a scene', async () => {
    await service.saveScene(mockScene);
    const scenes = await service.getScenesForChapter('chapter1');
    
    expect(scenes).toHaveLength(1);
    expect(scenes[0]).toEqual(mockScene);
  });

  it('should retrieve multiple scenes for a chapter', async () => {
    const scene2 = {
      ...mockScene,
      paragraphIndex: 1
    };

    await service.saveScene(mockScene);
    await service.saveScene(scene2);
    
    const scenes = await service.getScenesForChapter('chapter1');
    expect(scenes).toHaveLength(2);
    expect(scenes).toContainEqual(mockScene);
    expect(scenes).toContainEqual(scene2);
  });

  it('should not mix scenes from different chapters', async () => {
    const scene2 = {
      ...mockScene,
      chapterId: 'chapter2'
    };

    await service.saveScene(mockScene);
    await service.saveScene(scene2);
    
    const scenes1 = await service.getScenesForChapter('chapter1');
    const scenes2 = await service.getScenesForChapter('chapter2');
    
    expect(scenes1).toHaveLength(1);
    expect(scenes1[0]).toEqual(mockScene);
    expect(scenes2).toHaveLength(1);
    expect(scenes2[0]).toEqual(scene2);
  });

  it('should delete scenes for a specific chapter', async () => {
    const scene2 = {
      ...mockScene,
      chapterId: 'chapter2'
    };

    await service.saveScene(mockScene);
    await service.saveScene(scene2);
    
    await service.deleteScenesForChapter('chapter1');
    
    const scenes1 = await service.getScenesForChapter('chapter1');
    const scenes2 = await service.getScenesForChapter('chapter2');
    
    expect(scenes1).toHaveLength(0);
    expect(scenes2).toHaveLength(1);
  });

  it('should clear all scenes', async () => {
    const scene2 = {
      ...mockScene,
      chapterId: 'chapter2'
    };

    await service.saveScene(mockScene);
    await service.saveScene(scene2);
    
    await service.clearAllScenes();
    
    const scenes1 = await service.getScenesForChapter('chapter1');
    const scenes2 = await service.getScenesForChapter('chapter2');
    
    expect(scenes1).toHaveLength(0);
    expect(scenes2).toHaveLength(0);
  });

  it('should handle errors gracefully', async () => {
    // Mock IndexedDB to simulate an error
    const mockError = new Error('Database error');
    const mockRequest = {
      onerror: vi.fn(),
      onsuccess: vi.fn(),
      result: null,
      error: mockError
    };

    const mockOpenRequest = {
      onerror: vi.fn(),
      onsuccess: vi.fn(),
      onupgradeneeded: vi.fn(),
      result: {
        createObjectStore: vi.fn(),
        transaction: vi.fn().mockReturnValue({
          objectStore: vi.fn().mockReturnValue({
            put: vi.fn().mockReturnValue(mockRequest)
          })
        })
      }
    };

    vi.spyOn(window, 'indexedDB', 'get').mockReturnValue({
      open: vi.fn().mockReturnValue(mockOpenRequest)
    } as any);

    await expect(service.saveScene(mockScene)).rejects.toThrow('Database error');
  });
}); 