export interface ImageGenerationRequest {
  prompt: string;
  model?: 'dall-e-2' | 'dall-e-3';
  quality?: 'standard' | 'hd';
  size?: '256x256' | '512x512' | '1024x1024' | '1792x1024' | '1024x1792';
  style?: 'vivid' | 'natural';
  n?: number;
}

export interface ImageGenerationResponse {
  created: number;
  data: Array<{
    url?: string;
    b64_json?: string;
    revised_prompt?: string;
  }>;
}

export interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  revisedPrompt?: string;
  createdAt: string;
  metadata: {
    model: string;
    quality: string;
    size: string;
    style?: string;
  };
}

export class ImageGenerator {
  private apiKey: string;
  private baseUrl = 'https://api.openai.com/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generateImage(request: ImageGenerationRequest): Promise<GeneratedImage> {
    const requestBody = {
      model: request.model || 'dall-e-2',
      prompt: request.prompt,
      quality: request.quality || 'standard',
      size: request.size || '512x512',
      style: request.style || 'vivid',
      n: 1,
      response_format: 'url',
    };

    try {
      const response = await fetch(`${this.baseUrl}/images/generations`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`OpenAI API error: ${errorData.error?.message || response.statusText}`);
      }

      const data: ImageGenerationResponse = await response.json();
      
      if (!data.data || data.data.length === 0) {
        throw new Error('No image generated');
      }

      const imageData = data.data[0];
      if (!imageData.url) {
        throw new Error('No image URL returned');
      }

      return {
        id: `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        url: imageData.url,
        prompt: request.prompt,
        revisedPrompt: imageData.revised_prompt,
        createdAt: new Date().toISOString(),
        metadata: {
          model: requestBody.model,
          quality: requestBody.quality,
          size: requestBody.size,
          style: requestBody.style,
        },
      };
    } catch (error) {
      console.error('Error generating image:', error);
      throw new Error(`Failed to generate image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async generateMultipleImages(
    request: ImageGenerationRequest,
    count: number = 1
  ): Promise<GeneratedImage[]> {
    const images: GeneratedImage[] = [];
    
    // Generate images sequentially to avoid rate limits
    for (let i = 0; i < count; i++) {
      try {
        const image = await this.generateImage(request);
        images.push(image);
        
        // Add delay between requests to respect rate limits
        if (i < count - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.error(`Failed to generate image ${i + 1}:`, error);
        // Continue with other images instead of failing completely
      }
    }

    return images;
  }

  async enhancePrompt(basePrompt: string, style: string = 'artistic'): Promise<string> {
    const styleModifiers = {
      artistic: 'digital art, detailed, vibrant colors, professional illustration',
      realistic: 'photorealistic, high detail, natural lighting, professional photography',
      fantasy: 'fantasy art, magical atmosphere, ethereal lighting, detailed fantasy illustration',
      vintage: 'vintage style, retro aesthetic, muted colors, classic illustration',
      cinematic: 'cinematic lighting, dramatic composition, movie scene, high quality render',
    };

    const modifier = styleModifiers[style as keyof typeof styleModifiers] || styleModifiers.artistic;
    
    return `${basePrompt}, ${modifier}`;
  }

  async generateSceneImage(
    sceneDescription: string,
    characters: string[],
    setting: string,
    mood: string,
    options: Partial<ImageGenerationRequest> = {}
  ): Promise<GeneratedImage> {
    let prompt = `Scene: ${sceneDescription}`;
    
    if (characters.length > 0) {
      prompt += `. Characters: ${characters.join(', ')}`;
    }
    
    if (setting) {
      prompt += `. Setting: ${setting}`;
    }
    
    if (mood) {
      prompt += `. Mood: ${mood}`;
    }

    const enhancedPrompt = await this.enhancePrompt(prompt, 'cinematic');

    return this.generateImage({
      prompt: enhancedPrompt,
      model: 'dall-e-2',
      quality: 'standard',
      size: '512x512',
      ...options,
    });
  }

  async generateCharacterPortrait(
    characterName: string,
    description: string,
    options: Partial<ImageGenerationRequest> = {}
  ): Promise<GeneratedImage> {
    const prompt = `Portrait of ${characterName}: ${description}`;
    const enhancedPrompt = await this.enhancePrompt(prompt, 'artistic');

    return this.generateImage({
      prompt: enhancedPrompt,
      model: 'dall-e-2',
      quality: 'standard',
      size: '512x512',
      ...options,
    });
  }

  // Utility method to download and convert image to base64 for storage
  async downloadImageAsBase64(url: string): Promise<string> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to download image');
      }
      
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result);
        };
        reader.onerror = () => reject(new Error('Failed to convert image to base64'));
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Error downloading image:', error);
      throw error;
    }
  }

  // Check API key validity
  async validateApiKey(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });
      return response.ok;
    } catch (error) {
      console.error('Error validating API key:', error);
      return false;
    }
  }

  // Get available models
  async getAvailableModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch models');
      }
      
      const data = await response.json();
      return data.data
        .filter((model: any) => model.id.includes('dall-e'))
        .map((model: any) => model.id);
    } catch (error) {
      console.error('Error fetching models:', error);
      return ['dall-e-2', 'dall-e-3']; // fallback
    }
  }
}