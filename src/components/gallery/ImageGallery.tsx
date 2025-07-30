'use client';

import { useState, useCallback, useEffect } from 'react';
import Image from 'next/image';
import ExportControls from '@/components/export/ExportControls';
import ShareModal from '@/components/sharing/ShareModal';

export interface GalleryImage {
  id: string;
  url: string;
  title: string;
  description: string;
  prompt?: string;
  chapter?: number;
  scene?: number;
  tags?: string[];
  createdAt: string;
  metadata?: {
    model?: string;
    quality?: string;
    size?: string;
  };
}

interface ImageGalleryProps {
  images: GalleryImage[];
  projectId?: string;
  loading?: boolean;
  onImageClick?: (image: GalleryImage) => void;
  onImageRegenerate?: (image: GalleryImage) => void;
  onImageDelete?: (imageId: string) => void;
  showFilters?: boolean;
  showActions?: boolean;
  showExport?: boolean;
}

export default function ImageGallery({
  images,
  projectId,
  loading = false,
  onImageClick,
  onImageRegenerate,
  onImageDelete,
  showFilters = true,
  showActions = true,
  showExport = true,
}: ImageGalleryProps) {
  const [filteredImages, setFilteredImages] = useState<GalleryImage[]>(images);
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'chapter'>('newest');
  const [lightboxImage, setLightboxImage] = useState<GalleryImage | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [shareImage, setShareImage] = useState<GalleryImage | null>(null);

  // Get unique chapters and tags from images
  const availableChapters = Array.from(
    new Set(images.map(img => img.chapter).filter(Boolean))
  ).sort();

  const availableTags = Array.from(
    new Set(images.flatMap(img => img.tags || []))
  ).sort();

  // Filter and sort images
  useEffect(() => {
    let filtered = [...images];

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(img =>
        img.title.toLowerCase().includes(query) ||
        img.description.toLowerCase().includes(query) ||
        img.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Filter by chapter
    if (selectedChapter !== null) {
      filtered = filtered.filter(img => img.chapter === selectedChapter);
    }

    // Filter by tags
    if (selectedTags.length > 0) {
      filtered = filtered.filter(img =>
        selectedTags.some(tag => img.tags?.includes(tag))
      );
    }

    // Sort images
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'chapter':
          return (a.chapter || 0) - (b.chapter || 0);
        default:
          return 0;
      }
    });

    setFilteredImages(filtered);
  }, [images, selectedChapter, selectedTags, sortBy, searchQuery]);

  const handleImageClick = useCallback((image: GalleryImage) => {
    if (onImageClick) {
      onImageClick(image);
    } else {
      setLightboxImage(image);
    }
  }, [onImageClick]);

  const closeLightbox = useCallback(() => {
    setLightboxImage(null);
  }, []);

  const toggleTag = useCallback((tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  }, []);

  const toggleImageSelection = useCallback((imageId: string) => {
    setSelectedImages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(imageId)) {
        newSet.delete(imageId);
      } else {
        newSet.add(imageId);
      }
      return newSet;
    });
  }, []);

  const selectAllImages = useCallback(() => {
    setSelectedImages(new Set(filteredImages.map(img => img.id)));
  }, [filteredImages]);

  const clearSelection = useCallback(() => {
    setSelectedImages(new Set());
    setSelectionMode(false);
  }, []);

  const handleBatchDelete = useCallback(async () => {
    if (selectedImages.size === 0 || !onImageDelete) return;
    
    if (confirm(`Delete ${selectedImages.size} selected images?`)) {
      for (const imageId of selectedImages) {
        await onImageDelete(imageId);
      }
      clearSelection();
    }
  }, [selectedImages, onImageDelete, clearSelection]);

  const handleBatchRegenerate = useCallback(async () => {
    if (selectedImages.size === 0 || !onImageRegenerate) return;
    
    if (confirm(`Regenerate ${selectedImages.size} selected images?`)) {
      const imagesToRegenerate = images.filter(img => selectedImages.has(img.id));
      for (const image of imagesToRegenerate) {
        await onImageRegenerate(image);
      }
      clearSelection();
    }
  }, [selectedImages, images, onImageRegenerate, clearSelection]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-primary-navy/30 aspect-square rounded-lg mb-3"></div>
              <div className="bg-primary-navy/20 h-4 rounded mb-2"></div>
              <div className="bg-primary-navy/20 h-3 rounded w-3/4"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">🎨</div>
        <h3 className="text-xl font-serif font-semibold text-primary-gold mb-2">
          No Images Yet
        </h3>
        <p className="text-text-muted">
          Generate some images to see them in the gallery
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Batch Controls */}
      <div className="bg-primary-navy/30 rounded-xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search Bar */}
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search images by title, description, or tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-primary-navy border border-primary-gold/30 rounded-lg px-4 py-2 text-text-light placeholder:text-text-muted focus:border-primary-gold focus:outline-none"
            />
          </div>
          
          {/* Selection Mode Toggle */}
          <button
            onClick={() => setSelectionMode(!selectionMode)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              selectionMode 
                ? 'bg-primary-gold text-primary-navy' 
                : 'border border-primary-gold/30 text-text-light hover:border-primary-gold/60'
            }`}
          >
            {selectionMode ? 'Exit Selection' : 'Select Images'}
          </button>
        </div>

        {/* Batch Operations */}
        {selectionMode && (
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-text-muted">
              {selectedImages.size} of {filteredImages.length} selected
            </span>
            <button
              onClick={selectAllImages}
              className="text-sm text-primary-gold hover:text-accent-gold"
            >
              Select All
            </button>
            <button
              onClick={clearSelection}
              className="text-sm text-primary-gold hover:text-accent-gold"
            >
              Clear Selection
            </button>
            {selectedImages.size > 0 && (
              <>
                {onImageDelete && (
                  <button
                    onClick={handleBatchDelete}
                    className="px-3 py-1 bg-red-900/20 border border-red-500/30 text-red-400 rounded hover:bg-red-900/30"
                  >
                    Delete Selected
                  </button>
                )}
                {onImageRegenerate && (
                  <button
                    onClick={handleBatchRegenerate}
                    className="px-3 py-1 bg-primary-gold/20 border border-primary-gold/30 text-primary-gold rounded hover:bg-primary-gold/30"
                  >
                    Regenerate Selected
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-primary-navy/30 rounded-xl p-6 space-y-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* Chapter Filter */}
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-text-light">Chapter:</label>
              <select
                value={selectedChapter || ''}
                onChange={(e) => setSelectedChapter(e.target.value ? Number(e.target.value) : null)}
                className="bg-primary-navy border border-primary-gold/30 rounded px-3 py-1 text-sm text-text-light focus:border-primary-gold focus:outline-none"
              >
                <option value="">All Chapters</option>
                {availableChapters.map(chapter => (
                  <option key={chapter} value={chapter}>
                    Chapter {chapter}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort */}
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-text-light">Sort:</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest' | 'chapter')}
                className="bg-primary-navy border border-primary-gold/30 rounded px-3 py-1 text-sm text-text-light focus:border-primary-gold focus:outline-none"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="chapter">By Chapter</option>
              </select>
            </div>
          </div>

          {/* Tag Filters */}
          {availableTags.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-light">Tags:</label>
              <div className="flex flex-wrap gap-2">
                {availableTags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      selectedTags.includes(tag)
                        ? 'bg-primary-gold text-primary-navy'
                        : 'bg-primary-navy border border-primary-gold/30 text-text-light hover:border-primary-gold/60'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="text-xs text-text-muted">
            Showing {filteredImages.length} of {images.length} images
          </div>
        </div>
      )}

      {/* Export Controls */}
      {showExport && projectId && (
        <ExportControls
          projectId={projectId}
          selectedImageIds={selectedImages.size > 0 ? Array.from(selectedImages) : undefined}
          totalImages={images.length}
          onExportComplete={() => {
            clearSelection();
          }}
        />
      )}

      {/* Gallery Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredImages.map((image) => (
          <div
            key={image.id}
            className="bg-primary-navy/20 rounded-xl overflow-hidden hover:bg-primary-navy/30 transition-colors group relative gallery-item"
          >
            {/* Selection Checkbox */}
            {selectionMode && (
              <div className="absolute top-3 left-3 z-10">
                <input
                  type="checkbox"
                  checked={selectedImages.has(image.id)}
                  onChange={() => toggleImageSelection(image.id)}
                  className="w-5 h-5 text-primary-gold bg-primary-navy border-primary-gold/30 rounded focus:ring-primary-gold focus:ring-2 cursor-pointer"
                />
              </div>
            )}

            {/* Image */}
            <div
              className="relative aspect-square cursor-pointer overflow-hidden"
              onClick={() => !selectionMode && handleImageClick(image)}
            >
              <Image
                src={image.url}
                alt={image.title}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-300"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
              
              {/* Overlay Info */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <h4 className="text-white font-semibold text-sm mb-1">{image.title}</h4>
                {image.chapter && (
                  <p className="text-white/80 text-xs">
                    Chapter {image.chapter} {image.scene && `• Scene ${image.scene}`}
                  </p>
                )}
              </div>
            </div>

            {/* Content */}
            <div className="p-4">
              <h3 className="font-serif font-semibold text-text-light mb-2 line-clamp-1">
                {image.title}
              </h3>
              <p className="text-text-muted text-sm mb-3 line-clamp-2">
                {image.description}
              </p>

              {/* Tags */}
              {image.tags && image.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {image.tags.slice(0, 3).map(tag => (
                    <span
                      key={tag}
                      className="px-2 py-1 bg-primary-navy/50 text-primary-gold text-xs rounded"
                    >
                      {tag}
                    </span>
                  ))}
                  {image.tags.length > 3 && (
                    <span className="px-2 py-1 bg-primary-navy/50 text-text-muted text-xs rounded">
                      +{image.tags.length - 3} more
                    </span>
                  )}
                </div>
              )}

              {/* Actions */}
              {showActions && (
                <div className="flex items-center justify-between">
                  <div className="text-xs text-text-muted">
                    {new Date(image.createdAt).toLocaleDateString()}
                  </div>
                  <div className="flex space-x-2">
                    {onImageRegenerate && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onImageRegenerate(image);
                        }}
                        className="text-primary-gold hover:text-accent-gold transition-colors text-sm"
                        title="Regenerate"
                      >
                        🔄
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShareImage(image);
                      }}
                      className="text-primary-gold hover:text-accent-gold transition-colors text-sm"
                      title="Share"
                    >
                      🔗
                    </button>
                    {onImageDelete && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onImageDelete(image.id);
                        }}
                        className="text-red-400 hover:text-red-300 transition-colors text-sm"
                        title="Delete"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox */}
      {lightboxImage && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={closeLightbox}
        >
          <div className="max-w-4xl max-h-full overflow-auto">
            <div className="relative">
              <Image
                src={lightboxImage.url}
                alt={lightboxImage.title}
                width={800}
                height={800}
                className="max-w-full h-auto"
              />
              <button
                onClick={closeLightbox}
                className="absolute top-4 right-4 text-white bg-black/50 rounded-full w-8 h-8 flex items-center justify-center hover:bg-black/70 transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="bg-primary-navy/90 p-4 rounded-b-lg">
              <h3 className="text-xl font-serif font-semibold text-primary-gold mb-2">
                {lightboxImage.title}
              </h3>
              <p className="text-text-light mb-3">{lightboxImage.description}</p>
              {lightboxImage.prompt && (
                <details className="mb-3">
                  <summary className="text-primary-gold cursor-pointer">
                    View Prompt
                  </summary>
                  <p className="text-text-muted text-sm mt-2 bg-black/20 p-3 rounded">
                    {lightboxImage.prompt}
                  </p>
                </details>
              )}
              {lightboxImage.metadata && (
                <div className="text-xs text-text-muted">
                  {lightboxImage.metadata.model && `Model: ${lightboxImage.metadata.model}`}
                  {lightboxImage.metadata.quality && ` • Quality: ${lightboxImage.metadata.quality}`}
                  {lightboxImage.metadata.size && ` • Size: ${lightboxImage.metadata.size}`}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {shareImage && (
        <ShareModal
          image={shareImage}
          isOpen={true}
          onClose={() => setShareImage(null)}
        />
      )}
    </div>
  );
}