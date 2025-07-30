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

export class OllamaClient {
  private baseUrl: string;
  private defaultModel: string;

  constructor(baseUrl: string, defaultModel: string = 'llama2') {
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
      return false;
    }
  }

  async listModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.models?.map((model: { name: string }) => model.name) || [];
    } catch (error) {
      console.error('Error fetching Ollama models:', error);
      return [];
    }
  }

  async extractCharacters(bookText: string, model?: string): Promise<Character[]> {
    try {
      const modelToUse = model || this.defaultModel;
      
      const prompt = `You are a helpful assistant that extracts main characters from book text. 

Analyze the following text and extract the main characters. For each character, provide:
1. Name (as it appears in the text)
2. Description (physical appearance, personality, role)
3. Importance (0.0-1.0 scale, where 1.0 is protagonist)
4. Image prompt (detailed description for AI image generation)

Only include characters that appear significantly in the story (importance > 0.3).

Response format should be JSON array:
[
  {
    "name": "Character Name",
    "description": "Detailed description of the character",
    "importance": 0.8,
    "imagePrompt": "Detailed visual description for image generation"
  }
]

Book text:
${bookText.slice(0, 8000)}...`;

      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: modelToUse,
          prompt: prompt,
          stream: false,
          format: 'json'
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status}`);
      }

      const data = await response.json();
      
      try {
        const parsedResponse = JSON.parse(data.response);
        
        // Handle different response formats
        let characters = parsedResponse;
        if (parsedResponse.main_characters) {
          characters = parsedResponse.main_characters;
        } else if (parsedResponse.characters) {
          characters = parsedResponse.characters;
        }
        
        // Convert single character object to array
        if (!Array.isArray(characters) && characters.name) {
          characters = [characters];
        }
        
        // Validate and normalize the response
        if (Array.isArray(characters)) {
          return characters
            .filter(char => char.name && char.description)
            .filter(char => (char.importance || 0.5) > 0.3)
            .map(char => ({
              name: char.name,
              description: char.description,
              importance: Math.min(Math.max(char.importance || 0.5, 0.0), 1.0),
              imagePrompt: char.imagePrompt || char.description
            }));
        } else {
          throw new Error('Response does not contain valid character data');
        }
      } catch (parseError) {
        console.error('Failed to parse character extraction response:', parseError);
        console.log('Raw response:', data.response);
        
        // Fallback: return empty array
        return [];
      }
      
    } catch (error) {
      console.error('Error extracting characters:', error);
      throw new Error(`Character extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async extractScenes(
    bookText: string, 
    characters: Character[], 
    scenesPerChapter: number = 2,
    model?: string
  ): Promise<Scene[]> {
    try {
      const modelToUse = model || this.defaultModel;
      
      // Create character context for better scene extraction
      const characterNames = characters.map(c => c.name).join(', ');
      const characterDescriptions = characters.map(c => `${c.name}: ${c.description}`).join('\n');
      
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

Response format should be JSON array:
[
  {
    "title": "Scene Title",
    "description": "What happens in this scene",
    "setting": "Location and time description",
    "characters": ["Character1", "Character2"],
    "mood": "emotional tone",
    "imagePrompt": "Detailed visual description for image generation"
  }
]

Book text:
${bookText.slice(0, 12000)}...`;

      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: modelToUse,
          prompt: prompt,
          stream: false,
          format: 'json'
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status}`);
      }

      const data = await response.json();
      
      try {
        const parsedResponse = JSON.parse(data.response);
        
        // Handle different response formats
        let scenes = parsedResponse;
        if (parsedResponse.scenes) {
          scenes = parsedResponse.scenes;
        } else if (parsedResponse.key_scenes) {
          scenes = parsedResponse.key_scenes;
        }
        
        // Convert single scene object to array
        if (!Array.isArray(scenes) && scenes.title) {
          scenes = [scenes];
        }
        
        // Validate and normalize the response
        if (Array.isArray(scenes)) {
          return scenes
            .filter(scene => scene.title && scene.description)
            .map((scene, index) => ({
              id: `scene-${Date.now()}-${index}`,
              title: scene.title,
              description: scene.description,
              setting: scene.setting || 'Unknown location',
              characters: Array.isArray(scene.characters) ? scene.characters : [],
              mood: scene.mood || 'neutral',
              imagePrompt: scene.imagePrompt || scene.description,
              chapterIndex: 0, // Will be updated by caller if needed
              sceneIndex: index
            }));
        } else {
          throw new Error('Response does not contain valid scene data');
        }
      } catch (parseError) {
        console.error('Failed to parse scene extraction response:', parseError);
        console.log('Raw response:', data.response);
        
        // Fallback: return empty array
        return [];
      }
      
    } catch (error) {
      console.error('Error extracting scenes:', error);
      throw new Error(`Scene extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}