import { NextRequest, NextResponse } from 'next/server';
import { OllamaClient } from '@/lib/ollama-client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, type, model, options } = body;

    if (!text) {
      return NextResponse.json(
        { error: 'Text is required' },
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

    let result;

    switch (type) {
      case 'characters':
        result = await ollama.extractCharacters(text, model);
        break;
      
      case 'scenes':
        const numScenes = options?.numScenes || 1;
        result = await ollama.analyzeScenes(text, numScenes, model);
        break;
      
      case 'generate':
        result = await ollama.generate(text, model, options);
        break;
      
      default:
        return NextResponse.json(
          { error: 'Invalid analysis type. Supported types: characters, scenes, generate' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      result,
      metadata: {
        model: model || defaultModel,
        type,
        processedAt: new Date().toISOString(),
      },
    });

  } catch (error) {
    console.error('Error in analyze-text API:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to analyze text',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(_request: NextRequest) {
  try {
    const ollamaHost = process.env.OLLAMA_HOST || 'http://localhost:11434';
    const ollama = new OllamaClient(ollamaHost);

    const isAvailable = await ollama.isAvailable();
    const models = isAvailable ? await ollama.listModels() : [];

    return NextResponse.json({
      available: isAvailable,
      models,
      host: ollamaHost,
    });

  } catch (error) {
    console.error('Error checking Ollama status:', error);
    
    return NextResponse.json(
      { 
        available: false,
        models: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}