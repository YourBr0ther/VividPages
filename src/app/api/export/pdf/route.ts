import { NextRequest, NextResponse } from 'next/server';
import { storage } from '@/lib/storage';

// Since we can't use server-side PDF libraries in Edge runtime,
// we'll create a client-side compatible response
export async function POST(request: NextRequest) {
  try {
    const { projectId, includeCharacters = true, includeScenes = true } = await request.json();

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'Project ID is required' },
        { status: 400 }
      );
    }

    // Initialize storage
    await storage.init();

    // Get project data
    const project = await storage.getProject(projectId);
    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }

    // Get images
    const images = await storage.getProjectImages(projectId);

    // Prepare PDF data structure for client-side generation
    const pdfData = {
      project: {
        name: project.name,
        createdAt: project.createdAt,
        metadata: project.metadata,
      },
      characters: includeCharacters ? images.filter(img => img.type === 'character') : [],
      scenes: includeScenes ? images.filter(img => img.type === 'scene') : [],
      generatedAt: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      data: pdfData,
    });

  } catch (error) {
    console.error('Export PDF data error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Export failed' 
      },
      { status: 500 }
    );
  }
}