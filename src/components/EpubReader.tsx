import React, { useState } from 'react';
import EpubUploader from './EpubUploader';
import GenerateScenesButton from './GenerateScenesButton';
import { EpubService, EpubMetadata, Chapter } from '../services/epubService';
import { Scene } from '../services/imageGenerationService';

const EpubReader: React.FC = () => {
  const [metadata, setMetadata] = useState<EpubMetadata | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [error, setError] = useState<string>('');
  const [currentChapterIndex, setCurrentChapterIndex] = useState<number>(0);
  const [currentChapterScenes, setCurrentChapterScenes] = useState<Scene[]>([]);
  const epubService = new EpubService();

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
      setCurrentChapterScenes([]);
    }
  };

  const handleNextChapter = () => {
    if (currentChapterIndex < chapters.length - 1) {
      setCurrentChapterIndex(currentChapterIndex + 1);
      setCurrentChapterScenes([]);
    }
  };

  const handleScenesGenerated = (scenes: Scene[]) => {
    setCurrentChapterScenes(scenes);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">ePUB Reader</h1>
        <p className="text-gray-600">Upload and read your ePUB files</p>
      </div>

      <EpubUploader onFileUpload={handleFileUpload} />
      
      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {metadata && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-6 text-gray-800">Book Information</h2>
            <div className="space-y-6">
              <div className="border-b border-gray-100 pb-6">
                <h3 className="text-lg font-medium text-gray-700 mb-4">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Title</p>
                    <p className="font-medium text-gray-800">{metadata.title}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Author</p>
                    <p className="font-medium text-gray-800">{metadata.author}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Language</p>
                    <p className="font-medium text-gray-800">{metadata.language}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {chapters.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-800">Chapter {currentChapterIndex + 1} of {chapters.length}</h2>
                <p className="text-sm text-gray-500 mt-1">{chapters[currentChapterIndex].title}</p>
              </div>
              <div className="flex space-x-4">
                <button
                  onClick={handlePreviousChapter}
                  disabled={currentChapterIndex === 0}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors duration-200 ${
                    currentChapterIndex === 0
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-blue-500 hover:bg-blue-600 text-white'
                  }`}
                >
                  Previous
                </button>
                <button
                  onClick={handleNextChapter}
                  disabled={currentChapterIndex === chapters.length - 1}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors duration-200 ${
                    currentChapterIndex === chapters.length - 1
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-blue-500 hover:bg-blue-600 text-white'
                  }`}
                >
                  Next
                </button>
              </div>
            </div>
            
            <div className="mb-6">
              {chapters[currentChapterIndex].sections.map((section) => (
                <div key={section.id} className="mb-6">
                  <h3 className="text-lg font-medium text-gray-700 mb-2">{section.title}</h3>
                  <div className="text-gray-600 leading-relaxed" dangerouslySetInnerHTML={{ __html: section.content }} />
                </div>
              ))}
            </div>

            <div className="mt-8">
              <GenerateScenesButton 
                chapter={chapters[currentChapterIndex]} 
                onScenesGenerated={handleScenesGenerated} 
              />
            </div>

            {currentChapterScenes.length > 0 && (
              <div className="mt-8">
                <h3 className="text-lg font-medium text-gray-700 mb-4">Generated Scenes</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {currentChapterScenes.map((scene, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <h4 className="font-medium text-gray-800 mb-2">Scene {index + 1}</h4>
                      <p className="text-sm text-gray-600 mb-4">{scene.description}</p>
                      {scene.imageData && (
                        <img 
                          src={scene.imageData} 
                          alt={`Scene ${index + 1}`}
                          className="w-full rounded-lg"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default EpubReader; 