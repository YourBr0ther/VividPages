import { Chapter } from './epubService';

export interface Scene {
  description: string;
  prompt: string;
  imageData?: string;
  chapterId: string;
  paragraphIndex: number;
}

export interface ImageGenerationConfig {
  stableDiffusionUrl?: string;
  steps?: number;
  cfgScale?: number;
  width?: number;
  height?: number;
}

export class ImageGenerationService {
  private config: Required<ImageGenerationConfig>;

  constructor(config: ImageGenerationConfig = {}) {
    const defaultUrl = 'http://127.0.0.1:7860';
    this.config = {
      stableDiffusionUrl: config.stableDiffusionUrl || import.meta.env.VITE_STABLE_DIFFUSION_URL || defaultUrl,
      steps: config.steps || parseInt(import.meta.env.VITE_STABLE_DIFFUSION_STEPS || '20'),
      cfgScale: config.cfgScale || parseFloat(import.meta.env.VITE_STABLE_DIFFUSION_CFG_SCALE || '7.5'),
      width: config.width || parseInt(import.meta.env.VITE_STABLE_DIFFUSION_WIDTH || '512'),
      height: config.height || parseInt(import.meta.env.VITE_STABLE_DIFFUSION_HEIGHT || '512')
    };
  }

  async generateImage(prompt: string): Promise<string> {
    try {
      const response = await fetch(`${this.config.stableDiffusionUrl}/sdapi/v1/txt2img`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          negative_prompt: "blurry, low quality, distorted, deformed, ugly, bad anatomy, bad proportions",
          steps: this.config.steps,
          cfg_scale: this.config.cfgScale,
          width: this.config.width,
          height: this.config.height,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to generate image: ${response.statusText}`);
      }

      const data = await response.json();
      return data.images[0];
    } catch (error) {
      console.error('Error generating image:', error);
      if (error instanceof Error) {
        throw new Error(`Error generating image: ${error.message}`);
      }
      throw error;
    }
  }

  async generateSceneImage(scene: Scene): Promise<Scene> {
    try {
      const imageData = await this.generateImage(scene.prompt);
      return {
        ...scene,
        imageData
      };
    } catch (error) {
      console.error('Error generating scene image:', error);
      if (error instanceof Error) {
        throw new Error(`Error generating scene image: ${error.message}`);
      }
      throw error;
    }
  }
} 