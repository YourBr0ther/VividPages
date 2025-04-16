import { Chapter } from './epubService';
import { Scene } from './imageGenerationService';

export interface SceneSelectionConfig {
  openaiApiKey?: string;
  maxScenesPerChapter?: number;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export class SceneSelectionService {
  private config: Required<SceneSelectionConfig>;

  constructor(config: SceneSelectionConfig = {}) {
    const env = typeof import.meta !== 'undefined' ? import.meta.env : process.env;
    this.config = {
      openaiApiKey: config.openaiApiKey || env.VITE_OPENAI_API_KEY || env.OPENAI_API_KEY,
      maxScenesPerChapter: config.maxScenesPerChapter || parseInt(env.VITE_MAX_SCENES_PER_CHAPTER || env.MAX_SCENES_PER_CHAPTER || '3'),
      model: config.model || env.VITE_OPENAI_MODEL || env.OPENAI_MODEL || 'gpt-4',
      temperature: config.temperature || parseFloat(env.VITE_OPENAI_TEMPERATURE || env.OPENAI_TEMPERATURE || '0.7'),
      maxTokens: config.maxTokens || parseInt(env.VITE_OPENAI_MAX_TOKENS || env.OPENAI_MAX_TOKENS || '1000')
    };
  }

  private validateJsonResponse(response: string): any {
    try {
      // Remove any potential markdown code block syntax
      const cleanJson = response.replace(/```json\n?|\n?```/g, '').trim();
      return JSON.parse(cleanJson);
    } catch (error) {
      console.error('Invalid JSON response:', response);
      throw new Error('Failed to parse JSON response from ChatGPT');
    }
  }

  private async callChatGPT(messages: { role: string; content: string }[]): Promise<string> {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.openaiApiKey}`
        },
        body: JSON.stringify({
          model: this.config.model,
          messages,
          temperature: this.config.temperature,
          max_tokens: this.config.maxTokens,
          response_format: { type: "json_object" }  // Force JSON response format
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to call ChatGPT: ${response.statusText}`);
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error('Error calling ChatGPT:', error);
      if (error instanceof Error) {
        throw new Error(error.message);
      }
      throw new Error(String(error));
    }
  }

  async selectScenesFromChapter(chapter: Chapter): Promise<Scene[]> {
    try {
      const systemPrompt = `You are an expert at analyzing literary text and identifying key scenes that would make compelling visual representations. 
        Your task is to identify exactly ${this.config.maxScenesPerChapter} most visually significant scenes from the given chapter.
        You must respond with a JSON object containing a 'scenes' array. Each scene in the array must have:
        1. 'description': A brief description of the scene (string)
        2. 'paragraphIndex': The index where this scene occurs (number)
        
        Example response format:
        {
          "scenes": [
            {
              "description": "A moonlit garden with roses in full bloom",
              "paragraphIndex": 3
            }
          ]
        }`;

      const userPrompt = `Chapter Title: ${chapter.title}\n\nChapter Content:\n${chapter.content}`;

      const response = await this.callChatGPT([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]);

      // Parse and validate the response
      const parsedResponse = this.validateJsonResponse(response);
      if (!parsedResponse.scenes || !Array.isArray(parsedResponse.scenes)) {
        throw new Error('Invalid response format: missing scenes array');
      }

      // Create Scene objects
      const scenes = parsedResponse.scenes.map((scene: any) => ({
        description: scene.description || 'No description provided',
        prompt: '', // This will be filled by the prompt generation service
        imageData: '', // This will be filled by the image generation service
        chapterId: chapter.id,
        paragraphIndex: typeof scene.paragraphIndex === 'number' ? scene.paragraphIndex : 0
      }));

      return scenes;
    } catch (error) {
      console.error('Error selecting scenes from chapter:', error);
      throw new Error(`Error selecting scenes from chapter: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async generatePromptForScene(scene: Scene, chapter: Chapter): Promise<Scene> {
    try {
      const systemPrompt = `You are an expert at creating detailed, visually rich prompts for image generation.
        Your task is to create a detailed prompt for Stable Diffusion that will generate an image matching the scene description.
        You must respond with a JSON object containing a 'prompt' field that specifies:
        - Visual style (e.g., "digital art", "oil painting", "photorealistic")
        - Lighting and atmosphere
        - Key visual elements
        - Composition and framing
        
        Example response format:
        {
          "prompt": "A serene moonlit garden, digital art style, dramatic lighting with soft blue moonlight casting long shadows, roses in full bloom with dewdrops, wide shot composition with garden path leading to a distant gazebo"
        }`;

      const userPrompt = `Scene Description: ${scene.description}\n\nContext from Chapter: ${chapter.content}`;

      const response = await this.callChatGPT([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]);

      // Parse and validate the response
      const parsedResponse = this.validateJsonResponse(response);
      if (!parsedResponse.prompt || typeof parsedResponse.prompt !== 'string') {
        throw new Error('Invalid response format: missing prompt field');
      }

      return {
        ...scene,
        prompt: parsedResponse.prompt
      };
    } catch (error) {
      console.error('Error generating prompt for scene:', error);
      throw new Error('Failed to generate prompt for scene');
    }
  }
} 