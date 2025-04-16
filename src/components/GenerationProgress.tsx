import React from 'react';

export interface GenerationProgressProps {
  totalScenes: number;
  currentScene: number;
  currentStep: 'analyzing' | 'generating-prompt' | 'generating-image' | 'complete';
  error?: string;
}

const GenerationProgress: React.FC<GenerationProgressProps> = ({
  totalScenes,
  currentScene,
  currentStep,
  error
}) => {
  const getStepPercentage = () => {
    switch (currentStep) {
      case 'analyzing':
        return 25;
      case 'generating-prompt':
        return 50;
      case 'generating-image':
        return 75;
      case 'complete':
        return 100;
      default:
        return 0;
    }
  };

  const getStepMessage = () => {
    switch (currentStep) {
      case 'analyzing':
        return 'Analyzing chapter content...';
      case 'generating-prompt':
        return 'Generating scene description...';
      case 'generating-image':
        return 'Creating image...';
      case 'complete':
        return 'Scene complete!';
      default:
        return '';
    }
  };

  const totalProgress = ((currentScene - 1) * 100 + getStepPercentage()) / totalScenes;

  return (
    <div className="w-full space-y-4">
      {/* Overall progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-gray-600">
          <span>Overall Progress</span>
          <span>{Math.round(totalProgress)}%</span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-all duration-300"
            style={{ width: `${totalProgress}%` }}
          />
        </div>
      </div>

      {/* Current scene progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-gray-600">
          <span>Scene {currentScene} of {totalScenes}</span>
          <span>{getStepPercentage()}%</span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 transition-all duration-300"
            style={{ width: `${getStepPercentage()}%` }}
          />
        </div>
        <p className="text-sm text-gray-600">{getStepMessage()}</p>
      </div>

      {/* Error message */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
    </div>
  );
};

export default GenerationProgress; 