import React, { useState } from 'react';
import EpubUploader from './EpubUploader';
import { EpubService, EpubMetadata } from '../services/epubService';

const EpubTest: React.FC = () => {
  const [metadata, setMetadata] = useState<EpubMetadata | null>(null);
  const [error, setError] = useState<string>('');
  const epubService = new EpubService();

  const handleFileUpload = async (file: File) => {
    try {
      await epubService.loadEpub(file);
      const metadata = await epubService.getMetadata();
      setMetadata(metadata);
      setError('');
    } catch (err) {
      console.error('Error processing ePUB:', err);
      const errorMessage = err instanceof Error ? 
        `${err.message}\n${err.stack}` : 
        'An error occurred while processing the ePUB file';
      setError(errorMessage);
      setMetadata(null);
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
        <div className="mt-4 p-4 bg-gray-100 rounded">
          <h2 className="text-xl font-semibold mb-2">Book Metadata</h2>
          <dl className="grid grid-cols-2 gap-2">
            <dt className="font-medium">Title:</dt>
            <dd>{metadata.title}</dd>
            
            <dt className="font-medium">Author:</dt>
            <dd>{metadata.author}</dd>
            
            <dt className="font-medium">Language:</dt>
            <dd>{metadata.language}</dd>
            
            {metadata.publisher && (
              <>
                <dt className="font-medium">Publisher:</dt>
                <dd>{metadata.publisher}</dd>
              </>
            )}
            
            {metadata.date && (
              <>
                <dt className="font-medium">Date:</dt>
                <dd>{metadata.date}</dd>
              </>
            )}
          </dl>
        </div>
      )}
    </div>
  );
};

export default EpubTest; 