import { NextRequest, NextResponse } from 'next/server';
import { OllamaClient } from '@/lib/ollama-client';

export async function GET(_request: NextRequest) {
  try {
    const results = {
      ollama: {
        available: false,
        models: [] as string[],
        error: null as string | null
      },
      openai: {
        available: false,
        models: [] as string[],
        error: null as string | null
      }
    };

    // Check Ollama
    try {
      const ollamaHost = process.env.OLLAMA_HOST || 'http://localhost:11434';
      const ollama = new OllamaClient(ollamaHost);
      
      const isAvailable = await ollama.isAvailable();
      if (isAvailable) {
        const models = await ollama.listModels();
        results.ollama.available = true;
        results.ollama.models = models;
      } else {
        results.ollama.error = 'Ollama service not responding';
      }
    } catch (error) {
      results.ollama.error = error instanceof Error ? error.message : 'Failed to connect to Ollama';
    }

    // Check OpenAI
    try {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        results.openai.error = 'OpenAI API key not configured';
      } else {
        // Query OpenAI models
        const response = await fetch('https://api.openai.com/v1/models', {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          // Filter for image generation models
          const imageModels = data.data
            .filter((model: { id: string }) => 
              model.id.includes('dall-e') || 
              model.id.includes('dalle')
            )
            .map((model: { id: string }) => model.id)
            .sort();

          results.openai.available = true;
          results.openai.models = imageModels.length > 0 ? imageModels : [
            'dall-e-2', // Fallback if API doesn't return DALL-E models
            'dall-e-3'
          ];
        } else {
          results.openai.error = `OpenAI API error: ${response.status}`;
        }
      }
    } catch (error) {
      results.openai.error = error instanceof Error ? error.message : 'Failed to connect to OpenAI';
    }

    return NextResponse.json({
      success: true,
      data: results,
    });

  } catch (error) {
    console.error('Models API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to query models' 
      },
      { status: 500 }
    );
  }
}