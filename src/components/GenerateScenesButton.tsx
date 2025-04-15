import React, { useState } from 'react';
import { Chapter } from '../services/epubService';
import { BookImageService } from '../services/bookImageService';
import { Scene } from '../services/imageGenerationService';

interface GenerateScenesButtonProps {
  chapter: Chapter;
  onScenesGenerated: (scenes: Scene[]) => void;
}

const GenerateScenesButton: React.FC<GenerateScenesButtonProps> = ({ chapter, onScenesGenerated }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const handleGenerateScenes = async () => {
    try {
      setIsLoading(true);
      setError('');

      const bookImageService = new BookImageService();
      const scenes = await bookImageService.processChapter(chapter);
      
      onScenesGenerated(scenes);
    } catch (err) {
      console.error('Error generating scenes:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate scenes');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center space-y-2">
      <button
        onClick={handleGenerateScenes}
        disabled={isLoading}
        className={`px-4 py-2 rounded-lg font-medium transition-colors duration-200 ${
          isLoading
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : 'bg-green-500 hover:bg-green-600 text-white'
        }`}
      >
        {isLoading ? 'Generating Scenes...' : 'Generate Scenes'}
      </button>
      {error && (
        <p className="text-red-500 text-sm">{error}</p>
      )}
    </div>
  );
};

export default GenerateScenesButton; 