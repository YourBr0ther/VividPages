import React, { useState } from 'react';
import EpubUploader from './EpubUploader';
import { EpubService, EpubMetadata, Chapter } from '../services/epubService';

const EpubTest: React.FC = () => {
  const [metadata, setMetadata] = useState<EpubMetadata | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [error, setError] = useState<string>('');
  const epubService = new EpubService();

  const handleFileUpload = async (file: File) => {
    try {
      await epubService.loadEpub(file);
      const metadata = await epubService.getMetadata();
      const chapters = await epubService.getChapters();
      setMetadata(metadata);
      setChapters(chapters);
      setError('');
    } catch (err) {
      console.error('Error processing ePUB:', err);
      const errorMessage = err instanceof Error ? 
        `${err.message}\n${err.stack}` : 
        'An error occurred while processing the ePUB file';
      setError(errorMessage);
      setMetadata(null);
      setChapters([]);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">ePUB Test</h1>
      <EpubUploader onFileUpload={handleFileUpload} />
      
      {error && (
        <div className="mt-4 p-4 bg-red-100 text-red-700 rounded whitespace-pre-wrap font-mono text-sm">
          {error}
        </div>
      )}

      {metadata && (
        <div className="mt-6">
          <div className="bg-white shadow-md rounded-lg overflow-hidden">
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-800">Book Information</h2>
              <div className="space-y-4">
                <div className="border-b pb-4">
                  <h3 className="text-lg font-medium text-gray-700 mb-2">Basic Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Title</p>
                      <p className="font-medium">{metadata.title}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Author</p>
                      <p className="font-medium">{metadata.author}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Language</p>
                      <p className="font-medium">{metadata.language}</p>
                    </div>
                  </div>
                </div>

                <div className="border-b pb-4">
                  <h3 className="text-lg font-medium text-gray-700 mb-2">Publication Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {metadata.publisher && (
                      <div>
                        <p className="text-sm text-gray-500">Publisher</p>
                        <p className="font-medium">{metadata.publisher}</p>
                      </div>
                    )}
                    {metadata.date && (
                      <div>
                        <p className="text-sm text-gray-500">Publication Date</p>
                        <p className="font-medium">{metadata.date}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {chapters.length > 0 && (
        <div className="mt-6">
          <div className="bg-white shadow-md rounded-lg overflow-hidden">
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-800">Chapters</h2>
              <div className="space-y-4">
                {chapters.map((chapter) => (
                  <div key={chapter.id} className="border-b pb-4 last:border-b-0">
                    <h3 className="text-lg font-medium text-gray-700 mb-2">{chapter.title}</h3>
                    {chapter.sections.map((section) => (
                      <div key={section.id} className="ml-4 mb-2">
                        <h4 className="text-md font-medium text-gray-600">{section.title}</h4>
                        <p className="text-sm text-gray-500 mt-1 line-clamp-3">{section.content}</p>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EpubTest; 