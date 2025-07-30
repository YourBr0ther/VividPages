import { NextRequest, NextResponse } from 'next/server';
import { EpubParser } from '@/lib/epub-parser';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const options = formData.get('options') ? JSON.parse(formData.get('options') as string) : {};

    if (!file) {
      return NextResponse.json(
        { error: 'EPUB file is required' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.name.endsWith('.epub') && file.type !== 'application/epub+zip') {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload an EPUB file.' },
        { status: 400 }
      );
    }

    // Validate file size (50MB limit)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 50MB.' },
        { status: 400 }
      );
    }

    const parser = new EpubParser();

    try {
      const metadata = await parser.parseFile(file);

      // Filter chapters if requested
      let filteredChapters = metadata.chapters;
      if (options.maxChapters && options.maxChapters > 0) {
        filteredChapters = metadata.chapters.slice(0, options.maxChapters);
      }

      // Prepare response
      const result = {
        ...metadata,
        chapters: filteredChapters.map(chapter => ({
          ...chapter,
          // Truncate content for response if it's too long
          content: chapter.content.length > 10000 
            ? chapter.content.substring(0, 10000) + '...'
            : chapter.content,
        })),
        originalChapterCount: metadata.chapters.length,
        processedChapterCount: filteredChapters.length,
      };

      return NextResponse.json({
        success: true,
        data: result,
        metadata: {
          fileName: file.name,
          fileSize: file.size,
          processedAt: new Date().toISOString(),
          totalChapters: metadata.chapters.length,
          processedChapters: filteredChapters.length,
        },
      });

    } finally {
      // Clean up parser resources
      parser.destroy();
    }

  } catch (error) {
    console.error('Error processing EPUB:', error);

    // Handle specific parsing errors
    if (error instanceof Error) {
      if (error.message.includes('valid EPUB')) {
        return NextResponse.json(
          { error: 'Invalid EPUB file. Please ensure the file is not corrupted.' },
          { status: 400 }
        );
      }
      
      if (error.message.includes('memory') || error.message.includes('size')) {
        return NextResponse.json(
          { error: 'EPUB file is too large or complex to process.' },
          { status: 413 }
        );
      }
    }

    return NextResponse.json(
      { 
        error: 'Failed to process EPUB file',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  if (action === 'supported-formats') {
    return NextResponse.json({
      supportedFormats: ['.epub'],
      maxFileSize: '50MB',
      supportedFeatures: [
        'Chapter extraction',
        'Metadata parsing',
        'Text content extraction',
        'Table of contents parsing',
      ],
    });
  }

  if (action === 'health') {
    return NextResponse.json({
      status: 'healthy',
      service: 'epub-processor',
      timestamp: new Date().toISOString(),
    });
  }

  return NextResponse.json(
    { error: 'Invalid action parameter' },
    { status: 400 }
  );
}