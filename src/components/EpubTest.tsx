import React, { useState } from 'react';
import EpubUploader from './EpubUploader';
import { EpubService, EpubMetadata, Chapter } from '../services/epubService';
import { BookImageService } from '../services/bookImageService';
import { Scene } from '../services/imageGenerationService';

const EpubTest: React.FC = () => {
  const [metadata, setMetadata] = useState<EpubMetadata | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [error, setError] = useState<string>('');
  const [generatedImages, setGeneratedImages] = useState<Map<string, Scene[]>>(new Map());
  const [isGeneratingImages, setIsGeneratingImages] = useState<boolean>(false);
  const epubService = new EpubService();
  const bookImageService = new BookImageService();

  const handleFileUpload = async (file: File) => {
    try {
      await epubService.loadEpub(file);
      const metadata = await epubService.getMetadata();
      const chapters = await epubService.getChapters();
      setMetadata(metadata);
      setChapters(chapters);
      setError('');
      setGeneratedImages(new Map());
    } catch (err) {
      console.error('Error processing ePUB:', err);
      const errorMessage = err instanceof Error ? 
        `${err.message}\n${err.stack}` : 
        'An error occurred while processing the ePUB file';
      setError(errorMessage);
      setMetadata(null);
      setChapters([]);
      setGeneratedImages(new Map());
    }
  };

  const handleGenerateImages = async () => {
    if (chapters.length === 0) return;

    setIsGeneratingImages(true);
    setError('');

    try {
      const images = await bookImageService.processBook(chapters);
      setGeneratedImages(images);
    } catch (err) {
      console.error('Error generating images:', err);
      const errorMessage = err instanceof Error ? 
        `${err.message}\n${err.stack}` : 
        'An error occurred while generating images';
      setError(errorMessage);
    } finally {
      setIsGeneratingImages(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">ePUB Test</h1>
        <p className="text-gray-600">Upload and process your ePUB files with AI-generated imagery</p>
      </div>

      <EpubUploader onFileUpload={handleFileUpload} />
      
      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg whitespace-pre-wrap font-mono text-sm">
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

              <div>
                <h3 className="text-lg font-medium text-gray-700 mb-4">Publication Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {metadata.publisher && (
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Publisher</p>
                      <p className="font-medium text-gray-800">{metadata.publisher}</p>
                    </div>
                  )}
                  {metadata.date && (
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Publication Date</p>
                      <p className="font-medium text-gray-800">{metadata.date}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {chapters.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-800">Chapters</h2>
              <button
                onClick={handleGenerateImages}
                disabled={isGeneratingImages}
                className={`px-6 py-2.5 rounded-lg font-medium transition-colors duration-200 ${
                  isGeneratingImages
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                }`}
              >
                {isGeneratingImages ? 'Generating...' : 'Generate Images'}
              </button>
            </div>
            <div className="space-y-8">
              {chapters.map((chapter) => (
                <div key={chapter.id} className="border-b border-gray-100 pb-8 last:border-b-0">
                  <h3 className="text-lg font-medium text-gray-700 mb-4">{chapter.title}</h3>
                  {generatedImages.has(chapter.id) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                      {generatedImages.get(chapter.id)?.map((scene, index) => (
                        <div key={index} className="bg-gray-50 rounded-lg overflow-hidden">
                          <img
                            src={`data:image/png;base64,${scene.imageData}`}
                            alt={scene.description}
                            className="w-full h-48 object-cover"
                          />
                          <p className="p-4 text-sm text-gray-600">{scene.description}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  {chapter.sections.map((section) => (
                    <div key={section.id} className="ml-4 mb-4">
                      <h4 className="text-md font-medium text-gray-600 mb-2">{section.title}</h4>
                      <p className="text-sm text-gray-500 leading-relaxed">{section.content}</p>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EpubTest; 