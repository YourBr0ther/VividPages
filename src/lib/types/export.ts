export interface ExportedProject {
  version: string;
  exportedAt: string;
  project: {
    id: string;
    name: string;
    createdAt: string;
    metadata: EpubMetadata;
    configuration: ProjectConfiguration;
  };
  images: ExportedImage[];
}

export interface ExportedImage {
  id: string;
  projectId: string;
  type: 'character' | 'scene';
  title: string;
  description: string;
  imageUrl: string;
  prompt?: string;
  chapter?: number;
  scene?: number;
  characterId?: string;
  tags?: string[];
  createdAt: string;
  metadata?: {
    model?: string;
    quality?: string;
    size?: string;
  };
}

export interface PDFExportData {
  project: {
    name: string;
    createdAt: string;
    metadata: EpubMetadata;
  };
  characters: ExportedImage[];
  scenes: ExportedImage[];
  generatedAt: string;
}

export interface EpubMetadata {
  title: string;
  author?: string;
  description?: string;
  publisher?: string;
  language?: string;
  publishedDate?: string;
  isbn?: string;
  coverImage?: string;
}

export interface ProjectConfiguration {
  selectedChapters: number;
  scenesPerChapter: number;
  llmModel: string;
  imageQuality: 'standard' | 'high';
  characterSensitivity: number;
}

export interface Chapter {
  id: string;
  title: string;
  content: string;
  order: number;
}

export interface Scene {
  id: string;
  chapterId: string;
  title: string;
  description: string;
  visualAppeal: number;
  emotionalIntensity: number;
  actionLevel: number;
  uniqueness: number;
  tags: string[];
  setting?: string;
  mood?: string;
  charactersPresent: string[];
}