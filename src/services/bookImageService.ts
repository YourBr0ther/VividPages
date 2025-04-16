import { Chapter } from './epubService';
import { Scene, ImageGenerationService } from './imageGenerationService';
import { SceneSelectionService } from './sceneSelectionService';

export type GenerationStep = 'analyzing' | 'generating-prompt' | 'generating-image' | 'complete';

export interface BookImageServiceConfig {
  stableDiffusionUrl?: string;
  openaiApiKey?: string;
  maxScenesPerChapter?: number;
  maxChapters?: number;
  onProgress?: (scene: number, step: GenerationStep) => void;
  imageGenerationConfig?: {
    steps?: number;
    cfgScale?: number;
    width?: number;
    height?: number;
  };
  sceneSelectionConfig?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  };
}

export class BookImageServiceError extends Error {
  constructor(message: string, public originalError?: Error) {
    super(message);
    this.name = 'BookImageServiceError';
  }
}

export class BookImageService {
  private imageGenerationService: ImageGenerationService;
  private sceneSelectionService: SceneSelectionService;
  private maxChapters: number;
  private onProgress?: (scene: number, step: GenerationStep) => void;

  constructor(config: BookImageServiceConfig = {}) {
    const env = typeof import.meta !== 'undefined' ? import.meta.env : process.env;
    this.maxChapters = config.maxChapters || parseInt(env.VITE_MAX_CHAPTERS || '3');
    this.onProgress = config.onProgress;

    this.imageGenerationService = new ImageGenerationService({
      stableDiffusionUrl: config.stableDiffusionUrl,
      ...config.imageGenerationConfig
    });

    this.sceneSelectionService = new SceneSelectionService({
      openaiApiKey: config.openaiApiKey,
      maxScenesPerChapter: config.maxScenesPerChapter,
      ...config.sceneSelectionConfig
    });
  }

  async processChapter(chapter: Chapter): Promise<Scene[]> {
    try {
      // Step 1: Select scenes from the chapter
      this.onProgress?.(1, 'analyzing');
      const scenes = await this.sceneSelectionService.selectScenesFromChapter(chapter);
      if (!scenes || !Array.isArray(scenes) || scenes.length === 0) {
        throw new BookImageServiceError('No valid scenes were selected from the chapter');
      }

      // Step 2: Generate prompts for each scene
      const scenesWithPrompts = await Promise.all(
        scenes.map(async (scene, index) => {
          try {
            this.onProgress?.(index + 1, 'generating-prompt');
            const sceneWithPrompt = await this.sceneSelectionService.generatePromptForScene(scene, chapter);
            if (!sceneWithPrompt || !sceneWithPrompt.prompt) {
              throw new BookImageServiceError('No valid prompt was generated for scene');
            }
            return { ...sceneWithPrompt, chapterId: chapter.id };
          } catch (error) {
            throw new BookImageServiceError(
              `Failed to generate prompt for scene ${index + 1}`,
              error instanceof Error ? error : undefined
            );
          }
        })
      );

      // Step 3: Generate images for each scene
      const scenesWithImages = await Promise.all(
        scenesWithPrompts.map(async (scene, index) => {
          try {
            this.onProgress?.(index + 1, 'generating-image');
            const result = await this.imageGenerationService.generateSceneImage(scene);
            if (!result || !result.imageData) {
              throw new BookImageServiceError('No valid image was generated for scene');
            }
            this.onProgress?.(index + 1, 'complete');
            return { ...result, chapterId: chapter.id };
          } catch (error) {
            throw new BookImageServiceError(
              `Failed to generate image for scene ${index + 1}`,
              error instanceof Error ? error : undefined
            );
          }
        })
      );

      return scenesWithImages;
    } catch (error) {
      if (error instanceof BookImageServiceError) {
        throw error;
      }
      throw new BookImageServiceError('Failed to process chapter', error instanceof Error ? error : undefined);
    }
  }

  async processBook(chapters: Chapter[]): Promise<Map<string, Scene[]>> {
    try {
      const chapterScenes = new Map<string, Scene[]>();

      // Process only up to maxChapters
      const chaptersToProcess = chapters.slice(0, this.maxChapters);

      for (const chapter of chaptersToProcess) {
        const scenes = await this.processChapter(chapter);
        chapterScenes.set(chapter.id, scenes);
      }

      return chapterScenes;
    } catch (error) {
      throw new BookImageServiceError('Failed to process book', error instanceof Error ? error : undefined);
    }
  }
} 