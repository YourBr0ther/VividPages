'use client';

import { useState, useEffect } from 'react';

export interface Configuration {
  selectedChapters: number;
  scenesPerChapter: number;
  llmModel: string;
  imageModel: string;
  imageQuality: 'standard' | 'hd';
  characterSensitivity: number;
}

interface ModelStatus {
  ollama: {
    available: boolean;
    models: string[];
    error: string | null;
  };
  openai: {
    available: boolean;
    models: string[];
    error: string | null;
  };
}

interface ConfigurationPanelProps {
  maxChapters: number;
  onConfigChange: (config: Configuration) => void;
  isProcessing?: boolean;
}

const DEFAULT_CONFIG: Configuration = {
  selectedChapters: 1,
  scenesPerChapter: 1,
  llmModel: 'llama2',
  imageModel: 'dall-e-2',
  imageQuality: 'standard',
  characterSensitivity: 0.7,
};

export default function ConfigurationPanel({ 
  maxChapters, 
  onConfigChange, 
  isProcessing = false 
}: ConfigurationPanelProps) {
  const [config, setConfig] = useState<Configuration>(DEFAULT_CONFIG);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [modelStatus, setModelStatus] = useState<ModelStatus | null>(null);
  const [loadingModels, setLoadingModels] = useState(true);

  // Fetch available models on component mount
  useEffect(() => {
    const fetchModels = async () => {
      try {
        const response = await fetch('/api/models');
        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            setModelStatus(result.data);
            
            // Update default models if available
            const updates: Partial<Configuration> = {};
            
            // Use first available Ollama model if default not available
            if (result.data.ollama.available && result.data.ollama.models.length > 0) {
              if (!result.data.ollama.models.includes(config.llmModel)) {
                updates.llmModel = result.data.ollama.models[0];
              }
            }
            
            // Use first available OpenAI model if default not available
            if (result.data.openai.available && result.data.openai.models.length > 0) {
              if (!result.data.openai.models.includes(config.imageModel)) {
                updates.imageModel = result.data.openai.models[0];
              }
            }
            
            if (Object.keys(updates).length > 0) {
              updateConfig(updates);
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch models:', error);
      } finally {
        setLoadingModels(false);
      }
    };

    fetchModels();
  }, []);

  const updateConfig = (updates: Partial<Configuration>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    onConfigChange(newConfig);
  };

  // Generate dynamic model options based on availability
  const getAvailableLLMModels = () => {
    if (!modelStatus?.ollama.available) {
      return [{ value: 'llama2', label: 'Llama 2 (Offline)', disabled: true }];
    }
    
    return modelStatus.ollama.models.length > 0 
      ? modelStatus.ollama.models.map(model => ({
          value: model,
          label: model === 'llama2' ? `${model} (Recommended)` : model,
          disabled: false
        }))
      : [{ value: 'llama2', label: 'No models available', disabled: true }];
  };

  const getAvailableImageModels = () => {
    if (!modelStatus?.openai.available) {
      return [
        { value: 'dall-e-2', label: 'DALL-E 2 (Offline)', disabled: true },
        { value: 'dall-e-3', label: 'DALL-E 3 (Offline)', disabled: true }
      ];
    }
    
    return modelStatus.openai.models.length > 0
      ? modelStatus.openai.models.map(model => ({
          value: model,
          label: model === 'dall-e-3' ? `${model} (Highest Quality)` : 
                 model === 'dall-e-2' ? `${model} (Cost Effective)` : model,
          disabled: false
        }))
      : [{ value: 'dall-e-2', label: 'No models available', disabled: true }];
  };

  const ServiceStatus = ({ service, status }: { service: string; status: { available: boolean; error: string | null } }) => (
    <div className="flex items-center space-x-2">
      <div className={`w-2 h-2 rounded-full ${status.available ? 'bg-green-400' : 'bg-red-400'}`} />
      <span className="text-xs text-text-muted">
        {service}: {status.available ? 'Online' : 'Offline'}
        {status.error && ` (${status.error})`}
      </span>
    </div>
  );

  return (
    <div className="bg-primary-navy/30 backdrop-blur-sm rounded-xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-serif font-semibold text-primary-gold">
          Configuration
        </h2>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-sm text-text-muted hover:text-text-light transition-colors"
        >
          {showAdvanced ? 'Hide' : 'Show'} Advanced Options
        </button>
      </div>

      {/* Basic Settings */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-text-light mb-2">
            Number of Chapters to Process
          </label>
          <div className="flex items-center space-x-4">
            <input
              type="range"
              min="1"
              max={maxChapters}
              value={config.selectedChapters}
              onChange={(e) => updateConfig({ selectedChapters: parseInt(e.target.value) })}
              disabled={isProcessing}
              className="flex-1 h-2 bg-primary-navy rounded-lg appearance-none cursor-pointer slider"
            />
            <span className="text-primary-gold font-semibold min-w-[3rem] text-center">
              {config.selectedChapters}
            </span>
          </div>
          <p className="text-xs text-text-muted mt-1">
            Maximum: {maxChapters} chapters available
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-text-light mb-2">
            Scenes per Chapter
          </label>
          <div className="flex items-center space-x-4">
            <input
              type="range"
              min="1"
              max="5"
              value={config.scenesPerChapter}
              onChange={(e) => updateConfig({ scenesPerChapter: parseInt(e.target.value) })}
              disabled={isProcessing}
              className="flex-1 h-2 bg-primary-navy rounded-lg appearance-none cursor-pointer slider"
            />
            <span className="text-primary-gold font-semibold min-w-[3rem] text-center">
              {config.scenesPerChapter}
            </span>
          </div>
          <p className="text-xs text-text-muted mt-1">
            More scenes = more detailed visual story but longer processing time
          </p>
        </div>
      </div>

      {/* Service Status */}
      {modelStatus && (
        <div className="bg-primary-navy/20 rounded-lg p-3 space-y-2">
          <div className="text-sm font-medium text-text-light mb-2">Service Status</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <ServiceStatus service="Ollama" status={modelStatus.ollama} />
            <ServiceStatus service="OpenAI" status={modelStatus.openai} />
          </div>
          {loadingModels && (
            <div className="text-xs text-text-muted">
              <span className="animate-pulse">Checking services...</span>
            </div>
          )}
        </div>
      )}

      {/* Advanced Settings */}
      {showAdvanced && (
        <div className="space-y-4 pt-4 border-t border-primary-gold/20">
          <div>
            <label className="block text-sm font-medium text-text-light mb-2">
              Local LLM Model (Ollama)
            </label>
            <select
              value={config.llmModel}
              onChange={(e) => updateConfig({ llmModel: e.target.value })}
              disabled={isProcessing || loadingModels || !modelStatus?.ollama.available}
              className="w-full bg-primary-navy border border-primary-gold/30 rounded-lg px-3 py-2 text-text-light focus:border-primary-gold focus:outline-none disabled:opacity-50"
            >
              {getAvailableLLMModels().map((model) => (
                <option key={model.value} value={model.value} disabled={model.disabled}>
                  {model.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-text-muted mt-1">
              {modelStatus?.ollama.available 
                ? `${modelStatus.ollama.models.length} model(s) available`
                : 'Ollama service not available - check connection'
              }
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-light mb-2">
              Image Generation Model (OpenAI)
            </label>
            <select
              value={config.imageModel}
              onChange={(e) => updateConfig({ imageModel: e.target.value })}
              disabled={isProcessing || loadingModels || !modelStatus?.openai.available}
              className="w-full bg-primary-navy border border-primary-gold/30 rounded-lg px-3 py-2 text-text-light focus:border-primary-gold focus:outline-none disabled:opacity-50"
            >
              {getAvailableImageModels().map((model) => (
                <option key={model.value} value={model.value} disabled={model.disabled}>
                  {model.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-text-muted mt-1">
              {modelStatus?.openai.available 
                ? `${modelStatus.openai.models.length} model(s) available`
                : 'OpenAI API not available - check API key configuration'
              }
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-light mb-2">
              Image Generation Quality
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => updateConfig({ imageQuality: 'standard' })}
                disabled={isProcessing}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  config.imageQuality === 'standard'
                    ? 'bg-primary-gold text-primary-navy'
                    : 'bg-primary-navy border border-primary-gold/30 text-text-light hover:border-primary-gold/60'
                }`}
              >
                Standard
              </button>
              <button
                onClick={() => updateConfig({ imageQuality: 'hd' })}
                disabled={isProcessing}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  config.imageQuality === 'hd'
                    ? 'bg-primary-gold text-primary-navy'
                    : 'bg-primary-navy border border-primary-gold/30 text-text-light hover:border-primary-gold/60'
                }`}
              >
                HD (Slower)
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-light mb-2">
              Character Extraction Sensitivity
            </label>
            <div className="flex items-center space-x-4">
              <input
                type="range"
                min="0.3"
                max="1"
                step="0.1"
                value={config.characterSensitivity}
                onChange={(e) => updateConfig({ characterSensitivity: parseFloat(e.target.value) })}
                disabled={isProcessing}
                className="flex-1 h-2 bg-primary-navy rounded-lg appearance-none cursor-pointer slider"
              />
              <span className="text-primary-gold font-semibold min-w-[3rem] text-center">
                {(config.characterSensitivity * 100).toFixed(0)}%
              </span>
            </div>
            <p className="text-xs text-text-muted mt-1">
              Higher sensitivity finds more characters but may include minor ones
            </p>
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="bg-background-dark/50 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-primary-gold mb-2">Processing Summary</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-text-muted">Total scenes:</span>
            <span className="text-text-light ml-2 font-semibold">
              {config.selectedChapters * config.scenesPerChapter}
            </span>
          </div>
          <div>
            <span className="text-text-muted">Estimated time:</span>
            <span className="text-text-light ml-2 font-semibold">
              {Math.ceil((config.selectedChapters * config.scenesPerChapter * 30) / 60)} min
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}