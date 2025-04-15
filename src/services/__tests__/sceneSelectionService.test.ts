import { SceneSelectionService } from '../sceneSelectionService';
import { Chapter } from '../epubService';
import { Scene } from '../imageGenerationService';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('SceneSelectionService', () => {
  const mockConfig = {
    openaiApiKey: 'test-api-key',
    maxScenesPerChapter: 3,
    model: 'gpt-4',
    temperature: 0.7,
    maxTokens: 1000
  };

  let service: SceneSelectionService;

  beforeEach(() => {
    // Mock environment variables
    vi.stubEnv('VITE_OPENAI_API_KEY', mockConfig.openaiApiKey);
    vi.stubEnv('VITE_MAX_SCENES_PER_CHAPTER', mockConfig.maxScenesPerChapter.toString());
    vi.stubEnv('VITE_OPENAI_MODEL', mockConfig.model);
    vi.stubEnv('VITE_OPENAI_TEMPERATURE', mockConfig.temperature.toString());
    vi.stubEnv('VITE_OPENAI_MAX_TOKENS', mockConfig.maxTokens.toString());

    service = new SceneSelectionService();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  describe('selectScenesFromChapter', () => {
    it('should select scenes from a chapter', async () => {
      const mockResponse = JSON.stringify([
        { description: 'A dramatic battle scene', paragraphIndex: 5 },
        { description: 'A peaceful village', paragraphIndex: 10 },
        { description: 'A mysterious forest', paragraphIndex: 15 }
      ]);

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ choices: [{ message: { content: mockResponse } }] })
      });

      const chapter: Chapter = {
        id: 'chapter1',
        title: 'The Adventure Begins',
        content: 'Once upon a time...',
        sections: [],
        characterDescriptions: []
      };

      const result = await service.selectScenesFromChapter(chapter);

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${mockConfig.openaiApiKey}`
          },
          body: expect.stringContaining(chapter.title)
        })
      );

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({
        description: 'A dramatic battle scene',
        prompt: '',
        chapterId: 'chapter1',
        paragraphIndex: 5
      });
    });

    it('should throw an error if the API request fails', async () => {
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

      await expect(service.selectScenesFromChapter(chapter)).rejects.toThrow(
        'Error selecting scenes from chapter: Error: Failed to call ChatGPT: Unauthorized'
      );
    });
  });

  describe('generatePromptForScene', () => {
    it('should generate a prompt for a scene', async () => {
      const mockResponse = JSON.stringify({
        prompt: 'A dramatic battle scene, digital art style, epic lighting, warriors clashing'
      });

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ choices: [{ message: { content: mockResponse } }] })
      });

      const scene: Scene = {
        description: 'A dramatic battle scene',
        prompt: '',
        chapterId: 'chapter1',
        paragraphIndex: 5
      };

      const chapter: Chapter = {
        id: 'chapter1',
        title: 'The Battle',
        content: 'The warriors clashed...',
        sections: [],
        characterDescriptions: []
      };

      const result = await service.generatePromptForScene(scene, chapter);

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${mockConfig.openaiApiKey}`
          },
          body: expect.stringContaining(scene.description)
        })
      );

      expect(result).toEqual({
        ...scene,
        prompt: 'A dramatic battle scene, digital art style, epic lighting, warriors clashing'
      });
    });

    it('should throw an error if prompt generation fails', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        statusText: 'Unauthorized'
      });

      const scene: Scene = {
        description: 'A dramatic battle scene',
        prompt: '',
        chapterId: 'chapter1',
        paragraphIndex: 5
      };

      const chapter: Chapter = {
        id: 'chapter1',
        title: 'The Battle',
        content: 'The warriors clashed...',
        sections: [],
        characterDescriptions: []
      };

      await expect(service.generatePromptForScene(scene, chapter)).rejects.toThrow(
        'Failed to generate prompt for scene'
      );
    });
  });
}); 