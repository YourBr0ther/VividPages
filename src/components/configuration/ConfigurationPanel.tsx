'use client';

import { useState, useEffect } from 'react';

export interface Configuration {
  selectedChapters: number;
  scenesPerChapter: number;
  llmModel: string;
  imageModel: string;
  imageQuality: 'standard' | 'hd';
  characterSensitivity: number;
  artStyle: string;
  genre: string;
  aiProvider: 'ollama' | 'openai';
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

const STORAGE_KEY = 'vividpages-config';

// Art style options with descriptive names and modifiers
export const ART_STYLES = [
  { value: 'digital-art', label: 'Digital Art', description: 'Modern digital illustration style' },
  { value: 'oil-painting', label: 'Oil Painting', description: 'Classic painted artwork with rich textures' },
  { value: 'watercolor', label: 'Watercolor', description: 'Soft, flowing watercolor technique' },
  { value: 'pencil-sketch', label: 'Pencil Sketch', description: 'Detailed pencil and charcoal artwork' },
  { value: 'anime-manga', label: 'Anime/Manga', description: 'Japanese animation and comic style' },
  { value: 'photorealistic', label: 'Photorealistic', description: 'Highly detailed, photo-like quality' },
  { value: 'impressionist', label: 'Impressionist', description: 'Soft brushstrokes and light effects' },
  { value: 'art-nouveau', label: 'Art Nouveau', description: 'Decorative art with flowing lines' },
] as const;

// Genre options that influence mood and atmosphere
export const GENRES = [
  { value: 'fantasy', label: 'Fantasy', description: 'Magical worlds with mythical creatures' },
  { value: 'sci-fi', label: 'Science Fiction', description: 'Futuristic technology and space themes' },
  { value: 'horror', label: 'Horror', description: 'Dark, mysterious, and frightening atmosphere' },
  { value: 'mystery', label: 'Mystery', description: 'Noir atmosphere with detective elements' },
  { value: 'romance', label: 'Romance', description: 'Warm, intimate, and emotional scenes' },
  { value: 'adventure', label: 'Adventure', description: 'Action-packed and heroic themes' },
  { value: 'historical', label: 'Historical', description: 'Period-accurate settings and costumes' },
  { value: 'contemporary', label: 'Contemporary', description: 'Modern-day realistic settings' },
] as const;

const DEFAULT_CONFIG: Configuration = {
  selectedChapters: 1,
  scenesPerChapter: 1,
  llmModel: 'llama2',
  imageModel: 'dall-e-2',
  imageQuality: 'standard',
  characterSensitivity: 0.7,
  artStyle: 'digital-art',
  genre: 'fantasy',
  aiProvider: 'ollama',
};

// Load saved configuration from localStorage
const loadSavedConfig = (): Partial<Configuration> => {
  if (typeof window === 'undefined') return {};
  
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch (error) {
    console.error('Failed to load saved configuration:', error);
    return {};
  }
};

// Save configuration to localStorage
const saveConfig = (config: Configuration) => {
  if (typeof window === 'undefined') return;
  
  try {
    // Only save user preferences, not session-specific values
    const configToSave = {
      llmModel: config.llmModel,
      imageModel: config.imageModel,
      imageQuality: config.imageQuality,
      characterSensitivity: config.characterSensitivity,
      scenesPerChapter: config.scenesPerChapter,
      artStyle: config.artStyle,
      genre: config.genre,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(configToSave));
  } catch (error) {
    console.error('Failed to save configuration:', error);
  }
};

export default function ConfigurationPanel({ 
  maxChapters, 
  onConfigChange, 
  isProcessing = false 
}: ConfigurationPanelProps) {
  // Initialize config with saved preferences
  const [config, setConfig] = useState<Configuration>(() => {
    const savedConfig = loadSavedConfig();
    return {
      ...DEFAULT_CONFIG,
      selectedChapters: Math.min(maxChapters, DEFAULT_CONFIG.selectedChapters),
      ...savedConfig,
    };
  });
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
            
            // Update default models if available and not saved
            const updates: Partial<Configuration> = {};
            
            // Use first available Ollama model if saved model not available
            if (result.data.ollama.available && result.data.ollama.models.length > 0) {
              if (!result.data.ollama.models.includes(config.llmModel)) {
                // Only update if the current model is the default (not user-selected)
                if (config.llmModel === DEFAULT_CONFIG.llmModel) {
                  updates.llmModel = result.data.ollama.models[0];
                }
              }
            }
            
            // Use first available OpenAI model if saved model not available
            if (result.data.openai.available && result.data.openai.models.length > 0) {
              if (!result.data.openai.models.includes(config.imageModel)) {
                // Only update if the current model is the default (not user-selected)
                if (config.imageModel === DEFAULT_CONFIG.imageModel) {
                  updates.imageModel = result.data.openai.models[0];
                }
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

  // Notify parent of initial config (including saved preferences)
  useEffect(() => {
    onConfigChange(config);
  }, []);

  const updateConfig = (updates: Partial<Configuration>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    onConfigChange(newConfig);
    
    // Save configuration to localStorage
    saveConfig(newConfig);
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

  const clearSavedPreferences = () => {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.removeItem(STORAGE_KEY);
      // Reset to defaults
      const resetConfig = { ...DEFAULT_CONFIG, selectedChapters: Math.min(maxChapters, DEFAULT_CONFIG.selectedChapters) };
      setConfig(resetConfig);
      onConfigChange(resetConfig);
    } catch (error) {
      console.error('Failed to clear saved preferences:', error);
    }
  };

  return (
    <div className="bg-primary-navy/30 backdrop-blur-sm rounded-xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-serif font-semibold text-primary-gold">
          Configuration
        </h2>
        <div className="flex items-center space-x-3">
          {(typeof window !== 'undefined' && localStorage.getItem(STORAGE_KEY)) && (
            <button
              onClick={clearSavedPreferences}
              className="text-xs text-text-muted hover:text-red-400 transition-colors"
              title="Clear saved preferences"
            >
              Reset
            </button>
          )}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-sm text-text-muted hover:text-text-light transition-colors"
          >
            {showAdvanced ? 'Hide' : 'Show'} Advanced Options
          </button>
        </div>
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

        {/* AI Provider Selection */}
        <div className="pt-4 border-t border-primary-gold/20">
          <h3 className="text-lg font-semibold text-primary-gold mb-4">
            AI Provider Settings
          </h3>
          
          <div className="mb-6">
            <label className="block text-sm font-medium text-text-light mb-3">
              AI Provider for Character & Scene Extraction <span className="text-red-400">*</span>
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div
                onClick={() => updateConfig({ aiProvider: 'ollama' })}
                className={`p-4 rounded-lg border cursor-pointer transition-all ${
                  config.aiProvider === 'ollama'
                    ? 'border-primary-gold bg-primary-gold/10 text-text-light'
                    : 'border-primary-gold/30 bg-primary-navy/20 text-text-muted hover:border-primary-gold/60 hover:bg-primary-navy/30'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">Ollama (Local)</span>
                  {config.aiProvider === 'ollama' && (
                    <span className="text-primary-gold">✓</span>
                  )}
                </div>
                <p className="text-xs opacity-80">Run AI models locally on your machine. Private and free.</p>
                <div className="mt-2">
                  <span className={`text-xs px-2 py-1 rounded ${
                    modelStatus?.ollama.available 
                      ? 'bg-green-500/20 text-green-400' 
                      : 'bg-red-500/20 text-red-400'
                  }`}>
                    {modelStatus?.ollama.available ? 'Available' : 'Not Available'}
                  </span>
                </div>
              </div>
              
              <div
                onClick={() => updateConfig({ aiProvider: 'openai' })}
                className={`p-4 rounded-lg border cursor-pointer transition-all ${
                  config.aiProvider === 'openai'
                    ? 'border-primary-gold bg-primary-gold/10 text-text-light'
                    : 'border-primary-gold/30 bg-primary-navy/20 text-text-muted hover:border-primary-gold/60 hover:bg-primary-navy/30'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">OpenAI (ChatGPT)</span>
                  {config.aiProvider === 'openai' && (
                    <span className="text-primary-gold">✓</span>
                  )}
                </div>
                <p className="text-xs opacity-80">Use OpenAI's ChatGPT models. Higher quality results.</p>
                <div className="mt-2">
                  <span className={`text-xs px-2 py-1 rounded ${
                    modelStatus?.openai.available 
                      ? 'bg-green-500/20 text-green-400' 
                      : 'bg-red-500/20 text-red-400'
                  }`}>
                    {modelStatus?.openai.available ? 'Available' : 'Not Available'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Style Configuration - Required Settings */}
        <div className="pt-4 border-t border-primary-gold/20">
          <h3 className="text-lg font-semibold text-primary-gold mb-4">
            Visual Style Settings
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Art Style */}
            <div>
              <label className="block text-sm font-medium text-text-light mb-3">
                Art Style <span className="text-red-400">*</span>
              </label>
              <div className="space-y-2">
                {ART_STYLES.map((style) => (
                  <div
                    key={style.value}
                    onClick={() => updateConfig({ artStyle: style.value })}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      config.artStyle === style.value
                        ? 'border-primary-gold bg-primary-gold/10 text-text-light'
                        : 'border-primary-gold/30 bg-primary-navy/20 text-text-muted hover:border-primary-gold/60 hover:bg-primary-navy/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{style.label}</span>
                      {config.artStyle === style.value && (
                        <span className="text-primary-gold">✓</span>
                      )}
                    </div>
                    <p className="text-xs mt-1 opacity-80">{style.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Genre */}
            <div>
              <label className="block text-sm font-medium text-text-light mb-3">
                Genre <span className="text-red-400">*</span>
              </label>
              <div className="space-y-2">
                {GENRES.map((genre) => (
                  <div
                    key={genre.value}
                    onClick={() => updateConfig({ genre: genre.value })}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      config.genre === genre.value
                        ? 'border-primary-gold bg-primary-gold/10 text-text-light'
                        : 'border-primary-gold/30 bg-primary-navy/20 text-text-muted hover:border-primary-gold/60 hover:bg-primary-navy/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{genre.label}</span>
                      {config.genre === genre.value && (
                        <span className="text-primary-gold">✓</span>
                      )}
                    </div>
                    <p className="text-xs mt-1 opacity-80">{genre.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <div className="mt-4 bg-primary-gold/10 border border-primary-gold/30 rounded-lg p-3">
            <div className="flex items-start space-x-2">
              <span className="text-primary-gold text-sm">✨</span>
              <div>
                <p className="text-sm text-text-light font-medium">
                  Current Style: {ART_STYLES.find(s => s.value === config.artStyle)?.label} + {GENRES.find(g => g.value === config.genre)?.label}
                </p>
                <p className="text-xs text-text-muted mt-1">
                  This combination will influence all generated character portraits and scene images
                </p>
              </div>
            </div>
          </div>
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
          {!loadingModels && (typeof window !== 'undefined' && localStorage.getItem(STORAGE_KEY)) && (
            <div className="text-xs text-primary-gold">
              ✓ Loaded saved preferences
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