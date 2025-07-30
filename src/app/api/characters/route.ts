import { NextRequest, NextResponse } from 'next/server';
import { OllamaClient } from '@/lib/ollama-client';
import { ImageGenerator } from '@/lib/image-generator';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bookText, model, generateImages } = body;

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

    // Extract characters using Ollama
    const characters = await ollama.extractCharacters(bookText, model);

    let charactersWithImages = characters;

    // Generate character portraits if requested and API key is available
    if (generateImages && process.env.OPENAI_API_KEY) {
      const imageGenerator = new ImageGenerator(process.env.OPENAI_API_KEY);
      
      try {
        // Generate images for each character (limit to first 5 to avoid quota issues)
        const charactersToProcess = characters.slice(0, 5);
        
        charactersWithImages = await Promise.all(
          charactersToProcess.map(async (character) => {
            try {
              const image = await imageGenerator.generateCharacterPortrait(
                character.name,
                character.description,
                { quality: 'standard', size: '512x512' }
              );
              
              return {
                ...character,
                image: {
                  url: image.url,
                  id: image.id,
                  createdAt: image.createdAt,
                },
              };
            } catch (error) {
              console.error(`Failed to generate image for ${character.name}:`, error);
              return character; // Return character without image if generation fails
            }
          })
        );

        // Add remaining characters without images
        if (characters.length > 5) {
          charactersWithImages = [
            ...charactersWithImages,
            ...characters.slice(5),
          ];
        }
      } catch (error) {
        console.error('Error generating character images:', error);
        // Continue without images if generation fails
      }
    }

    return NextResponse.json({
      success: true,
      characters: charactersWithImages,
      metadata: {
        model: model || defaultModel,
        totalCharacters: charactersWithImages.length,
        withImages: charactersWithImages.filter(c => c.image).length,
        processedAt: new Date().toISOString(),
      },
    });

  } catch (error) {
    console.error('Error in characters API:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to extract characters',
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
      characters: [],
      projectId,
    });

  } catch (error) {
    console.error('Error fetching characters:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch characters',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}