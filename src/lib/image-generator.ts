interface GeneratedImage {
  url: string;
  id: string;
  createdAt: string;
}

interface ImageGenerationOptions {
  quality?: 'standard' | 'hd';
  size?: '256x256' | '512x512' | '1024x1024' | '1792x1024' | '1024x1792';
  artStyle?: string;
  genre?: string;
  model?: string;
  style?: string;
}

export class ImageGenerator {
  private apiKey: string;
  private baseUrl: string = 'https://api.openai.com/v1/images/generations';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private sanitizePrompt(prompt: string): string {
    // Comprehensive list of words/phrases that might trigger OpenAI safety filters
    const problematicTerms = [
      // Violence & weapons
      'violent', 'violence', 'aggressive', 'attack', 'assault', 'fight', 'fighting', 'battle', 'war', 'combat', 'weapon', 'weapons', 'gun', 'guns', 'knife', 'knives', 'sword', 'swords', 'blade', 'blades', 'dagger', 'axe', 'club', 'mace', 'spear', 'bow', 'arrow', 'crossbow', 'rifle', 'pistol', 'revolver', 'shotgun', 'firearm', 'ammunition', 'bullet', 'bullets', 'explosive', 'bomb', 'grenade',
      
      // Death & harm
      'death', 'dead', 'die', 'dying', 'kill', 'killing', 'murder', 'murdered', 'execution', 'executed', 'suicide', 'hanging', 'strangled', 'poisoned', 'assassin', 'killer', 'slaughter', 'massacre', 'genocide', 'torture', 'tortured', 'harm', 'hurt', 'pain', 'painful', 'suffering', 'wound', 'wounded', 'injury', 'injured', 'bleeding', 'blood', 'bloody', 'gore', 'gory', 'brutal', 'brutality', 'savage', 'cruel', 'cruelty',
      
      // Horror & fear
      'horror', 'horrific', 'terrifying', 'terror', 'terrorize', 'scary', 'frightening', 'nightmare', 'nightmarish', 'disturbing', 'disturbed', 'psychotic', 'insane', 'madness', 'crazy', 'lunatic', 'deranged', 'twisted', 'sick', 'perverted', 'evil', 'wicked', 'sinister', 'malicious', 'malevolent', 'demonic', 'demon', 'devil', 'satan', 'satanic', 'occult', 'cult', 'ritual', 'sacrifice', 'curse', 'cursed', 'haunted', 'ghost', 'zombie', 'undead', 'corpse', 'skeleton', 'skull',
      
      // Sexual content
      'sexual', 'sexy', 'nude', 'naked', 'topless', 'underwear', 'lingerie', 'erotic', 'seductive', 'sensual', 'intimate', 'passion', 'passionate', 'aroused', 'arousing', 'breast', 'breasts', 'chest', 'cleavage', 'revealing', 'exposed', 'suggestive',
      
      // Drugs & substances
      'drug', 'drugs', 'narcotic', 'cocaine', 'heroin', 'marijuana', 'cannabis', 'alcohol', 'drunk', 'drinking', 'beer', 'wine', 'liquor', 'vodka', 'whiskey', 'smoking', 'cigarette', 'tobacco', 'pipe', 'joint', 'high', 'stoned', 'overdose',
      
      // Hate & discrimination
      'hate', 'hatred', 'racist', 'racism', 'nazi', 'fascist', 'supremacist', 'genocide', 'ethnic', 'slur', 'discrimination', 'prejudice', 'bigot', 'bigotry',
      
      // Political & controversial
      'political', 'politician', 'election', 'vote', 'voting', 'president', 'prime minister', 'government', 'regime', 'dictator', 'dictatorship', 'communist', 'fascist', 'nazi', 'terrorist', 'terrorism', 'revolution', 'rebellion', 'protest', 'riot', 'coup',
      
      // Illegal activities
      'illegal', 'crime', 'criminal', 'thief', 'steal', 'stealing', 'robbery', 'burglar', 'fraud', 'scam', 'kidnap', 'kidnapping', 'ransom', 'smuggle', 'smuggling', 'trafficking', 'dealer', 'gang', 'mafia', 'cartel',
      
      // Specific problematic adjectives
      'dangerous', 'threatening', 'menacing', 'ominous', 'sinister', 'dark', 'shadowy', 'mysterious', 'forbidden', 'taboo', 'inappropriate', 'offensive', 'vulgar', 'crude', 'rude', 'disgusting', 'repulsive', 'revolting', 'hideous', 'grotesque', 'monstrous', 'abhorrent', 'vile', 'despicable'
    ];
    
    let sanitizedPrompt = prompt;
    
    // Remove problematic terms (case insensitive)
    problematicTerms.forEach(term => {
      const regex = new RegExp(`\\b${term}\\b`, 'gi');
      sanitizedPrompt = sanitizedPrompt.replace(regex, '');
    });
    
    // Clean up extra spaces and normalize
    sanitizedPrompt = sanitizedPrompt
      .replace(/\s+/g, ' ')
      .trim();
    
    // Ensure we still have a meaningful prompt
    if (sanitizedPrompt.length < 20) {
      return 'A character portrait in a professional art style, suitable for book illustration. Clean, family-friendly, artistic.';
    }
    
    // Add positive, safe descriptors to ensure compliance
    if (!sanitizedPrompt.includes('professional') && !sanitizedPrompt.includes('artistic')) {
      sanitizedPrompt += ' Professional artistic style, clean and appropriate.';
    }
    
    return sanitizedPrompt;
  }

  private validatePromptSafety(prompt: string): boolean {
    // Additional checks for prompt safety
    const lowercasePrompt = prompt.toLowerCase();
    
    // Check for minimum length
    if (prompt.trim().length < 5) {
      return false;
    }
    
    // Check for excessive profanity or inappropriate content markers
    const flaggedPhrases = [
      'inappropriate', 'nsfw', 'explicit', 'adult content', 'mature content',
      'graphic content', 'disturbing', 'offensive', 'controversial',
      'political content', 'real person', 'celebrity', 'public figure'
    ];
    
    for (const phrase of flaggedPhrases) {
      if (lowercasePrompt.includes(phrase)) {
        return false;
      }
    }
    
    return true;
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

  private async makeImageRequest(prompt: string, options: { quality: string; size: string }): Promise<GeneratedImage> {
    const { quality, size } = options;
    
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
      id: `character-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
  }

  async generateCharacterPortrait(
    characterName: string,
    description: string,
    options: ImageGenerationOptions = {}
  ): Promise<GeneratedImage> {
    const { quality = 'standard', size = '512x512', artStyle, genre } = options;
    
    // Pre-sanitize the character description and name
    const safeName = this.sanitizePrompt(characterName);
    const safeDescription = this.sanitizePrompt(description);
    
    // Build style and genre descriptors
    let styleDescriptor = 'Professional book illustration style';
    if (artStyle) {
      const safeArtStyle = this.sanitizePrompt(artStyle);
      styleDescriptor = `${safeArtStyle} art style`;
    }
    
    let genreDescriptor = '';
    if (genre) {
      const safeGenre = this.sanitizePrompt(genre);
      genreDescriptor = ` ${safeGenre} genre aesthetic,`;
    }
    
    // Create a detailed prompt for character portrait with safe, positive language
    const originalPrompt = `A detailed portrait illustration of ${safeName}. Character description: ${safeDescription}. 
    ${styleDescriptor},${genreDescriptor} clear artistic features, good lighting, 
    suitable for family-friendly literature. High quality digital artwork, appropriate and clean.`;
    
    console.log(`🎨 Character portrait prompt with style: ${originalPrompt.slice(0, 200)}...`);
    
    // Validate prompt safety before proceeding
    if (!this.validatePromptSafety(originalPrompt)) {
      throw new Error('Image generation failed: Content does not meet safety guidelines. Please use a different description.');
    }

    try {
      // First attempt with original prompt
      return await this.makeImageRequest(originalPrompt, { quality, size });
    } catch (error) {
      // If it fails due to safety system, try with sanitized prompt
      if (error instanceof Error && error.message.includes('safety system')) {
        console.log('🔄 Retrying with sanitized prompt due to safety system rejection...');
        const sanitizedPrompt = this.sanitizePrompt(originalPrompt);
        
        try {
          return await this.makeImageRequest(sanitizedPrompt, { quality, size });
        } catch (retryError) {
          console.error('Error generating character portrait after retry:', retryError);
          throw new Error(`Image generation failed: ${retryError instanceof Error ? retryError.message : 'Unknown error'}`);
        }
      }
      
      // For other errors, throw as-is
      console.error('Error generating character portrait:', error);
      throw new Error(`Image generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async generateImage(options: { 
    prompt: string; 
    model?: string; 
    quality?: 'standard' | 'hd'; 
    size?: string; 
    style?: string;
    artStyle?: string;
    genre?: string;
  }): Promise<GeneratedImage> {
    const { prompt, quality = 'standard', size = '512x512', model = 'dall-e-2', artStyle, genre, style } = options;
    
    // Pre-sanitize the prompt
    let safePrompt = this.sanitizePrompt(prompt);
    
    // Enhance prompt with style and genre if provided
    if (artStyle || style || genre) {
      let enhancedPrompt = safePrompt;
      
      if (artStyle) {
        const safeArtStyle = this.sanitizePrompt(artStyle);
        enhancedPrompt += ` In ${safeArtStyle} art style.`;
      } else if (style) {
        const safeStyle = this.sanitizePrompt(style);
        enhancedPrompt += ` In ${safeStyle} style.`;
      }
      
      if (genre) {
        const safeGenre = this.sanitizePrompt(genre);
        enhancedPrompt += ` ${safeGenre} genre aesthetic.`;
      }
      
      safePrompt = enhancedPrompt;
    }
    
    try {
      // First attempt with sanitized prompt

      // DALL-E 2 doesn't support quality parameter, only DALL-E 3 does
      const requestBody: any = {
        model: model,
        prompt: safePrompt.slice(0, 1000),
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
    options: ImageGenerationOptions = {}
  ): Promise<GeneratedImage> {
    try {
      const { quality = 'standard', size = '1024x1024', model = 'dall-e-3', artStyle, genre, style } = options;
      
      // Sanitize all inputs
      const safeSceneDescription = this.sanitizePrompt(sceneDescription);
      const safeCharacters = characters.map(char => this.sanitizePrompt(char));
      const safeSetting = this.sanitizePrompt(setting);
      const safeMood = this.sanitizePrompt(mood);
      
      // Build style and genre descriptors
      let styleDescriptor = 'Professional family-friendly book illustration style';
      if (artStyle) {
        const safeArtStyle = this.sanitizePrompt(artStyle);
        styleDescriptor = `${safeArtStyle} art style`;
      } else if (style) {
        const safeStyle = this.sanitizePrompt(style);
        styleDescriptor = `${safeStyle} art style`;
      }
      
      let genreDescriptor = '';
      if (genre) {
        const safeGenre = this.sanitizePrompt(genre);
        genreDescriptor = ` ${safeGenre} genre aesthetic,`;
      }
      
      // Create a detailed scene prompt with safe, positive language
      let prompt = `A detailed book illustration scene: ${safeSceneDescription}`;
      
      if (safeCharacters.length > 0) {
        prompt += ` featuring characters: ${safeCharacters.join(', ')}`;
      }
      
      if (safeSetting) {
        prompt += ` in the setting: ${safeSetting}`;
      }
      
      if (safeMood) {
        prompt += ` with a ${safeMood} atmosphere`;
      }
      
      prompt += `. ${styleDescriptor},${genreDescriptor} detailed, appropriate, clean artistic rendering.`;

      console.log(`🎬 Scene image prompt with style: ${prompt.slice(0, 200)}...`);

      return await this.generateImage({
        prompt,
        model,
        quality,
        size,
        artStyle,
        genre,
        style
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