import { Chapter } from './epubService';

export interface Scene {
  description: string;
  prompt: string;
  imageData?: string; // This can be either a base64 string or a URL
  imageUrl?: string;  // Explicit URL field for OpenAI images
  chapterId: string;
  paragraphIndex: number;
}

export interface ImageGenerationConfig {
  stableDiffusionUrl?: string;
  model?: string;
  steps?: number;
  cfgScale?: number;
  distilledCfgScale?: number;
  width?: number;
  height?: number;
  sampler?: string;
  seed?: number;
  safetyChecker?: boolean;
  enhancePrompt?: boolean;
  batchSize?: number;
  clipSkip?: number;
  vae?: string;
}

export class ImageGenerationService {
  private config: Required<ImageGenerationConfig>;

  constructor(config: ImageGenerationConfig = {}) {
    const defaultUrl = 'http://127.0.0.1:7860';
    this.config = {
      stableDiffusionUrl: config.stableDiffusionUrl || import.meta.env.VITE_STABLE_DIFFUSION_URL || defaultUrl,
      model: config.model || import.meta.env.VITE_STABLE_DIFFUSION_MODEL || 'flux1-dev-fp8',
      steps: config.steps || parseInt(import.meta.env.VITE_STABLE_DIFFUSION_STEPS || '20'),
      cfgScale: config.cfgScale || parseFloat(import.meta.env.VITE_STABLE_DIFFUSION_CFG_SCALE || '7.5'),
      distilledCfgScale: config.distilledCfgScale || parseFloat(import.meta.env.VITE_STABLE_DIFFUSION_DISTILLED_CFG_SCALE || '3.5'),
      width: config.width || parseInt(import.meta.env.VITE_STABLE_DIFFUSION_WIDTH || '768'),
      height: config.height || parseInt(import.meta.env.VITE_STABLE_DIFFUSION_HEIGHT || '512'),
      sampler: config.sampler || import.meta.env.VITE_STABLE_DIFFUSION_SAMPLER || 'Euler',
      seed: config.seed || parseInt(import.meta.env.VITE_STABLE_DIFFUSION_SEED || '-1'),
      safetyChecker: config.safetyChecker ?? false,
      enhancePrompt: config.enhancePrompt ?? false,
      batchSize: config.batchSize || parseInt(import.meta.env.VITE_STABLE_DIFFUSION_BATCH_SIZE || '1'),
      clipSkip: config.clipSkip || parseInt(import.meta.env.VITE_STABLE_DIFFUSION_CLIP_SKIP || '2'),
      vae: config.vae || import.meta.env.VITE_STABLE_DIFFUSION_VAE || 'ae.sft'
    };
  }

  private async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.stableDiffusionUrl}/sdapi/v1/options`, {
        method: 'GET'
      });
      
      if (!response.ok) {
        console.error('Failed to connect to Stable Diffusion:', response.statusText);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error testing connection:', error);
      return false;
    }
  }

  private logGenerationSettings(prompt: string, data: any) {
    console.log('=== Stable Diffusion Generation Settings ===');
    console.log('Model:', this.config.model);
    console.log('VAE:', this.config.vae);
    console.log('Prompt:', prompt);
    console.log('Steps:', this.config.steps);
    console.log('CFG Scale:', this.config.cfgScale);
    console.log('Distilled CFG Scale:', this.config.distilledCfgScale);
    console.log('Size:', `${this.config.width}x${this.config.height}`);
    console.log('Sampler:', this.config.sampler);
    console.log('Seed:', data.info ? JSON.parse(data.info).seed : this.config.seed);
    console.log('Batch Size:', this.config.batchSize);
    console.log('CLIP Skip:', this.config.clipSkip);
    console.log('========================================');
  }

  async generateImage(prompt: string, negativePrompt: string = ''): Promise<string> {
    try {
      const requestBody = {
        prompt,
        negative_prompt: negativePrompt,
        steps: this.config.steps,
        cfg_scale: this.config.cfgScale,
        width: this.config.width,
        height: this.config.height,
        sampler_name: this.config.sampler,
        sampler_index: this.config.sampler,
        seed: this.config.seed,
        batch_size: this.config.batchSize,
        n_iter: 1,
        restore_faces: false,
        tiling: false,
        enable_hr: false,
        override_settings: {
          sd_model_checkpoint: this.config.model,
          CLIP_stop_at_last_layers: this.config.clipSkip,
          distilled_cfg_scale: this.config.distilledCfgScale,
          sd_vae: this.config.vae
        }
      };

      console.log('Sending request to Stable Diffusion with payload:', JSON.stringify(requestBody, null, 2));

      try {
        const response = await fetch(`${this.config.stableDiffusionUrl}/sdapi/v1/txt2img`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Stable Diffusion API error:', {
            status: response.status,
            statusText: response.statusText,
            error: errorText
          });
          throw new Error(`Stable Diffusion API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log('Received response from Stable Diffusion:', {
          hasImages: !!data.images,
          imageCount: data.images?.length,
          firstImageLength: data.images?.[0]?.length,
          info: data.info
        });

        if (!data.images || !data.images[0]) {
          console.error('No images in response:', data);
          throw new Error('No image data received from the server');
        }

        // Handle the base64 image data
        try {
          const imageData = data.images[0];
          console.log('Processing image data, first 100 chars:', imageData.substring(0, 100));
          
          // Check if it's already a complete data URL
          if (imageData.startsWith('data:image/')) {
            this.logGenerationSettings(prompt, data);
            return imageData;
          }

          // Remove any whitespace or newlines that might have been added
          const cleanedImageData = imageData.trim();
          
          // More permissive base64 validation that allows for URL-safe base64
          const validBase64 = /^[A-Za-z0-9+/\-_]*={0,2}$/.test(cleanedImageData);
          if (!validBase64) {
            console.error('Invalid base64 data received. Length:', cleanedImageData.length);
            console.error('First 100 chars of cleaned data:', cleanedImageData.substring(0, 100));
            throw new Error('Invalid image data received from server');
          }

          this.logGenerationSettings(prompt, data);
          return `data:image/png;base64,${cleanedImageData}`;
        } catch (error) {
          console.error('Error processing image data:', error);
          throw new Error('Failed to process image data from server');
        }
      } catch (networkError) {
        console.error('Network error while calling Stable Diffusion API:', networkError);
        throw new Error('Failed to connect to Stable Diffusion API. Please check your network connection and try again.');
      }
    } catch (error) {
      console.error('Error in generateImage:', error);
      throw error;
    }
  }

  async generateSceneImage(scene: Scene): Promise<Scene> {
    try {
      if (!scene.prompt) {
        throw new Error('Scene prompt is required');
      }

      const imageData = await this.generateImage(scene.prompt);
      return {
        ...scene,
        imageData
      };
    } catch (error) {
      console.error('Error generating scene image:', error);
      throw error;
    }
  }
} 