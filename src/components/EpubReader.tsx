import React, { useState, useEffect } from 'react';
import EpubUploader from './EpubUploader';
import GenerateScenesButton from './GenerateScenesButton';
import ExpandableChapterBox from './ExpandableChapterBox';
import { EpubService, EpubMetadata, Chapter } from '../services/epubService';
import { Scene } from '../services/imageGenerationService';
import { BookImageService } from '../services/bookImageService';

const EpubReader: React.FC = () => {
  const [metadata, setMetadata] = useState<EpubMetadata | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [error, setError] = useState<string>('');
  const [currentChapterIndex, setCurrentChapterIndex] = useState<number>(0);
  const [currentChapterScenes, setCurrentChapterScenes] = useState<Scene[]>([]);
  const epubService = new EpubService();
  const bookImageService = new BookImageService();

  useEffect(() => {
    // Load existing scenes when chapter changes
    const loadExistingScenes = async () => {
      if (chapters.length > 0 && currentChapterIndex >= 0) {
        try {
          const scenes = await bookImageService.processChapter(chapters[currentChapterIndex]);
          setCurrentChapterScenes(scenes);
        } catch (err) {
          console.error('Error loading existing scenes:', err);
          setCurrentChapterScenes([]);
        }
      }
    };

    loadExistingScenes();
  }, [currentChapterIndex, chapters]);

  const handleFileUpload = async (file: File) => {
    try {
      await epubService.loadEpub(file);
      const metadata = await epubService.getMetadata();
      const chapters = await epubService.getChapters();
      setMetadata(metadata);
      setChapters(chapters);
      setError('');
      setCurrentChapterIndex(0);
      setCurrentChapterScenes([]);
    } catch (err) {
      console.error('Error processing ePUB:', err);
      const errorMessage = err instanceof Error ? err.message : 'An error occurred while processing the ePUB file';
      setError(errorMessage);
      setMetadata(null);
      setChapters([]);
      setCurrentChapterScenes([]);
    }
  };

  const handlePreviousChapter = () => {
    if (currentChapterIndex > 0) {
      setCurrentChapterIndex(currentChapterIndex - 1);
    }
  };

  const handleNextChapter = () => {
    if (currentChapterIndex < chapters.length - 1) {
      setCurrentChapterIndex(currentChapterIndex + 1);
    }
  };

  const handleScenesGenerated = (scenes: Scene[]) => {
    setCurrentChapterScenes(scenes);
  };

  const handleClearScenes = async () => {
    try {
      if (chapters.length > 0 && currentChapterIndex >= 0) {
        await bookImageService.clearChapterScenes(chapters[currentChapterIndex].id);
        setCurrentChapterScenes([]);
      }
    } catch (err) {
      console.error('Error clearing scenes:', err);
      setError(err instanceof Error ? err.message : 'Failed to clear scenes');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">ePUB Reader</h1>
      
      {!metadata && (
        <EpubUploader onFileUpload={handleFileUpload} />
      )}

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {metadata && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-gray-800">{metadata.title}</h2>
            <p className="text-gray-600">by {metadata.creator}</p>
          </div>

          <div className="flex justify-between mb-6">
            <button
              onClick={handlePreviousChapter}
              disabled={currentChapterIndex === 0}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded disabled:opacity-50"
            >
              Previous Chapter
            </button>
            <button
              onClick={handleNextChapter}
              disabled={currentChapterIndex === chapters.length - 1}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded disabled:opacity-50"
            >
              Next Chapter
            </button>
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-700 mb-2">
              Chapter {currentChapterIndex + 1}: {chapters[currentChapterIndex].title}
            </h3>
          </div>

          <div className="space-y-4">
            {chapters[currentChapterIndex].sections.map((section) => (
              <ExpandableChapterBox
                key={section.id}
                title={section.title}
                content={section.content}
                maxLines={3}
              />
            ))}
          </div>

          <div className="mt-8 flex gap-4">
            <GenerateScenesButton 
              chapter={chapters[currentChapterIndex]} 
              onScenesGenerated={handleScenesGenerated} 
            />
            {currentChapterScenes.length > 0 && (
              <button
                onClick={handleClearScenes}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Clear Scenes
              </button>
            )}
          </div>

          {currentChapterScenes.length > 0 && (
            <div className="mt-8">
              <h3 className="text-lg font-medium text-gray-700 mb-4">Generated Scenes</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {currentChapterScenes.map((scene, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-800 mb-2">Scene {index + 1}</h4>
                    <p className="text-sm text-gray-600 mb-4">{scene.description}</p>
                    {(scene.imageData || scene.imageUrl) && (
                      <img 
                        src={scene.imageUrl || scene.imageData} 
                        alt={`Scene ${index + 1}`}
                        className="w-full rounded-lg"
                        onError={(e) => {
                          console.error('Error loading image:', e);
                          e.currentTarget.src = 'placeholder.png';
                        }}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EpubReader; 