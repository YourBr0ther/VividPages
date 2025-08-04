import { NextRequest, NextResponse } from 'next/server';
import { ImageGenerator } from '@/lib/image-generator';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      prompt, 
      model = 'dall-e-2', 
      quality = 'standard', 
      size = '512x512',
      style = 'vivid',
      type = 'scene'
    } = body;

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key is not configured' },
        { status: 500 }
      );
    }

    const imageGenerator = new ImageGenerator(apiKey);

    // Validate API key
    const isValidKey = await imageGenerator.validateApiKey();
    if (!isValidKey) {
      return NextResponse.json(
        { error: 'Invalid OpenAI API key' },
        { status: 401 }
      );
    }

    let result;

    if (type === 'character') {
      const { characterName, description } = body;
      if (!characterName || !description) {
        return NextResponse.json(
          { error: 'Character name and description are required for character portraits' },
          { status: 400 }
        );
      }
      
      result = await imageGenerator.generateCharacterPortrait(
        characterName,
        description,
        { model, quality, size }
      );
    } else if (type === 'scene') {
      const { sceneDescription, characters = [], setting = '', mood = '' } = body;
      
      result = await imageGenerator.generateSceneImage(
        sceneDescription || prompt,
        characters,
        setting,
        mood,
        { model, quality, size, style }
      );
    } else {
      // Generic image generation
      result = await imageGenerator.generateImage({
        prompt,
        model,
        quality,
        size,
        style,
      });
    }

    return NextResponse.json({
      success: true,
      image: result,
      metadata: {
        type,
        model,
        quality,
        size,
        generatedAt: new Date().toISOString(),
      },
    });

  } catch (error) {
    console.error('Error in generate-image API:', error);
    
    // Handle specific OpenAI API errors
    if (error instanceof Error) {
      if (error.message.includes('quota') || error.message.includes('billing') || error.message.includes('hard limit')) {
        return NextResponse.json(
          { 
            error: 'Image generation is currently unavailable due to API limits.',
            friendlyMessage: '🎨 Image generation is temporarily unavailable. The service has reached its usage limit. Please try again later or contact support if this persists.',
            type: 'billing_limit'
          },
          { status: 429 }
        );
      }
      
      if (error.message.includes('content policy')) {
        return NextResponse.json(
          { 
            error: 'Content not allowed',
            friendlyMessage: '⚠️ This image cannot be generated as it may violate content guidelines. Please try a different description.',
            type: 'content_policy'
          },
          { status: 400 }
        );
      }

      if (error.message.includes('rate limit')) {
        return NextResponse.json(
          { 
            error: 'Rate limit exceeded',
            friendlyMessage: '⏳ Too many requests at once. Please wait a moment and try again.',
            type: 'rate_limit'
          },
          { status: 429 }
        );
      }

      if (error.message.includes('insufficient_quota')) {
        return NextResponse.json(
          { 
            error: 'Insufficient quota',
            friendlyMessage: '💳 Image generation quota has been exceeded. Please check your account billing or try again later.',
            type: 'insufficient_quota'
          },
          { status: 402 }
        );
      }
    }

    return NextResponse.json(
      { 
        error: 'Failed to generate image',
        friendlyMessage: '🤖 Something went wrong while generating your image. Please try again in a moment.',
        details: error instanceof Error ? error.message : 'Unknown error',
        type: 'unknown_error'
      },
      { status: 500 }
    );
  }
}

export async function GET(_request: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        available: false,
        models: [],
        error: 'OpenAI API key not configured',
      });
    }

    const imageGenerator = new ImageGenerator(apiKey);
    
    const isValid = await imageGenerator.validateApiKey();
    const models = isValid ? await imageGenerator.getAvailableModels() : [];

    return NextResponse.json({
      available: isValid,
      models,
      supportedSizes: {
        'dall-e-2': ['256x256', '512x512', '1024x1024'],
        'dall-e-3': ['1024x1024', '1792x1024', '1024x1792'],
      },
      supportedQualities: ['standard', 'hd'],
      supportedStyles: ['vivid', 'natural'],
    });

  } catch (error) {
    console.error('Error checking image generation status:', error);
    
    return NextResponse.json({
      available: false,
      models: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}