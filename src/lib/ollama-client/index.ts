export interface OllamaResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

export interface OllamaGenerateRequest {
  model: string;
  prompt: string;
  stream?: boolean;
  context?: number[];
  options?: {
    temperature?: number;
    top_p?: number;
    top_k?: number;
    num_predict?: number;
  };
}

export interface Character {
  name: string;
  description: string;
  personality: string;
  imagePrompt: string;
}

export interface Scene {
  id: string;
  chapterIndex: number;
  sceneIndex: number;
  description: string;
  characters: string[];
  setting: string;
  mood: string;
  keyActions: string;
  imagePrompt?: string;
}

export class OllamaClient {
  private baseUrl: string;
  private defaultModel: string;

  constructor(baseUrl = 'http://localhost:11434', defaultModel = 'llama2') {
    this.baseUrl = baseUrl;
    this.defaultModel = defaultModel;
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      return response.ok;
    } catch (error) {
      console.error('Ollama is not available:', error);
      return false;
    }
  }

  async listModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      if (!response.ok) {
        throw new Error('Failed to fetch models');
      }
      const data = await response.json();
      return data.models?.map((model: any) => model.name) || [];
    } catch (error) {
      console.error('Error listing models:', error);
      return [];
    }
  }

  async generate(prompt: string, model?: string, options?: OllamaGenerateRequest['options']): Promise<string> {
    const requestBody: OllamaGenerateRequest = {
      model: model || this.defaultModel,
      prompt,
      stream: false,
      options: {
        temperature: 0.7,
        top_p: 0.9,
        num_predict: 1000,
        ...options,
      },
    };

    try {
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
      }

      const data: OllamaResponse = await response.json();
      return data.response;
    } catch (error) {
      console.error('Error generating response:', error);
      throw new Error(`Failed to generate response: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async extractCharacters(bookText: string, model?: string): Promise<Character[]> {
    const prompt = `
Analyze the following book text and extract the main characters. For each character, provide:
1. Name
2. Physical description
3. Personality traits
4. A detailed image generation prompt

Format your response as JSON array with this structure:
[
  {
    "name": "Character Name",
    "description": "Physical description",
    "personality": "Key personality traits",
    "imagePrompt": "Detailed prompt for AI image generation"
  }
]

Book text:
${bookText.substring(0, 10000)}...

Only return the JSON array, no additional text.
`;

    try {
      const response = await this.generate(prompt, model, {
        temperature: 0.5,
        num_predict: 2000,
      });

      // Try to extract JSON from response
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in response');
      }

      const characters = JSON.parse(jsonMatch[0]);
      return characters.filter((char: any) => char.name && char.description);
    } catch (error) {
      console.error('Error extracting characters:', error);
      // Return empty array if parsing fails
      return [];
    }
  }

  async analyzeScenes(chapterText: string, numScenes: number, model?: string): Promise<Scene[]> {
    const prompt = `
Analyze the following chapter text and identify the ${numScenes} most visually compelling scenes.
For each scene, provide:
1. Scene description
2. Characters present
3. Setting details
4. Mood/atmosphere
5. Key actions

Format your response as JSON array:
[
  {
    "description": "Scene description",
    "characters": ["character1", "character2"],
    "setting": "Setting details",
    "mood": "Mood/atmosphere",
    "keyActions": "Key actions happening"
  }
]

Chapter text:
${chapterText.substring(0, 8000)}...

Only return the JSON array, no additional text.
`;

    try {
      const response = await this.generate(prompt, model, {
        temperature: 0.6,
        num_predict: 1500,
      });

      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in response');
      }

      const scenes = JSON.parse(jsonMatch[0]);
      return scenes.slice(0, numScenes).map((scene: any, index: number) => ({
        id: `scene-${Date.now()}-${index}`,
        chapterIndex: 0,
        sceneIndex: index,
        description: scene.description || '',
        characters: Array.isArray(scene.characters) ? scene.characters : [],
        setting: scene.setting || '',
        mood: scene.mood || '',
        keyActions: scene.keyActions || '',
      }));
    } catch (error) {
      console.error('Error analyzing scenes:', error);
      return [];
    }
  }

  async generateImagePrompt(scene: Scene, characters: Character[]): Promise<string> {
    const relevantCharacters = characters.filter(char => 
      scene.characters.some(scenChar => 
        scenChar.toLowerCase().includes(char.name.toLowerCase()) ||
        char.name.toLowerCase().includes(scenChar.toLowerCase())
      )
    );

    const characterDescriptions = relevantCharacters
      .map(char => `${char.name}: ${char.description}`)
      .join('; ');

    const prompt = `
Create a detailed image generation prompt for this scene:
Scene: ${scene.description}
Setting: ${scene.setting}
Mood: ${scene.mood}
Characters present: ${characterDescriptions}
Key actions: ${scene.keyActions}

Generate a detailed, artistic prompt for AI image generation that captures the essence of this scene.
Focus on visual details, composition, lighting, and atmosphere.
Keep it under 500 characters.
`;

    try {
      const response = await this.generate(prompt, undefined, {
        temperature: 0.8,
        num_predict: 200,
      });

      return response.trim();
    } catch (error) {
      console.error('Error generating image prompt:', error);
      return `${scene.description} in ${scene.setting}, ${scene.mood} atmosphere`;
    }
  }
}