import { Scene } from './imageGenerationService';

export interface OpenAIImageConfig {
  apiKey?: string;
  model?: string;
  size?: '1024x1024' | '1792x1024' | '1024x1792';  // Updated sizes for DALL-E 3
  quality?: 'standard' | 'hd';
  style?: 'vivid' | 'natural';
}

export class OpenAIImageService {
  private config: Required<OpenAIImageConfig>;

  constructor(config: OpenAIImageConfig = {}) {
    const env = typeof import.meta !== 'undefined' ? import.meta.env : process.env;
    this.config = {
      apiKey: config.apiKey || env.VITE_OPENAI_API_KEY || '',
      model: config.model || env.VITE_OPENAI_IMAGE_MODEL || 'dall-e-3',
      size: config.size || (env.VITE_OPENAI_IMAGE_SIZE as '1024x1024' | '1792x1024' | '1024x1792') || '1024x1024',
      quality: config.quality || (env.VITE_OPENAI_IMAGE_QUALITY as 'standard' | 'hd') || 'standard',
      style: config.style || (env.VITE_OPENAI_IMAGE_STYLE as 'vivid' | 'natural') || 'vivid'
    };

    this.validateConfig();
  }

  private validateConfig() {
    if (!this.config.apiKey) {
      throw new Error('OpenAI API key is required');
    }

    if (!this.config.apiKey.startsWith('sk-')) {
      console.warn('OpenAI API key format appears incorrect');
    }

    if (this.config.model !== 'dall-e-3') {
      console.warn('Only DALL-E 3 is currently supported');
    }

    // Validate size and quality combinations
    if (this.config.quality === 'hd' && this.config.size !== '1024x1024') {
      throw new Error('HD quality is only available for 1024x1024 images');
    }
  }

  private logGenerationSettings(prompt: string) {
    console.log('=== OpenAI Image Generation Settings ===');
    console.log('Model:', this.config.model);
    console.log('Size:', this.config.size);
    console.log('Quality:', this.config.quality);
    console.log('Style:', this.config.style);
    console.log('Prompt:', prompt);
    console.log('======================================');
  }

  async generateImage(prompt: string): Promise<string> {
    try {
      if (!this.config.apiKey) {
        throw new Error('OpenAI API key is required');
      }

      this.logGenerationSettings(prompt);

      // Log the request payload for debugging
      const requestPayload = {
        model: this.config.model,
        prompt: prompt,
        n: 1,
        size: this.config.size,
        quality: this.config.quality,
        style: this.config.style,
        response_format: 'url'
      };
      console.log('Sending request to OpenAI with payload:', requestPayload);

      const response = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
          'OpenAI-Organization': import.meta.env.VITE_OPENAI_ORG_ID || '' // Add organization ID if available
        },
        body: JSON.stringify(requestPayload)
      });

      // Log the raw response for debugging
      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorData = await response.json().catch(e => ({ error: 'Failed to parse error response' }));
        console.error('OpenAI API error response:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        throw new Error(`OpenAI API error: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      console.log('OpenAI API response:', data);
      
      if (!data.data || !data.data[0]?.url) {
        console.error('Invalid OpenAI response:', data);
        throw new Error('No image URL received from OpenAI');
      }

      // Return the URL directly
      return data.data[0].url;
    } catch (error) {
      // Enhanced error logging
      console.error('Error in generateImage:', {
        error,
        config: {
          ...this.config,
          apiKey: '***' // Hide the API key in logs
        }
      });
      throw error;
    }
  }

  async generateSceneImage(scene: Scene): Promise<Scene> {
    try {
      if (!scene.prompt) {
        throw new Error('Scene prompt is required');
      }

      const imageUrl = await this.generateImage(scene.prompt);
      return {
        ...scene,
        imageUrl
      };
    } catch (error) {
      console.error('Error generating scene image:', error);
      throw error;
    }
  }
} 