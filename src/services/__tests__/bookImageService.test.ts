import { BookImageService, BookImageServiceError } from '../bookImageService';
import { ImageGenerationService, Scene } from '../imageGenerationService';
import { SceneSelectionService } from '../sceneSelectionService';
import { Chapter } from '../epubService';
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../imageGenerationService');
vi.mock('../sceneSelectionService');

describe('BookImageService', () => {
  const onProgressMock = vi.fn();

  const mockChapter: Chapter = {
    id: 'chapter1',
    title: 'Test Chapter',
    content: 'Test content',
    sections: [],
    characterDescriptions: []
  };

  const mockScene: Scene = {
    description: 'Test scene description',
    prompt: 'Test prompt with more details',
    imageData: 'base64_encoded_image_data',
    chapterId: 'chapter1',
    paragraphIndex: 0,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should process a chapter successfully', async () => {
    const service = new BookImageService({ onProgress: onProgressMock });

    const mockSceneData = {
      description: 'Test scene description',
      prompt: 'Test prompt with more details',
      imageData: 'base64_encoded_image_data',
      chapterId: 'chapter1',
      paragraphIndex: 0,
    };

    // Mock successful scene selection
    const selectScenesSpy = vi.spyOn(SceneSelectionService.prototype, 'selectScenesFromChapter')
      .mockResolvedValue([mockSceneData]);

    // Mock successful prompt generation
    const generatePromptSpy = vi.spyOn(SceneSelectionService.prototype, 'generatePromptForScene')
      .mockResolvedValue(mockSceneData);

    // Mock successful image generation
    const generateImageSpy = vi.spyOn(ImageGenerationService.prototype, 'generateSceneImage')
      .mockResolvedValue(mockSceneData);

    const result = await service.processChapter(mockChapter);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(mockSceneData);
    expect(onProgressMock).toHaveBeenCalledWith(1, 'analyzing');
    expect(onProgressMock).toHaveBeenCalledWith(1, 'generating-prompt');
    expect(onProgressMock).toHaveBeenCalledWith(1, 'generating-image');
    expect(onProgressMock).toHaveBeenCalledWith(1, 'complete');

    // Verify all services were called
    expect(selectScenesSpy).toHaveBeenCalledWith(mockChapter);
    expect(generatePromptSpy).toHaveBeenCalledWith(mockSceneData, mockChapter);
    expect(generateImageSpy).toHaveBeenCalledWith(mockSceneData);
  });

  it('should process a book successfully', async () => {
    const service = new BookImageService({ onProgress: onProgressMock, maxChapters: 2 });

    const mockChapter2: Chapter = {
      ...mockChapter,
      id: 'chapter2'
    };

    const mockScene2 = {
      ...mockScene,
      chapterId: 'chapter2'
    };

    // Mock successful scene selection for both chapters
    vi.spyOn(SceneSelectionService.prototype, 'selectScenesFromChapter')
      .mockResolvedValueOnce([mockScene])
      .mockResolvedValueOnce([mockScene2]);

    // Mock successful prompt generation
    vi.spyOn(SceneSelectionService.prototype, 'generatePromptForScene')
      .mockResolvedValueOnce(mockScene)
      .mockResolvedValueOnce(mockScene2);

    // Mock successful image generation
    vi.spyOn(ImageGenerationService.prototype, 'generateSceneImage')
      .mockResolvedValueOnce(mockScene)
      .mockResolvedValueOnce(mockScene2);

    const result = await service.processBook([mockChapter, mockChapter2]);

    expect(result.size).toBe(2);
    expect(result.get('chapter1')).toEqual([mockScene]);
    expect(result.get('chapter2')).toEqual([mockScene2]);
  });

  it('should respect maxChapters limit', async () => {
    const service = new BookImageService({ onProgress: onProgressMock, maxChapters: 1 });

    const mockChapter2: Chapter = {
      ...mockChapter,
      id: 'chapter2'
    };

    // Mock successful scene selection for first chapter
    vi.spyOn(SceneSelectionService.prototype, 'selectScenesFromChapter')
      .mockResolvedValue([mockScene]);

    // Mock successful prompt generation
    vi.spyOn(SceneSelectionService.prototype, 'generatePromptForScene')
      .mockResolvedValue(mockScene);

    // Mock successful image generation
    vi.spyOn(ImageGenerationService.prototype, 'generateSceneImage')
      .mockResolvedValue(mockScene);

    const result = await service.processBook([mockChapter, mockChapter2]);

    expect(result.size).toBe(1);
    expect(result.get('chapter1')).toEqual([mockScene]);
    expect(result.get('chapter2')).toBeUndefined();
  });

  it('should handle errors during scene selection', async () => {
    const service = new BookImageService({ onProgress: onProgressMock });

    const errorMessage = 'Failed to select scenes';
    // Mock scene selection to return empty array
    vi.spyOn(SceneSelectionService.prototype, 'selectScenesFromChapter')
      .mockRejectedValue(new Error(errorMessage));

    // Mock other services to ensure they're not called
    const promptSpy = vi.spyOn(SceneSelectionService.prototype, 'generatePromptForScene');
    const imageSpy = vi.spyOn(ImageGenerationService.prototype, 'generateSceneImage');

    await expect(service.processChapter(mockChapter))
      .rejects.toThrow(BookImageServiceError);
    await expect(service.processChapter(mockChapter))
      .rejects.toMatchObject({
        message: expect.stringContaining('Failed to select scenes'),
        originalError: expect.objectContaining({ message: errorMessage })
      });

    expect(promptSpy).not.toHaveBeenCalled();
    expect(imageSpy).not.toHaveBeenCalled();
  });

  it('should handle errors during prompt generation', async () => {
    const service = new BookImageService({ onProgress: onProgressMock });

    const mockSceneData = {
      description: 'Test scene description',
      prompt: '',
      imageData: '',
      chapterId: 'chapter1',
      paragraphIndex: 0,
    };

    const errorMessage = 'Failed to generate prompt';
    // Mock scene selection to succeed
    vi.spyOn(SceneSelectionService.prototype, 'selectScenesFromChapter')
      .mockResolvedValue([mockSceneData]);

    // Mock prompt generation to fail
    vi.spyOn(SceneSelectionService.prototype, 'generatePromptForScene')
      .mockRejectedValue(new Error(errorMessage));

    // Mock image generation to ensure it's not called
    const imageSpy = vi.spyOn(ImageGenerationService.prototype, 'generateSceneImage');

    await expect(service.processChapter(mockChapter))
      .rejects.toThrow(BookImageServiceError);
    await expect(service.processChapter(mockChapter))
      .rejects.toMatchObject({
        message: expect.stringContaining('Failed to generate prompt'),
        originalError: expect.objectContaining({ message: errorMessage })
      });

    expect(imageSpy).not.toHaveBeenCalled();
  });

  it('should handle errors during image generation', async () => {
    const service = new BookImageService({ onProgress: onProgressMock });

    const mockSceneData = {
      description: 'Test scene description',
      prompt: 'Test prompt',
      imageData: '',
      chapterId: 'chapter1',
      paragraphIndex: 0,
    };

    const errorMessage = 'Failed to generate image';
    // Mock scene selection and prompt generation to succeed
    vi.spyOn(SceneSelectionService.prototype, 'selectScenesFromChapter')
      .mockResolvedValue([mockSceneData]);
    vi.spyOn(SceneSelectionService.prototype, 'generatePromptForScene')
      .mockResolvedValue({ ...mockSceneData, prompt: 'Test prompt' });

    // Mock image generation to fail
    vi.spyOn(ImageGenerationService.prototype, 'generateSceneImage')
      .mockRejectedValue(new Error(errorMessage));

    await expect(service.processChapter(mockChapter))
      .rejects.toThrow(BookImageServiceError);
    await expect(service.processChapter(mockChapter))
      .rejects.toMatchObject({
        message: expect.stringContaining('Failed to generate image'),
        originalError: expect.objectContaining({ message: errorMessage })
      });
  });

  it('should handle errors during book processing', async () => {
    const service = new BookImageService({ onProgress: onProgressMock });

    const mockChapter2: Chapter = {
      ...mockChapter,
      id: 'chapter2'
    };

    const errorMessage = 'Test error';
    // Mock scene selection to fail for the first chapter
    vi.spyOn(SceneSelectionService.prototype, 'selectScenesFromChapter')
      .mockRejectedValueOnce(new Error(errorMessage));

    // Mock other services to ensure they're not called
    const promptSpy = vi.spyOn(SceneSelectionService.prototype, 'generatePromptForScene');
    const imageSpy = vi.spyOn(ImageGenerationService.prototype, 'generateSceneImage');

    await expect(service.processBook([mockChapter, mockChapter2]))
      .rejects.toThrow(BookImageServiceError);
    await expect(service.processBook([mockChapter, mockChapter2]))
      .rejects.toMatchObject({
        message: expect.stringContaining('Failed to process book'),
        originalError: expect.objectContaining({ message: errorMessage })
      });

    expect(promptSpy).not.toHaveBeenCalled();
    expect(imageSpy).not.toHaveBeenCalled();
  });
}); 