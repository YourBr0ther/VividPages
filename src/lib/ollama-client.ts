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
      
      console.log(`🤖 Starting character extraction with Ollama...`);
      console.log(`📝 Model: ${modelToUse}`);
      console.log(`📊 Book text length: ${bookText.length} characters`);
      console.log(`🔍 Processing first ${Math.min(8000, bookText.length)} characters...`);
      
      const prompt = `I need you to extract ALL the main characters from this book text. Please list multiple characters, not just one.

Find the main characters and return them as a JSON array with multiple entries:

[
{"name": "Character1", "description": "description here", "importance": 0.9, "imagePrompt": "visual description"},
{"name": "Character2", "description": "description here", "importance": 0.8, "imagePrompt": "visual description"},
{"name": "Character3", "description": "description here", "importance": 0.7, "imagePrompt": "visual description"}
]

You must return an array with square brackets [ ] containing multiple character objects. Do not return just one character.

BOOK TEXT:
${bookText.slice(0, 8000)}`;

      console.log(`🚀 Sending scene extraction request to Ollama at ${this.baseUrl}...`);
      const startTime = Date.now();
      
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
        console.error(`❌ Ollama API error: ${response.status}`);
        throw new Error(`Ollama API error: ${response.status}`);
      }

      const data = await response.json();
      const elapsed = Date.now() - startTime;
      console.log(`⏱️ Ollama processing took ${elapsed}ms`);
      console.log(`📋 Raw response length: ${data.response?.length || 0} characters`);
      
      // First, try to clean and parse the response
      let rawResponse = data.response || '';
      console.log(`📄 Raw response preview: ${rawResponse.slice(0, 200)}${rawResponse.length > 200 ? '...' : ''}`);
      
      // Handle empty or whitespace-only responses
      if (!rawResponse.trim()) {
        console.warn('⚠️ Received empty response from Ollama');
        return [];
      }
      
      try {
        // Try to extract JSON from the response if it's wrapped in text
        let jsonStr = rawResponse.trim();
        
        // Look for JSON array patterns first (prioritize arrays)
        const arrayMatch = jsonStr.match(/\[[\s\S]*\]/);
        if (arrayMatch) {
          jsonStr = arrayMatch[0];
          console.log(`🔧 Extracted JSON array from response: ${jsonStr.slice(0, 100)}${jsonStr.length > 100 ? '...' : ''}`);
        } else {
          // Look for single object patterns
          const objectMatch = jsonStr.match(/\{[\s\S]*\}/);
          if (objectMatch) {
            jsonStr = objectMatch[0];
            console.log(`🔧 Extracted JSON object from response: ${jsonStr.slice(0, 100)}${jsonStr.length > 100 ? '...' : ''}`);
          }
        }
        
        // Skip if we only have empty objects
        if (jsonStr.trim() === '{}' || jsonStr.trim() === '') {
          console.warn('⚠️ Response contains only empty object or whitespace');
          return [];
        }
        
        const parsedResponse = JSON.parse(jsonStr);
        console.log(`✅ Successfully parsed JSON response`);
        
        // Handle different response formats
        let characters = parsedResponse;
        if (parsedResponse.main_characters) {
          characters = parsedResponse.main_characters;
          console.log(`📋 Found characters in 'main_characters' field`);
        } else if (parsedResponse.characters) {
          characters = parsedResponse.characters;
          console.log(`📋 Found characters in 'characters' field`);
        } else {
          console.log(`📋 Using root-level response as characters`);
        }
        
        // Convert single character object to array
        if (!Array.isArray(characters) && characters && typeof characters === 'object' && characters.name) {
          characters = [characters];
          console.log(`🔄 Converted single character object to array`);
        }
        
        // Validate and normalize the response
        if (Array.isArray(characters) && characters.length > 0) {
          console.log(`🔍 Processing ${characters.length} potential characters...`);
          
          const validCharacters = characters
            .filter(char => char && typeof char === 'object' && char.name && char.description)
            .filter(char => (char.importance || 0.5) > 0.3)
            .map(char => ({
              name: String(char.name).trim(),
              description: String(char.description).trim(),
              importance: Math.min(Math.max(Number(char.importance) || 0.5, 0.0), 1.0),
              imagePrompt: String(char.imagePrompt || char.description).trim()
            }));
            
          console.log(`✨ Found ${validCharacters.length} valid characters:`);
          validCharacters.forEach((char, index) => {
            console.log(`   ${index + 1}. ${char.name} (importance: ${char.importance})`);
            console.log(`      📝 ${char.description.slice(0, 100)}${char.description.length > 100 ? '...' : ''}`);
          });
          
          // If we only got 1 character, try to extract more by asking for "other characters"
          if (validCharacters.length === 1) {
            console.log(`🔄 Only found 1 character, attempting to find additional characters...`);
            try {
              const additionalCharacters = await this.extractAdditionalCharacters(bookText, validCharacters[0].name, modelToUse);
              if (additionalCharacters.length > 0) {
                console.log(`🎭 Found ${additionalCharacters.length} additional characters`);
                validCharacters.push(...additionalCharacters);
              }
            } catch (error) {
              console.warn(`⚠️ Failed to extract additional characters:`, error);
            }
          }
          
          return validCharacters;
        } else {
          console.warn(`⚠️ No valid character data found in response. Type: ${typeof characters}, IsArray: ${Array.isArray(characters)}, Length: ${Array.isArray(characters) ? characters.length : 'N/A'}`);
          return [];
        }
      } catch (parseError) {
        console.error('❌ Failed to parse character extraction response:', parseError);
        console.log('📄 Full raw response:', rawResponse);
        
        // Try to extract character info using regex as fallback
        try {
          const nameMatches = rawResponse.match(/["']?name["']?\s*:\s*["']([^"']+)["']/gi);
          const descMatches = rawResponse.match(/["']?description["']?\s*:\s*["']([^"']+)["']/gi);
          
          if (nameMatches && descMatches && nameMatches.length === descMatches.length) {
            console.log('🔄 Attempting regex fallback extraction...');
            const fallbackCharacters = nameMatches.map((nameMatch, index) => {
              const name = nameMatch.replace(/["']?name["']?\s*:\s*["']/, '').replace(/["']$/, '');
              const description = descMatches[index].replace(/["']?description["']?\s*:\s*["']/, '').replace(/["']$/, '');
              return {
                name: name.trim(),
                description: description.trim(),
                importance: 0.5,
                imagePrompt: description.trim()
              };
            });
            
            console.log(`🔄 Regex fallback found ${fallbackCharacters.length} characters`);
            return fallbackCharacters;
          }
        } catch (regexError) {
          console.warn('⚠️ Regex fallback also failed:', regexError);
        }
        
        // Final fallback: return empty array
        console.log('🔄 Returning empty array as final fallback');
        return [];
      }
      
    } catch (error) {
      console.error('Error extracting characters:', error);
      throw new Error(`Character extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async extractAdditionalCharacters(bookText: string, excludeName: string, model?: string): Promise<Character[]> {
    try {
      const modelToUse = model || this.defaultModel;
      
      const prompt = `The main character "${excludeName}" has already been found. Now find OTHER main characters from this book text (not ${excludeName}).

Return them as a JSON array:

[
{"name": "Character2", "description": "different character description", "importance": 0.8, "imagePrompt": "visual description"},
{"name": "Character3", "description": "another character description", "importance": 0.7, "imagePrompt": "visual description"}
]

Find secondary characters, supporting characters, or other important people mentioned in the text. Do not include ${excludeName}.

BOOK TEXT:
${bookText.slice(0, 8000)}`;

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
      let rawResponse = data.response || '';
      
      if (!rawResponse.trim() || rawResponse.trim() === '{}') {
        return [];
      }

      // Extract JSON array
      const arrayMatch = rawResponse.match(/\[[\s\S]*\]/);
      if (arrayMatch) {
        const jsonStr = arrayMatch[0];
        const parsedResponse = JSON.parse(jsonStr);
        
        if (Array.isArray(parsedResponse)) {
          return parsedResponse
            .filter(char => char && char.name && char.name !== excludeName)
            .map(char => ({
              name: String(char.name).trim(),
              description: String(char.description).trim(),
              importance: Math.min(Math.max(Number(char.importance) || 0.5, 0.0), 1.0),
              imagePrompt: String(char.imagePrompt || char.description).trim()
            }));
        }
      }
      
      return [];
    } catch (error) {
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
      const modelToUse = model || this.defaultModel;
      
      console.log(`🎬 Starting scene extraction with Ollama...`);
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
        console.error(`❌ Ollama scene extraction API error: ${response.status}`);
        throw new Error(`Ollama API error: ${response.status}`);
      }
      
      const elapsed = Date.now() - startTime;
      console.log(`⏱️ Ollama scene processing took ${elapsed}ms`);

      const data = await response.json();
      
      // First, try to clean and parse the response
      let rawResponse = data.response || '';
      console.log(`📄 Scene extraction raw response preview: ${rawResponse.slice(0, 200)}${rawResponse.length > 200 ? '...' : ''}`);
      
      // Handle empty or whitespace-only responses
      if (!rawResponse.trim()) {
        console.warn('⚠️ Received empty response from Ollama for scene extraction');
        return [];
      }
      
      try {
        // Try to extract JSON from the response if it's wrapped in text
        let jsonStr = rawResponse.trim();
        
        // Look for JSON array or object patterns
        const jsonMatch = jsonStr.match(/\[.*\]|\{.*\}/s);
        if (jsonMatch) {
          jsonStr = jsonMatch[0];
          console.log(`🔧 Extracted JSON from scene response: ${jsonStr.slice(0, 100)}${jsonStr.length > 100 ? '...' : ''}`);
        }
        
        const parsedResponse = JSON.parse(jsonStr);
        console.log(`✅ Successfully parsed scene JSON response`);
        
        // Handle different response formats
        let scenes = parsedResponse;
        if (parsedResponse.scenes) {
          scenes = parsedResponse.scenes;
          console.log(`📋 Found scenes in 'scenes' field`);
        } else if (parsedResponse.key_scenes) {
          scenes = parsedResponse.key_scenes;
          console.log(`📋 Found scenes in 'key_scenes' field`);
        } else {
          console.log(`📋 Using root-level response as scenes`);
        }
        
        // Convert single scene object to array
        if (!Array.isArray(scenes) && scenes && typeof scenes === 'object' && scenes.title) {
          scenes = [scenes];
          console.log(`🔄 Converted single scene object to array`);
        }
        
        // Validate and normalize the response
        if (Array.isArray(scenes) && scenes.length > 0) {
          console.log(`🔍 Processing ${scenes.length} potential scenes...`);
          
          const validScenes = scenes
            .filter(scene => scene && typeof scene === 'object' && scene.title && scene.description)
            .map((scene, index) => ({
              id: `scene-${Date.now()}-${index}`,
              title: String(scene.title).trim(),
              description: String(scene.description).trim(),
              setting: String(scene.setting || 'Unknown location').trim(),
              characters: Array.isArray(scene.characters) ? scene.characters.map(c => String(c).trim()) : [],
              mood: String(scene.mood || 'neutral').trim(),
              imagePrompt: String(scene.imagePrompt || scene.description).trim(),
              chapterIndex: 0, // Will be updated by caller if needed
              sceneIndex: index
            }));
            
          console.log(`✨ Found ${validScenes.length} valid scenes`);
          validScenes.forEach((scene, index) => {
            console.log(`   ${index + 1}. ${scene.title}`);
            console.log(`      🎬 ${scene.description.slice(0, 80)}${scene.description.length > 80 ? '...' : ''}`);
          });
          
          return validScenes;
        } else {
          console.warn(`⚠️ No valid scene data found in response. Type: ${typeof scenes}, IsArray: ${Array.isArray(scenes)}, Length: ${Array.isArray(scenes) ? scenes.length : 'N/A'}`);
          return [];
        }
      } catch (parseError) {
        console.error('❌ Failed to parse scene extraction response:', parseError);
        console.log('📄 Full raw scene response:', rawResponse);
        
        // Fallback: return empty array
        console.log('🔄 Returning empty array as final fallback for scenes');
        return [];
      }
      
    } catch (error) {
      console.error('❌ Error extracting scenes:', error);
      // Don't throw error, return empty array to allow workflow to continue
      return [];
    }
  }
}