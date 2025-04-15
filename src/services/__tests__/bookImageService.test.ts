import { BookImageService } from '../bookImageService';
import { Chapter } from '../epubService';
import { Scene } from '../imageGenerationService';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('BookImageService', () => {
  const mockConfig = {
    stableDiffusionUrl: 'http://localhost:7860',
    openaiApiKey: 'test-api-key',
    sceneSelectionConfig: {
      model: 'gpt-4',
      temperature: 0.7,
      maxTokens: 1000
    }
  };

  let service: BookImageService;

  beforeEach(() => {
    // Mock environment variables
    vi.stubEnv('VITE_STABLE_DIFFUSION_URL', mockConfig.stableDiffusionUrl);
    vi.stubEnv('VITE_OPENAI_API_KEY', mockConfig.openaiApiKey);
    vi.stubEnv('VITE_OPENAI_MODEL', mockConfig.sceneSelectionConfig.model);
    vi.stubEnv('VITE_OPENAI_TEMPERATURE', mockConfig.sceneSelectionConfig.temperature.toString());
    vi.stubEnv('VITE_OPENAI_MAX_TOKENS', mockConfig.sceneSelectionConfig.maxTokens.toString());

    service = new BookImageService();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  describe('processChapter', () => {
    it('should process a chapter and generate images for selected scenes', async () => {
      const mockScenes = [
        { description: 'Scene 1', prompt: 'Prompt 1', chapterId: 'chapter1', paragraphIndex: 0 },
        { description: 'Scene 2', prompt: 'Prompt 2', chapterId: 'chapter1', paragraphIndex: 1 }
      ];

      const mockImageData = 'base64-encoded-image-data';

      // Mock scene selection response
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ choices: [{ message: { content: JSON.stringify(mockScenes) } }] })
        })
        // Mock prompt generation response for first scene
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ choices: [{ message: { content: JSON.stringify({ prompt: 'Prompt 1' }) } }] })
        })
        // Mock prompt generation response for second scene
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ choices: [{ message: { content: JSON.stringify({ prompt: 'Prompt 2' }) } }] })
        })
        // Mock image generation response for first scene
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ images: [mockImageData] })
        })
        // Mock image generation response for second scene
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ images: [mockImageData] })
        });

      const chapter: Chapter = {
        id: 'chapter1',
        title: 'Test Chapter',
        content: 'Test content',
        sections: [],
        characterDescriptions: []
      };

      const result = await service.processChapter(chapter);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        ...mockScenes[0],
        prompt: 'Prompt 1',
        imageData: mockImageData
      });
      expect(result[1]).toEqual({
        ...mockScenes[1],
        prompt: 'Prompt 2',
        imageData: mockImageData
      });
    });

    it('should handle errors during scene selection', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        statusText: 'Unauthorized'
      });

      const chapter: Chapter = {
        id: 'chapter1',
        title: 'Test Chapter',
        content: 'Test content',
        sections: [],
        characterDescriptions: []
      };

      await expect(service.processChapter(chapter)).rejects.toThrow(
        'Failed to process chapter'
      );
    });

    it('should handle errors during prompt generation', async () => {
      const mockScenes = [
        { description: 'Scene 1', prompt: 'Prompt 1', chapterId: 'chapter1', paragraphIndex: 0 }
      ];

      // Mock successful scene selection
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ choices: [{ message: { content: JSON.stringify(mockScenes) } }] })
        })
        // Mock failed prompt generation
        .mockResolvedValueOnce({
          ok: false,
          statusText: 'Unauthorized'
        });

      const chapter: Chapter = {
        id: 'chapter1',
        title: 'Test Chapter',
        content: 'Test content',
        sections: [],
        characterDescriptions: []
      };

      await expect(service.processChapter(chapter)).rejects.toThrow(
        'Failed to process chapter'
      );
    });

    it('should handle errors during image generation', async () => {
      const mockScenes = [
        { description: 'Scene 1', prompt: 'Prompt 1', chapterId: 'chapter1', paragraphIndex: 0 }
      ];

      // Mock successful scene selection and prompt generation
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ choices: [{ message: { content: JSON.stringify(mockScenes) } }] })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ choices: [{ message: { content: JSON.stringify({ prompt: 'Prompt 1' }) } }] })
        })
        // Mock failed image generation
        .mockResolvedValueOnce({
          ok: false,
          statusText: 'Internal Server Error'
        });

      const chapter: Chapter = {
        id: 'chapter1',
        title: 'Test Chapter',
        content: 'Test content',
        sections: [],
        characterDescriptions: []
      };

      await expect(service.processChapter(chapter)).rejects.toThrow(
        'Failed to process chapter'
      );
    });
  });

  describe('processBook', () => {
    it('should process all chapters in a book', async () => {
      const mockChapters: Chapter[] = [
        {
          id: 'chapter1',
          title: 'Chapter 1',
          content: 'Content 1',
          sections: [],
          characterDescriptions: []
        },
        {
          id: 'chapter2',
          title: 'Chapter 2',
          content: 'Content 2',
          sections: [],
          characterDescriptions: []
        }
      ];

      const mockScenes = [
        { description: 'Scene 1', prompt: 'Prompt 1', chapterId: 'chapter1', paragraphIndex: 0 }
      ];

      const mockImageData = 'base64-encoded-image-data';

      // Mock scene selection responses
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ choices: [{ message: { content: JSON.stringify(mockScenes) } }] })
        })
        // Mock prompt generation response
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ choices: [{ message: { content: JSON.stringify({ prompt: 'Prompt 1' }) } }] })
        })
        // Mock image generation response
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ images: [mockImageData] })
        });

      const result = await service.processBook(mockChapters);

      expect(result.size).toBe(1);
      expect(result.get('chapter1')).toEqual([{
        ...mockScenes[0],
        prompt: 'Prompt 1',
        imageData: mockImageData
      }]);
    });

    it('should handle errors during book processing', async () => {
      const mockChapters: Chapter[] = [
        {
          id: 'chapter1',
          title: 'Chapter 1',
          content: 'Content 1',
          sections: [],
          characterDescriptions: []
        }
      ];

      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        statusText: 'Unauthorized'
      });

      await expect(service.processBook(mockChapters)).rejects.toThrow(
        'Failed to process book'
      );
    });
  });
}); 