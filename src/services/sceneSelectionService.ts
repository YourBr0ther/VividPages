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
    this.config = {
      openaiApiKey: config.openaiApiKey || import.meta.env.VITE_OPENAI_API_KEY,
      maxScenesPerChapter: config.maxScenesPerChapter || parseInt(import.meta.env.VITE_MAX_SCENES_PER_CHAPTER),
      model: config.model || import.meta.env.VITE_OPENAI_MODEL,
      temperature: config.temperature || parseFloat(import.meta.env.VITE_OPENAI_TEMPERATURE),
      maxTokens: config.maxTokens || parseInt(import.meta.env.VITE_OPENAI_MAX_TOKENS)
    };
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
          max_tokens: this.config.maxTokens
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
        For the given chapter text, identify ${this.config.maxScenesPerChapter} most visually significant scenes.
        For each scene, provide:
        1. A brief description of the scene
        2. The paragraph index where this scene occurs
        Format your response as a JSON array of objects with 'description' and 'paragraphIndex' fields.`;

      const userPrompt = `Chapter Title: ${chapter.title}\n\nChapter Content:\n${chapter.content}`;

      const response = await this.callChatGPT([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]);

      // Parse the response and create Scene objects
      const scenes = JSON.parse(response).map((scene: any) => ({
        description: scene.description,
        prompt: '', // This will be filled by the prompt generation service
        chapterId: chapter.id,
        paragraphIndex: scene.paragraphIndex
      }));

      return scenes;
    } catch (error) {
      console.error('Error selecting scenes from chapter:', error);
      if (error instanceof Error) {
        throw new Error(`Error selecting scenes from chapter: ${error.message}`);
      }
      throw new Error(`Error selecting scenes from chapter: ${String(error)}`);
    }
  }

  async generatePromptForScene(scene: Scene, chapter: Chapter): Promise<Scene> {
    try {
      const systemPrompt = `You are an expert at creating detailed, visually rich prompts for image generation.
        Create a detailed prompt for Stable Diffusion that will generate an image matching the scene description.
        The prompt should be specific about:
        - Visual style (e.g., "digital art", "oil painting", "photorealistic")
        - Lighting and atmosphere
        - Key visual elements
        - Composition and framing
        Format your response as a JSON object with a 'prompt' field.`;

      const userPrompt = `Scene Description: ${scene.description}\n\nContext from Chapter: ${chapter.content}`;

      const response = await this.callChatGPT([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]);

      const { prompt } = JSON.parse(response);
      return {
        ...scene,
        prompt
      };
    } catch (error) {
      console.error('Error generating prompt for scene:', error);
      throw new Error('Failed to generate prompt for scene');
    }
  }
} 