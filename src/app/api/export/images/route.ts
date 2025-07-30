import { NextRequest, NextResponse } from 'next/server';
import JSZip from 'jszip';
import { storage } from '@/lib/storage';

export async function POST(request: NextRequest) {
  try {
    const { projectId, imageIds } = await request.json();

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'Project ID is required' },
        { status: 400 }
      );
    }

    // Initialize storage
    await storage.init();

    // Get images from storage
    const images = imageIds 
      ? await storage.getImagesByIds(imageIds)
      : await storage.getProjectImages(projectId);

    if (!images || images.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No images found for export' },
        { status: 404 }
      );
    }

    // Create ZIP file
    const zip = new JSZip();
    const imagesFolder = zip.folder('vividpages-images');

    if (!imagesFolder) {
      throw new Error('Failed to create ZIP folder');
    }

    // Add images to ZIP
    for (const image of images) {
      if (image.imageUrl) {
        try {
          // Fetch image data
          const response = await fetch(image.imageUrl);
          const blob = await response.blob();
          const arrayBuffer = await blob.arrayBuffer();
          const uint8Array = new Uint8Array(arrayBuffer);

          // Create filename
          const filename = `${image.type}_${image.id}_${image.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.png`;
          
          // Add to ZIP
          imagesFolder.file(filename, uint8Array);

          // Add metadata JSON
          const metadata = {
            id: image.id,
            title: image.title,
            description: image.description,
            type: image.type,
            chapter: image.chapter,
            scene: image.scene,
            tags: image.tags,
            createdAt: image.createdAt,
          };
          
          imagesFolder.file(`${filename}.json`, JSON.stringify(metadata, null, 2));
        } catch (error) {
          console.error(`Failed to add image ${image.id} to ZIP:`, error);
        }
      }
    }

    // Generate ZIP buffer
    const zipBuffer = await zip.generateAsync({ 
      type: 'arraybuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    });

    // Return ZIP file
    return new NextResponse(zipBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="vividpages-export-${Date.now()}.zip"`,
      },
    });

  } catch (error) {
    console.error('Export images error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Export failed' 
      },
      { status: 500 }
    );
  }
}