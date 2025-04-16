import React, { useState } from 'react';
import { Chapter } from '../services/epubService';
import { BookImageService } from '../services/bookImageService';
import { Scene } from '../services/imageGenerationService';
import GenerationProgress from './GenerationProgress';

interface GenerateScenesButtonProps {
  chapter: Chapter;
  onScenesGenerated: (scenes: Scene[]) => void;
}

const GenerateScenesButton: React.FC<GenerateScenesButtonProps> = ({ chapter, onScenesGenerated }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [currentScene, setCurrentScene] = useState(1);
  const [currentStep, setCurrentStep] = useState<'analyzing' | 'generating-prompt' | 'generating-image' | 'complete'>('analyzing');
  const [totalScenes] = useState(parseInt(import.meta.env.VITE_MAX_SCENES_PER_CHAPTER || '5'));

  const handleGenerateScenes = async () => {
    try {
      setIsLoading(true);
      setError('');
      setCurrentScene(1);
      setCurrentStep('analyzing');

      const bookImageService = new BookImageService({
        onProgress: (scene: number, step: 'analyzing' | 'generating-prompt' | 'generating-image' | 'complete') => {
          setCurrentScene(scene);
          setCurrentStep(step);
        }
      });

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
    <div className="flex flex-col items-center space-y-4">
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

      {isLoading && (
        <div className="w-full max-w-md">
          <GenerationProgress
            totalScenes={totalScenes}
            currentScene={currentScene}
            currentStep={currentStep}
            error={error}
          />
        </div>
      )}

      {!isLoading && error && (
        <p className="text-red-500 text-sm">{error}</p>
      )}
    </div>
  );
};

export default GenerateScenesButton; 