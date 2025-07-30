import { NextRequest, NextResponse } from 'next/server';
import { OllamaClient } from '@/lib/ollama-client';
import { ImageGenerator } from '@/lib/image-generator';

interface Character {
  name: string;
  description: string;
  importance: number;
  imagePrompt?: string;
  image?: {
    url: string;
    id: string;
    createdAt: string;
  };
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
  image?: {
    url: string;
    id: string;
    createdAt: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      bookText, 
      characters = [], 
      scenesPerChapter = 2, 
      llmModel, 
      imageModel,
      imageQuality = 'standard',
      generateImages = true 
    } = body;

    if (!bookText) {
      return NextResponse.json(
        { error: 'Book text is required' },
        { status: 400 }
      );
    }

    const ollamaHost = process.env.OLLAMA_HOST || 'http://localhost:11434';
    const defaultModel = process.env.OLLAMA_DEFAULT_MODEL || 'llama2';
    
    const ollama = new OllamaClient(ollamaHost, defaultModel);

    // Check if Ollama is available
    const isAvailable = await ollama.isAvailable();
    if (!isAvailable) {
      return NextResponse.json(
        { error: 'Ollama service is not available. Please ensure Ollama is running.' },
        { status: 503 }
      );
    }

    // Extract scenes using Ollama
    const scenes = await ollama.extractScenes(
      bookText, 
      characters, 
      scenesPerChapter, 
      llmModel
    );

    let scenesWithImages = scenes;

    // Generate scene images if requested and API key is available
    if (generateImages && process.env.OPENAI_API_KEY && scenes.length > 0) {
      const imageGenerator = new ImageGenerator(process.env.OPENAI_API_KEY);
      
      try {
        // Generate images for scenes (limit to first 3 to avoid quota issues)
        const scenesToProcess = scenes.slice(0, 3);
        
        scenesWithImages = await Promise.all(
          scenesToProcess.map(async (scene) => {
            try {
              // Find characters in this scene and their descriptions
              const sceneCharacters = characters.filter((char: Character) => 
                scene.characters.includes(char.name)
              ).map((char: Character) => ({
                name: char.name,
                description: char.description,
                imageUrl: char.image?.url
              }));

              // Generate scene image with character context
              const image = await imageGenerator.generateSceneWithCharacterPortraits(
                scene.description,
                scene.setting,
                scene.mood,
                sceneCharacters,
                { 
                  model: imageModel || 'dall-e-3',
                  quality: imageQuality as 'standard' | 'hd',
                  size: '1024x1024' 
                }
              );
              
              return {
                ...scene,
                image: {
                  url: image.url,
                  id: image.id,
                  createdAt: image.createdAt,
                },
              };
            } catch (error) {
              console.error(`Failed to generate image for scene ${scene.title}:`, error);
              return scene; // Return scene without image if generation fails
            }
          })
        );

        // Add remaining scenes without images
        if (scenes.length > 3) {
          scenesWithImages = [
            ...scenesWithImages,
            ...scenes.slice(3),
          ];
        }
      } catch (error) {
        console.error('Error generating scene images:', error);
        // Continue without images if generation fails
      }
    }

    return NextResponse.json({
      success: true,
      scenes: scenesWithImages,
      metadata: {
        llmModel: llmModel || defaultModel,
        imageModel: imageModel || 'dall-e-3',
        totalScenes: scenesWithImages.length,
        withImages: scenesWithImages.filter(s => s.image).length,
        scenesPerChapter,
        processedAt: new Date().toISOString(),
      },
    });

  } catch (error) {
    console.error('Error in scenes API:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to extract scenes',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');

  if (!projectId) {
    return NextResponse.json(
      { error: 'Project ID is required' },
      { status: 400 }
    );
  }

  try {
    // This would typically fetch from database/storage
    // For now, return a placeholder response
    return NextResponse.json({
      success: true,
      scenes: [],
      projectId,
    });

  } catch (error) {
    console.error('Error fetching scenes:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch scenes',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}