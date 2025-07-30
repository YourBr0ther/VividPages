'use client';

import { useState, useCallback } from 'react';
import { storage } from '@/lib/storage';
import { EpubParser } from '@/lib/epub-parser';
import EpubUpload from '@/components/upload/EpubUpload';
import ConfigurationPanel, { Configuration } from '@/components/configuration/ConfigurationPanel';
import CharacterViewer, { Character } from '@/components/character-viewer/CharacterViewer';
import ImageGallery, { GalleryImage } from '@/components/gallery/ImageGallery';
import { EpubMetadata, Chapter, Scene } from '@/lib/types/export';

type WorkshopStep = 'upload' | 'configure' | 'processing' | 'characters' | 'scenes' | 'gallery';

interface ProjectData {
  id: string;
  name: string;
  epubMetadata: EpubMetadata;
  chapters: Chapter[];
  characters: Character[];
  scenes: Scene[];
  images: GalleryImage[];
  configuration: Configuration;
}

export default function WorkshopPage() {
  const [currentStep, setCurrentStep] = useState<WorkshopStep>('upload');
  const [project, setProject] = useState<ProjectData | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = useCallback(async (file: File) => {
    setProcessing(true);
    setError(null);

    try {
      // Parse EPUB file
      const parser = new EpubParser();
      const metadata = await parser.parseFile(file);

      // Create new project
      const projectId = `project-${Date.now()}`;
      const newProject: ProjectData = {
        id: projectId,
        name: metadata.title || file.name,
        epubMetadata: metadata,
        chapters: metadata.chapters,
        characters: [],
        scenes: [],
        images: [],
        configuration: {
          selectedChapters: Math.min(metadata.chapters.length, 3),
          scenesPerChapter: 1,
          llmModel: 'llama2',
          imageModel: 'dall-e-2',
          imageQuality: 'standard',
          characterSensitivity: 0.7,
        },
      };

      setProject(newProject);
      setCurrentStep('configure');

      // Initialize storage
      await storage.init();

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process EPUB file');
      console.error('EPUB processing error:', err);
    } finally {
      setProcessing(false);
    }
  }, []);

  const handleConfigurationChange = useCallback((config: Configuration) => {
    if (project) {
      setProject({
        ...project,
        configuration: config,
      });
    }
  }, [project]);

  const handleStartProcessing = useCallback(async () => {
    if (!project) return;

    setCurrentStep('processing');
    setProcessing(true);
    setError(null);

    try {
      // Extract characters
      const response = await fetch('/api/characters', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookText: project.chapters.slice(0, project.configuration.selectedChapters)
            .map(ch => ch.content).join('\n\n'),
          model: project.configuration.llmModel,
          generateImages: true,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to extract characters');
      }

      const data = await response.json();
      if (data.success) {
        setProject(prev => prev ? {
          ...prev,
          characters: data.characters,
        } : null);
        setCurrentStep('characters');
      } else {
        throw new Error(data.error || 'Character extraction failed');
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Processing failed');
      console.error('Processing error:', err);
      setCurrentStep('configure');
    } finally {
      setProcessing(false);
    }
  }, [project]);

  const handleCharacterImageGeneration = useCallback(async (character: Character) => {
    if (!character.imagePrompt) return;

    try {
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'character',
          characterName: character.name,
          description: character.description,
          prompt: character.imagePrompt,
          model: project?.configuration.imageModel || 'dall-e-2',
          quality: project?.configuration.imageQuality || 'standard',
          size: '512x512',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate character image');
      }

      const data = await response.json();
      if (data.success) {
        // Update character with generated image
        setProject(prev => {
          if (!prev) return null;
          
          const updatedCharacters = prev.characters.map(char =>
            char.name === character.name
              ? { ...char, image: data.image }
              : char
          );

          return {
            ...prev,
            characters: updatedCharacters,
          };
        });
      }
    } catch (err) {
      console.error('Image generation error:', err);
      setError(err instanceof Error ? err.message : 'Image generation failed');
    }
  }, []);

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'upload':
        return (
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-serif font-bold text-primary-gold mb-4">
                Create Your Visual Story
              </h1>
              <p className="text-text-muted text-lg">
                Upload an EPUB file to transform it into a visual experience
              </p>
            </div>
            <EpubUpload
              onFileUpload={handleFileUpload}
              isProcessing={processing}
            />
            {error && (
              <div className="mt-4 p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
                <p className="text-red-400">{error}</p>
              </div>
            )}
          </div>
        );

      case 'configure':
        return project ? (
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="text-center">
              <h1 className="text-4xl font-serif font-bold text-primary-gold mb-2">
                Configure Processing
              </h1>
              <p className="text-text-muted">
                Book: <span className="text-text-light">{project.name}</span>
              </p>
              <p className="text-text-muted">
                {project.chapters.length} chapters available
              </p>
            </div>

            <ConfigurationPanel
              maxChapters={project.chapters.length}
              onConfigChange={handleConfigurationChange}
              isProcessing={processing}
            />

            <div className="flex justify-center space-x-4">
              <button
                onClick={() => setCurrentStep('upload')}
                className="px-6 py-3 border border-primary-gold/30 text-text-light rounded-lg hover:border-primary-gold/60 transition-colors"
              >
                Back to Upload
              </button>
              <button
                onClick={handleStartProcessing}
                disabled={processing}
                className="px-6 py-3 bg-primary-gold hover:bg-accent-gold text-primary-navy font-semibold rounded-lg transition-colors disabled:opacity-50"
              >
                {processing ? 'Processing...' : 'Start Processing'}
              </button>
            </div>

            {error && (
              <div className="mt-4 p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
                <p className="text-red-400">{error}</p>
              </div>
            )}
          </div>
        ) : null;

      case 'processing':
        return (
          <div className="max-w-2xl mx-auto text-center">
            <div className="text-6xl mb-6">🤖</div>
            <h1 className="text-4xl font-serif font-bold text-primary-gold mb-4">
              AI Processing
            </h1>
            <div className="space-y-4">
              <div className="w-full bg-primary-navy rounded-full h-2">
                <div className="bg-primary-gold h-2 rounded-full animate-pulse w-3/4"></div>
              </div>
              <p className="text-text-muted">
                Extracting characters and analyzing scenes...
              </p>
              <p className="text-text-muted text-sm">
                This may take a few minutes depending on your book size
              </p>
            </div>
          </div>
        );

      case 'characters':
        return project ? (
          <div className="max-w-6xl mx-auto space-y-8">
            <div className="text-center">
              <h1 className="text-4xl font-serif font-bold text-primary-gold mb-2">
                Extracted Characters
              </h1>
              <p className="text-text-muted">
                {project.characters.length} characters found in your book
              </p>
            </div>

            <CharacterViewer
              characters={project.characters}
              onGenerateImage={handleCharacterImageGeneration}
              showActions={true}
              showDetails={true}
            />

            <div className="flex justify-center space-x-4">
              <button
                onClick={() => setCurrentStep('configure')}
                className="px-6 py-3 border border-primary-gold/30 text-text-light rounded-lg hover:border-primary-gold/60 transition-colors"
              >
                Back to Configuration
              </button>
              <button
                onClick={() => setCurrentStep('gallery')}
                className="px-6 py-3 bg-primary-gold hover:bg-accent-gold text-primary-navy font-semibold rounded-lg transition-colors"
              >
                View Gallery
              </button>
            </div>
          </div>
        ) : null;

      case 'gallery':
        return project ? (
          <div className="max-w-6xl mx-auto space-y-8">
            <div className="text-center">
              <h1 className="text-4xl font-serif font-bold text-primary-gold mb-2">
                Visual Gallery
              </h1>
              <p className="text-text-muted">
                Your book brought to life through AI-generated imagery
              </p>
            </div>

            <ImageGallery
              images={project.images}
              projectId={project.id}
              showFilters={true}
              showActions={true}
              showExport={true}
            />

            <div className="flex justify-center space-x-4">
              <button
                onClick={() => setCurrentStep('characters')}
                className="px-6 py-3 border border-primary-gold/30 text-text-light rounded-lg hover:border-primary-gold/60 transition-colors"
              >
                Back to Characters
              </button>
              <button
                onClick={() => setCurrentStep('upload')}
                className="px-6 py-3 bg-primary-gold hover:bg-accent-gold text-primary-navy font-semibold rounded-lg transition-colors"
              >
                New Project
              </button>
            </div>
          </div>
        ) : null;

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background-dark">
      {/* Progress Steps */}
      <div className="bg-primary-navy/30 border-b border-primary-gold/20">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-center space-x-4 text-sm overflow-x-auto">
            {[
              { key: 'upload', label: 'Upload', icon: '📚' },
              { key: 'configure', label: 'Configure', icon: '⚙️' },
              { key: 'processing', label: 'Processing', icon: '🤖' },
              { key: 'characters', label: 'Characters', icon: '👥' },
              { key: 'gallery', label: 'Gallery', icon: '🎨' },
            ].map((step, _index) => (
              <div
                key={step.key}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                  currentStep === step.key
                    ? 'bg-primary-gold text-primary-navy'
                    : 'text-text-muted'
                }`}
              >
                <span>{step.icon}</span>
                <span>{step.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {renderCurrentStep()}
      </div>
    </div>
  );
}