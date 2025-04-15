import { Chapter } from './epubService';
import { Scene, ImageGenerationService } from './imageGenerationService';
import { SceneSelectionService } from './sceneSelectionService';

export interface BookImageServiceConfig {
  stableDiffusionUrl?: string;
  openaiApiKey?: string;
  maxScenesPerChapter?: number;
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

export class BookImageService {
  private imageGenerationService: ImageGenerationService;
  private sceneSelectionService: SceneSelectionService;

  constructor(config: BookImageServiceConfig = {}) {
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
      const scenes = await this.sceneSelectionService.selectScenesFromChapter(chapter);

      // Step 2: Generate prompts for each scene
      const scenesWithPrompts = await Promise.all(
        scenes.map(scene => this.sceneSelectionService.generatePromptForScene(scene, chapter))
      );

      // Step 3: Generate images for each scene
      const scenesWithImages = await Promise.all(
        scenesWithPrompts.map(scene => this.imageGenerationService.generateSceneImage(scene))
      );

      return scenesWithImages;
    } catch (error) {
      console.error('Error processing chapter:', error);
      throw new Error('Failed to process chapter');
    }
  }

  async processBook(chapters: Chapter[]): Promise<Map<string, Scene[]>> {
    try {
      const chapterScenes = new Map<string, Scene[]>();

      for (const chapter of chapters) {
        const scenes = await this.processChapter(chapter);
        chapterScenes.set(chapter.id, scenes);
      }

      return chapterScenes;
    } catch (error) {
      console.error('Error processing book:', error);
      throw new Error('Failed to process book');
    }
  }
} 