import { NextRequest, NextResponse } from 'next/server';
import { storage } from '@/lib/storage';

export async function POST(request: NextRequest) {
  try {
    const projectData = await request.json();

    if (!projectData || !projectData.project) {
      return NextResponse.json(
        { success: false, error: 'Invalid project data' },
        { status: 400 }
      );
    }

    // Initialize storage
    await storage.init();

    // Import project
    const success = await storage.importProject(projectData);

    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Failed to import project' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      projectId: projectData.project.id,
      message: 'Project imported successfully',
    });

  } catch (error) {
    console.error('Import project error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Import failed' 
      },
      { status: 500 }
    );
  }
}