interface Character {
  name: string;
  description: string;
  importance: number;
  imagePrompt?: string;
}

interface Scene {
  id: string;
  title: string;
  description: string;
  setting: string;
  characters: string[];
  mood: string;
  imagePrompt: string;
  chapterIndex: number;
  sceneIndex: number;
}

export class OpenAIClient {
  private baseUrl: string = 'https://api.openai.com/v1';
  private apiKey: string;
  private defaultModel: string;

  constructor(apiKey: string, defaultModel: string = 'gpt-3.5-turbo') {
    this.apiKey = apiKey;
    // Simple validation in constructor
    const validModels = ['gpt-4', 'gpt-3.5-turbo'];
    this.defaultModel = validModels.some(model => defaultModel.includes(model.split('-')[0])) 
      ? defaultModel 
      : 'gpt-3.5-turbo';
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
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

  async listModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.status}`);
      }

      const data = await response.json();
      return data.data
        .filter((model: any) => model.id.includes('gpt'))
        .map((model: any) => model.id)
        .sort();
    } catch (error) {
      console.error('Error listing OpenAI models:', error);
      return [];
    }
  }

  private async makeRequest(prompt: string, model?: string, responseFormat: 'text' | 'json' = 'text'): Promise<string> {
    const modelToUse = model || this.defaultModel;
    
    console.log(`🤖 Making OpenAI request with model: ${modelToUse}`);
    
    const messages = [
      {
        role: 'user' as const,
        content: prompt
      }
    ];

    const requestBody: any = {
      model: modelToUse,
      messages: messages,
      temperature: 0.7,
      max_tokens: 4000,
    };

    // Add response_format for JSON mode if supported
    if (responseFormat === 'json' && (modelToUse.includes('gpt-4') || modelToUse.includes('gpt-3.5-turbo'))) {
      requestBody.response_format = { type: 'json_object' };
    }

    console.log(`📡 Request URL: ${this.baseUrl}/chat/completions`);
    console.log(`📦 Request body model: ${requestBody.model}`);

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(`❌ OpenAI API error: ${response.status}`);
      console.error(`❌ Error details:`, errorData);
      throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '';
  }

  private getValidOpenAIModel(model?: string): string {
    // List of valid OpenAI models for chat completions
    const validModels = [
      'gpt-4',
      'gpt-4-32k',
      'gpt-4-turbo-preview',
      'gpt-4-1106-preview',
      'gpt-3.5-turbo',
      'gpt-3.5-turbo-16k',
      'gpt-3.5-turbo-1106'
    ];
    
    if (model && validModels.some(validModel => model.includes(validModel.split('-')[0]))) {
      return model;
    }
    
    // Default to a reliable model
    return 'gpt-3.5-turbo';
  }

  async extractCharacters(
    bookText: string, 
    maxCharacters: number = 10, 
    importanceThreshold: number = 0.7,
    model?: string
  ): Promise<Character[]> {
    try {
      const modelToUse = this.getValidOpenAIModel(model);
      
      console.log(`👥 Starting character extraction with OpenAI...`);
      console.log(`📝 Model: ${modelToUse}`);
      console.log(`📊 Book text length: ${bookText.length} characters`);
      console.log(`🎯 Max characters: ${maxCharacters}, Threshold: ${importanceThreshold}`);

      const prompt = `You are a helpful assistant that analyzes book text and extracts key characters. 

Analyze the following text and extract the most important characters. For each character, provide:
1. Name (the character's name or role if no name is given)
2. Description (physical appearance, personality, role in story)
3. Importance (0.0 to 1.0 scale, where 1.0 is protagonist level)

Only include characters with importance >= ${importanceThreshold}. Focus on characters who:
- Are mentioned multiple times
- Have dialogue or significant actions
- Are important to the plot
- Have distinct personalities or roles

Please respond with a JSON object containing an array of characters:
{
  "characters": [
    {
      "name": "Character Name",
      "description": "Detailed description of the character",
      "importance": 0.9
    }
  ]
}

Book text:
${bookText.slice(0, 15000)}...`;

      const startTime = Date.now();
      const rawResponse = await this.makeRequest(prompt, modelToUse, 'json');
      const elapsed = Date.now() - startTime;
      console.log(`⏱️ OpenAI character processing took ${elapsed}ms`);

      console.log(`📄 Character extraction raw response preview: ${rawResponse.slice(0, 200)}${rawResponse.length > 200 ? '...' : ''}`);

      // Handle empty or whitespace-only responses
      if (!rawResponse.trim()) {
        console.warn('⚠️ Empty response from OpenAI');
        return [];
      }

      // Try to parse the JSON response
      let parsedResponse;
      try {
        parsedResponse = JSON.parse(rawResponse);
      } catch (parseError) {
        console.error('❌ Failed to parse JSON response:', parseError);
        console.log('Raw response:', rawResponse);
        return [];
      }

      // Extract characters from the response
      const characters = parsedResponse.characters || [];
      
      if (!Array.isArray(characters)) {
        console.error('❌ Response does not contain a valid characters array');
        return [];
      }

      // Filter and process characters
      const processedCharacters: Character[] = characters
        .filter((char: any) => 
          char.name && 
          char.description && 
          typeof char.importance === 'number' &&
          char.importance >= importanceThreshold
        )
        .slice(0, maxCharacters)
        .map((char: any) => ({
          name: char.name.trim(),
          description: char.description.trim(),
          importance: char.importance,
          imagePrompt: `A detailed portrait of ${char.name}. ${char.description}. Professional book illustration style.`
        }));

      console.log(`✨ Successfully extracted ${processedCharacters.length} characters`);
      processedCharacters.forEach((char, index) => {
        console.log(`   ${index + 1}. ${char.name} (importance: ${char.importance})`);
        console.log(`      📝 ${char.description.slice(0, 100)}${char.description.length > 100 ? '...' : ''}`);
      });

      return processedCharacters;

    } catch (error) {
      console.error('❌ Error extracting characters with OpenAI:', error);
      throw error;
    }
  }

  async extractScenes(
    bookText: string, 
    characters: Character[], 
    scenesPerChapter: number = 2,
    model?: string
  ): Promise<Scene[]> {
    try {
      const startTime = Date.now();
      const modelToUse = this.getValidOpenAIModel(model);
      
      console.log(`🎬 Starting scene extraction with OpenAI...`);
      console.log(`📝 Model: ${modelToUse}`);
      console.log(`📊 Book text length: ${bookText.length} characters`);
      console.log(`👥 Available characters: ${characters.length}`);
      
      // Create character context for better scene extraction
      const characterNames = characters.map(c => c.name).join(', ');
      const characterDescriptions = characters.map(c => `${c.name}: ${c.description}`).join('\n');
      
      console.log(`🎭 Character context: ${characterNames}`);
      
      const prompt = `You are a helpful assistant that analyzes book text and extracts key scenes. 

Known characters in this book:
${characterDescriptions}

Analyze the following text and extract ${scenesPerChapter} key scenes per chapter. For each scene, provide:
1. Title (brief scene name)
2. Description (what happens in the scene)
3. Setting (location and time of day)
4. Characters (which characters from the known list are present)
5. Mood (emotional tone: tense, peaceful, dramatic, mysterious, etc.)
6. Image prompt (detailed visual description for AI image generation)

Only include scenes that are significant to the story and contain visual elements.

Please respond with a JSON object containing an array of scenes:
{
  "scenes": [
    {
      "title": "Scene Title",
      "description": "What happens in this scene",
      "setting": "Location and time description",
      "characters": ["Character1", "Character2"],
      "mood": "emotional tone",
      "imagePrompt": "Detailed visual description for image generation"
    }
  ]
}

Book text:
${bookText.slice(0, 12000)}...`;

      const rawResponse = await this.makeRequest(prompt, modelToUse, 'json');
      
      const elapsed = Date.now() - startTime;
      console.log(`⏱️ OpenAI scene processing took ${elapsed}ms`);

      console.log(`📄 Scene extraction raw response preview: ${rawResponse.slice(0, 200)}${rawResponse.length > 200 ? '...' : ''}`);
      
      // Handle empty or whitespace-only responses
      if (!rawResponse.trim()) {
        console.warn('⚠️ Empty response from OpenAI');
        return [];
      }

      // Try to parse the JSON response
      let parsedResponse;
      try {
        parsedResponse = JSON.parse(rawResponse);
      } catch (parseError) {
        console.error('❌ Failed to parse JSON response:', parseError);
        console.log('Raw response:', rawResponse);
        return [];
      }

      // Extract scenes from the response
      const scenes = parsedResponse.scenes || [];
      
      if (!Array.isArray(scenes)) {
        console.error('❌ Response does not contain a valid scenes array');
        return [];
      }

      // Process and validate scenes
      const processedScenes: Scene[] = scenes
        .filter((scene: any) => 
          scene.title && 
          scene.description && 
          scene.setting &&
          scene.mood &&
          scene.imagePrompt
        )
        .map((scene: any, index: number) => ({
          id: `scene-${Date.now()}-${index}`,
          title: scene.title.trim(),
          description: scene.description.trim(),
          setting: scene.setting.trim(),
          characters: Array.isArray(scene.characters) ? scene.characters : [],
          mood: scene.mood.trim(),
          imagePrompt: scene.imagePrompt.trim(),
          chapterIndex: 0, // For now, assume single chapter
          sceneIndex: index
        }));

      console.log(`✨ Successfully extracted ${processedScenes.length} scenes`);
      processedScenes.forEach((scene, index) => {
        console.log(`   ${index + 1}. ${scene.title}`);
        console.log(`      📍 ${scene.setting}`);
        console.log(`      🎭 Characters: ${scene.characters.join(', ') || 'None specified'}`);
        console.log(`      🎨 Mood: ${scene.mood}`);
      });

      return processedScenes;

    } catch (error) {
      console.error('❌ Error extracting scenes with OpenAI:', error);
      throw error;
    }
  }
}