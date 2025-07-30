interface GeneratedImage {
  url: string;
  id: string;
  createdAt: string;
}

interface ImageGenerationOptions {
  quality?: 'standard' | 'hd';
  size?: '256x256' | '512x512' | '1024x1024' | '1792x1024' | '1024x1792';
}

export class ImageGenerator {
  private apiKey: string;
  private baseUrl: string = 'https://api.openai.com/v1/images/generations';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async validateApiKey(): Promise<boolean> {
    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  async generateCharacterPortrait(
    characterName: string,
    description: string,
    options: ImageGenerationOptions = {}
  ): Promise<GeneratedImage> {
    try {
      const { quality = 'standard', size = '512x512' } = options;
      
      // Create a detailed prompt for character portrait
      const prompt = `A detailed portrait of ${characterName}. ${description}. 
      Professional character art style, clear facial features, good lighting, 
      suitable for a book illustration. High quality digital art.`;

      // DALL-E 2 doesn't support quality parameter, only DALL-E 3 does
      const requestBody: any = {
        model: 'dall-e-2', // Default to DALL-E 2 for character portraits
        prompt: prompt.slice(0, 1000), // Limit prompt length
        n: 1,
        size: size,
        response_format: 'url'
      };

      // Only add quality for DALL-E 3
      if (requestBody.model === 'dall-e-3') {
        requestBody.quality = quality;
      }

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      
      if (!data.data || data.data.length === 0) {
        throw new Error('No image generated');
      }

      const imageData = data.data[0];
      
      return {
        url: imageData.url,
        id: `${characterName}-${Date.now()}`,
        createdAt: new Date().toISOString(),
      };

    } catch (error) {
      console.error('Error generating character portrait:', error);
      throw new Error(`Image generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async generateImage(options: { 
    prompt: string; 
    model?: string; 
    quality?: 'standard' | 'hd'; 
    size?: string; 
    style?: string 
  }): Promise<GeneratedImage> {
    try {
      const { prompt, quality = 'standard', size = '512x512', model = 'dall-e-2' } = options;

      // DALL-E 2 doesn't support quality parameter, only DALL-E 3 does
      const requestBody: any = {
        model: model,
        prompt: prompt.slice(0, 1000),
        n: 1,
        size: size,
        response_format: 'url'
      };

      // Only add quality for DALL-E 3
      if (model === 'dall-e-3') {
        requestBody.quality = quality;
      }

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      
      if (!data.data || data.data.length === 0) {
        throw new Error('No image generated');
      }

      const imageData = data.data[0];
      
      return {
        url: imageData.url,
        id: `img-${Date.now()}`,
        createdAt: new Date().toISOString(),
      };

    } catch (error) {
      console.error('Error generating image:', error);
      throw new Error(`Image generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async generateSceneImage(
    sceneDescription: string,
    characters: string[] = [],
    setting: string = '',
    mood: string = '',
    options: ImageGenerationOptions & { model?: string; style?: string } = {}
  ): Promise<GeneratedImage> {
    try {
      const { quality = 'standard', size = '1024x1024', model = 'dall-e-3' } = options;
      
      // Create a detailed scene prompt
      let prompt = `A detailed scene illustration: ${sceneDescription}`;
      
      if (characters.length > 0) {
        prompt += ` featuring ${characters.join(', ')}`;
      }
      
      if (setting) {
        prompt += ` in ${setting}`;
      }
      
      if (mood) {
        prompt += ` with a ${mood} atmosphere`;
      }
      
      prompt += '. Professional book illustration style, detailed, atmospheric.';

      return await this.generateImage({
        prompt,
        model,
        quality,
        size
      });

    } catch (error) {
      console.error('Error generating scene image:', error);
      throw new Error(`Scene image generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async generateSceneWithCharacterPortraits(
    sceneDescription: string,
    setting: string,
    mood: string,
    characterPortraits: Array<{
      name: string;
      description: string;
      imageUrl?: string;
    }>,
    options: ImageGenerationOptions & { model?: string; style?: string } = {}
  ): Promise<GeneratedImage> {
    try {
      const { quality = 'standard', size = '1024x1024', model = 'dall-e-3' } = options;
      
      // Build character descriptions for consistent appearance
      const characterDescriptions = characterPortraits.map(char => {
        return `${char.name} (${char.description})`;
      }).join(', ');
      
      // Create enhanced scene prompt with character consistency
      let prompt = `A detailed cinematic scene: ${sceneDescription}`;
      
      if (characterPortraits.length > 0) {
        prompt += ` featuring ${characterDescriptions}`;
      }
      
      if (setting) {
        prompt += ` in ${setting}`;
      }
      
      if (mood) {
        prompt += ` with a ${mood} mood`;
      }
      
      // Add style instructions for consistency
      prompt += '. Professional book illustration style, detailed character faces matching their descriptions, cinematic composition, atmospheric lighting, high quality digital art.';
      
      // Note: DALL-E doesn't support image-to-image generation, so we rely on detailed text descriptions
      // In the future, this could be enhanced with ControlNet or other tools that support reference images
      
      return await this.generateImage({
        prompt,
        model,
        quality,
        size
      });

    } catch (error) {
      console.error('Error generating scene with character portraits:', error);
      throw new Error(`Scene generation with character portraits failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getAvailableModels(): Promise<string[]> {
    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      // Filter for DALL-E models
      return data.data
        .filter((model: { id: string }) => 
          model.id.includes('dall-e') || model.id.includes('dalle')
        )
        .map((model: { id: string }) => model.id)
        .sort();

    } catch (error) {
      console.error('Error fetching available models:', error);
      return [];
    }
  }
}