import { Chapter } from './epubService';
import { Scene, ImageGenerationService } from './imageGenerationService';
import { OpenAIImageService } from './openAIImageService';
import { SceneSelectionService } from './sceneSelectionService';

export type GenerationStep = 'analyzing' | 'generating-prompt' | 'generating-image' | 'complete';
export type ImageProvider = 'stable-diffusion' | 'openai';

export interface BookImageServiceConfig {
  stableDiffusionUrl?: string;
  openaiApiKey?: string;
  maxScenesPerChapter?: number;
  maxChapters?: number;
  onProgress?: (scene: number, step: GenerationStep) => void;
  imageProvider?: ImageProvider;
  imageGenerationConfig?: {
    steps?: number;
    cfgScale?: number;
    width?: number;
    height?: number;
    vae?: string;
  };
  openAIImageConfig?: {
    model?: string;
    size?: '256x256' | '512x512' | '1024x1024';
    quality?: 'standard' | 'hd';
    style?: 'vivid' | 'natural';
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
  private imageGenerationService: ImageGenerationService | OpenAIImageService;
  private sceneSelectionService: SceneSelectionService;
  private maxChapters: number;
  private onProgress?: (scene: number, step: GenerationStep) => void;

  constructor(config: BookImageServiceConfig = {}) {
    const env = typeof import.meta !== 'undefined' ? import.meta.env : process.env;
    this.maxChapters = config.maxChapters || parseInt(env.VITE_MAX_CHAPTERS || '3');
    this.onProgress = config.onProgress;

    const imageProvider = config.imageProvider || (env.VITE_IMAGE_PROVIDER as ImageProvider) || 'stable-diffusion';

    if (imageProvider === 'openai') {
      this.imageGenerationService = new OpenAIImageService({
        apiKey: config.openaiApiKey,
        ...config.openAIImageConfig
      });
    } else {
      this.imageGenerationService = new ImageGenerationService({
        stableDiffusionUrl: config.stableDiffusionUrl,
        ...config.imageGenerationConfig
      });
    }

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
      console.log('Selecting scenes from chapter:', chapter.id);
      const scenes = await this.sceneSelectionService.selectScenesFromChapter(chapter);
      if (!scenes || !Array.isArray(scenes) || scenes.length === 0) {
        throw new BookImageServiceError('No valid scenes were selected from the chapter');
      }
      console.log(`Selected ${scenes.length} scenes from chapter`);

      // Step 2: Generate prompts for each scene
      const scenesWithPrompts = await Promise.all(
        scenes.map(async (scene, index) => {
          try {
            this.onProgress?.(index + 1, 'generating-prompt');
            console.log(`Generating prompt for scene ${index + 1}:`, scene.description);
            const sceneWithPrompt = await this.sceneSelectionService.generatePromptForScene(scene, chapter);
            if (!sceneWithPrompt || !sceneWithPrompt.prompt) {
              throw new BookImageServiceError('No valid prompt was generated for scene');
            }
            console.log(`Generated prompt for scene ${index + 1}:`, sceneWithPrompt.prompt);
            return { ...sceneWithPrompt, chapterId: chapter.id };
          } catch (error) {
            console.error(`Error generating prompt for scene ${index + 1}:`, error);
            throw new BookImageServiceError(
              `Failed to generate prompt for scene ${index + 1}`,
              error instanceof Error ? error : undefined
            );
          }
        })
      );

      // Step 3: Generate images for each scene
      console.log('Generating images for scenes...');
      const scenesWithImages = await Promise.all(
        scenesWithPrompts.map(async (scene, index) => {
          try {
            this.onProgress?.(index + 1, 'generating-image');
            console.log(`Generating image for scene ${index + 1} with prompt:`, scene.prompt);
            const result = await this.imageGenerationService.generateSceneImage(scene);
            if (!result) {
              throw new BookImageServiceError('No result returned from image generation');
            }
            if (!result.imageData && !result.imageUrl) {
              throw new BookImageServiceError('No valid image data or URL was generated for scene');
            }
            console.log(`Successfully generated image for scene ${index + 1}`);
            this.onProgress?.(index + 1, 'complete');
            return { ...result, chapterId: chapter.id };
          } catch (error) {
            console.error(`Error generating image for scene ${index + 1}:`, {
              error,
              scene
            });
            throw new BookImageServiceError(
              `Failed to generate image for scene ${index + 1}`,
              error instanceof Error ? error : undefined
            );
          }
        })
      );

      return scenesWithImages;
    } catch (error) {
      console.error('Error processing chapter:', {
        error,
        chapterId: chapter.id
      });
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