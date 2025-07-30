'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';

export interface Character {
  id?: string;
  name: string;
  description: string;
  personality: string;
  imagePrompt?: string;
  image?: {
    url: string;
    id: string;
    createdAt: string;
  };
  importance?: number;
  mentions?: number;
  relationships?: string[];
  firstMention?: {
    chapter: number;
    position: number;
  };
}

interface CharacterViewerProps {
  characters: Character[];
  loading?: boolean;
  onCharacterSelect?: (character: Character) => void;
  onGenerateImage?: (character: Character) => void;
  onRegenerateImage?: (character: Character) => void;
  showActions?: boolean;
  showDetails?: boolean;
}

export default function CharacterViewer({
  characters,
  loading = false,
  onCharacterSelect,
  onGenerateImage,
  onRegenerateImage,
  showActions = true,
  showDetails = true,
}: CharacterViewerProps) {
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [sortBy, setSortBy] = useState<'importance' | 'name' | 'mentions'>('importance');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const sortedCharacters = [...characters].sort((a, b) => {
    switch (sortBy) {
      case 'importance':
        return (b.importance || 0) - (a.importance || 0);
      case 'name':
        return a.name.localeCompare(b.name);
      case 'mentions':
        return (b.mentions || 0) - (a.mentions || 0);
      default:
        return 0;
    }
  });

  const handleCharacterClick = useCallback((character: Character) => {
    if (onCharacterSelect) {
      onCharacterSelect(character);
    } else {
      setSelectedCharacter(character);
    }
  }, [onCharacterSelect]);

  const closeDetails = useCallback(() => {
    setSelectedCharacter(null);
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="animate-pulse bg-primary-navy/20 rounded-xl p-6">
              <div className="flex items-center space-x-4 mb-4">
                <div className="bg-primary-navy/30 w-16 h-16 rounded-full"></div>
                <div className="flex-1">
                  <div className="bg-primary-navy/30 h-4 rounded mb-2"></div>
                  <div className="bg-primary-navy/30 h-3 rounded w-3/4"></div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="bg-primary-navy/30 h-3 rounded"></div>
                <div className="bg-primary-navy/30 h-3 rounded w-5/6"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (characters.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">👥</div>
        <h3 className="text-xl font-serif font-semibold text-primary-gold mb-2">
          No Characters Yet
        </h3>
        <p className="text-text-muted">
          Extract characters from your EPUB to see them here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-text-light">Sort by:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'importance' | 'name' | 'mentions')}
              className="bg-primary-navy border border-primary-gold/30 rounded px-3 py-1 text-sm text-text-light focus:border-primary-gold focus:outline-none"
            >
              <option value="importance">Importance</option>
              <option value="name">Name</option>
              <option value="mentions">Mentions</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-text-light">View:</label>
            <div className="flex bg-primary-navy/50 rounded overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-1 text-sm ${
                  viewMode === 'grid'
                    ? 'bg-primary-gold text-primary-navy'
                    : 'text-text-light hover:bg-primary-navy/70'
                }`}
              >
                Grid
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1 text-sm ${
                  viewMode === 'list'
                    ? 'bg-primary-gold text-primary-navy'
                    : 'text-text-light hover:bg-primary-navy/70'
                }`}
              >
                List
              </button>
            </div>
          </div>
        </div>

        <div className="text-sm text-text-muted">
          {characters.length} character{characters.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Characters Grid/List */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedCharacters.map((character, index) => (
            <CharacterCard
              key={character.id || index}
              character={character}
              onClick={() => handleCharacterClick(character)}
              onGenerateImage={onGenerateImage}
              onRegenerateImage={onRegenerateImage}
              showActions={showActions}
              showDetails={showDetails}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {sortedCharacters.map((character, index) => (
            <CharacterListItem
              key={character.id || index}
              character={character}
              onClick={() => handleCharacterClick(character)}
              onGenerateImage={onGenerateImage}
              onRegenerateImage={onRegenerateImage}
              showActions={showActions}
              showDetails={showDetails}
            />
          ))}
        </div>
      )}

      {/* Character Details Modal */}
      {selectedCharacter && (
        <CharacterDetailsModal
          character={selectedCharacter}
          onClose={closeDetails}
          onGenerateImage={onGenerateImage}
          onRegenerateImage={onRegenerateImage}
        />
      )}
    </div>
  );
}

interface CharacterCardProps {
  character: Character;
  onClick: () => void;
  onGenerateImage?: (character: Character) => void;
  onRegenerateImage?: (character: Character) => void;
  showActions: boolean;
  showDetails: boolean;
}

function CharacterCard({
  character,
  onClick,
  onGenerateImage,
  onRegenerateImage,
  showActions,
  showDetails,
}: CharacterCardProps) {
  return (
    <div
      className="bg-primary-navy/20 rounded-xl p-6 hover:bg-primary-navy/30 transition-colors cursor-pointer group"
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-center space-x-4 mb-4">
        {/* Avatar */}
        <div className="relative w-16 h-16 rounded-full overflow-hidden bg-primary-navy/50 flex-shrink-0">
          {character.image ? (
            <Image
              src={character.image.url}
              alt={character.name}
              fill
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-2xl">
              👤
            </div>
          )}
        </div>

        {/* Name and Stats */}
        <div className="flex-1 min-w-0">
          <h3 className="font-serif font-semibold text-text-light text-lg mb-1 truncate">
            {character.name}
          </h3>
          {showDetails && (
            <div className="flex items-center space-x-3 text-xs text-text-muted">
              {character.importance !== undefined && (
                <span>
                  Importance: {Math.round(character.importance * 100)}%
                </span>
              )}
              {character.mentions !== undefined && (
                <span>{character.mentions} mentions</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Description */}
      <p className="text-text-muted text-sm mb-3 line-clamp-3">
        {character.description}
      </p>

      {/* Personality */}
      {showDetails && character.personality && (
        <p className="text-text-light text-sm mb-4 line-clamp-2">
          <span className="text-primary-gold">Personality:</span> {character.personality}
        </p>
      )}

      {/* Relationships */}
      {showDetails && character.relationships && character.relationships.length > 0 && (
        <div className="mb-4">
          <p className="text-primary-gold text-xs mb-1">Relationships:</p>
          <div className="flex flex-wrap gap-1">
            {character.relationships.slice(0, 3).map(rel => (
              <span
                key={rel}
                className="px-2 py-1 bg-primary-navy/50 text-text-light text-xs rounded"
              >
                {rel}
              </span>
            ))}
            {character.relationships.length > 3 && (
              <span className="px-2 py-1 bg-primary-navy/50 text-text-muted text-xs rounded">
                +{character.relationships.length - 3}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      {showActions && (
        <div className="flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="text-xs text-text-muted">
            {character.firstMention && `First: Ch.${character.firstMention.chapter}`}
          </div>
          <div className="flex space-x-2">
            {!character.image && onGenerateImage && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onGenerateImage(character);
                }}
                className="text-primary-gold hover:text-accent-gold transition-colors text-sm"
                title="Generate Image"
              >
                🎨
              </button>
            )}
            {character.image && onRegenerateImage && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRegenerateImage(character);
                }}
                className="text-primary-gold hover:text-accent-gold transition-colors text-sm"
                title="Regenerate Image"
              >
                🔄
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface CharacterListItemProps {
  character: Character;
  onClick: () => void;
  onGenerateImage?: (character: Character) => void;
  onRegenerateImage?: (character: Character) => void;
  showActions: boolean;
  showDetails: boolean;
}

function CharacterListItem({
  character,
  onClick,
  onGenerateImage,
  onRegenerateImage,
  showActions,
  showDetails,
}: CharacterListItemProps) {
  return (
    <div
      className="bg-primary-navy/20 rounded-xl p-4 hover:bg-primary-navy/30 transition-colors cursor-pointer group flex items-center space-x-4"
      onClick={onClick}
    >
      {/* Avatar */}
      <div className="relative w-12 h-12 rounded-full overflow-hidden bg-primary-navy/50 flex-shrink-0">
        {character.image ? (
          <Image
            src={character.image.url}
            alt={character.name}
            fill
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">👤</div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-serif font-semibold text-text-light truncate">
            {character.name}
          </h3>
          {showDetails && (
            <div className="flex items-center space-x-3 text-xs text-text-muted">
              {character.importance !== undefined && (
                <span>{Math.round(character.importance * 100)}%</span>
              )}
              {character.mentions !== undefined && (
                <span>{character.mentions}x</span>
              )}
            </div>
          )}
        </div>
        <p className="text-text-muted text-sm line-clamp-1">
          {character.description}
        </p>
      </div>

      {/* Actions */}
      {showActions && (
        <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {!character.image && onGenerateImage && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onGenerateImage(character);
              }}
              className="text-primary-gold hover:text-accent-gold transition-colors"
              title="Generate Image"
            >
              🎨
            </button>
          )}
          {character.image && onRegenerateImage && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRegenerateImage(character);
              }}
              className="text-primary-gold hover:text-accent-gold transition-colors"
              title="Regenerate Image"
            >
              🔄
            </button>
          )}
        </div>
      )}
    </div>
  );
}

interface CharacterDetailsModalProps {
  character: Character;
  onClose: () => void;
  onGenerateImage?: (character: Character) => void;
  onRegenerateImage?: (character: Character) => void;
}

function CharacterDetailsModal({
  character,
  onClose,
  onGenerateImage,
  onRegenerateImage,
}: CharacterDetailsModalProps) {
  return (
    <div
      className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-primary-navy rounded-xl max-w-2xl w-full max-h-[90vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-primary-gold/20">
          <h2 className="text-2xl font-serif font-bold text-primary-gold">
            {character.name}
          </h2>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-light transition-colors text-xl"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Image */}
          <div className="flex justify-center">
            <div className="relative w-48 h-48 rounded-lg overflow-hidden bg-primary-navy/50">
              {character.image ? (
                <Image
                  src={character.image.url}
                  alt={character.name}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-6xl">
                  👤
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-center space-x-4">
            {!character.image && onGenerateImage && (
              <button
                onClick={() => onGenerateImage(character)}
                className="bg-primary-gold hover:bg-accent-gold text-primary-navy font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                Generate Portrait
              </button>
            )}
            {character.image && onRegenerateImage && (
              <button
                onClick={() => onRegenerateImage(character)}
                className="bg-primary-gold hover:bg-accent-gold text-primary-navy font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                Regenerate Portrait
              </button>
            )}
          </div>

          {/* Details */}
          <div className="space-y-4">
            <div>
              <h3 className="text-primary-gold font-semibold mb-2">Description</h3>
              <p className="text-text-light">{character.description}</p>
            </div>

            <div>
              <h3 className="text-primary-gold font-semibold mb-2">Personality</h3>
              <p className="text-text-light">{character.personality}</p>
            </div>

            {character.relationships && character.relationships.length > 0 && (
              <div>
                <h3 className="text-primary-gold font-semibold mb-2">Relationships</h3>
                <div className="flex flex-wrap gap-2">
                  {character.relationships.map(rel => (
                    <span
                      key={rel}
                      className="px-3 py-1 bg-primary-navy/50 text-text-light rounded"
                    >
                      {rel}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {character.imagePrompt && (
              <div>
                <h3 className="text-primary-gold font-semibold mb-2">Image Prompt</h3>
                <p className="text-text-muted text-sm bg-black/20 p-3 rounded">
                  {character.imagePrompt}
                </p>
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-primary-gold/20">
              {character.importance !== undefined && (
                <div>
                  <span className="text-primary-gold text-sm">Importance</span>
                  <div className="text-text-light font-semibold">
                    {Math.round(character.importance * 100)}%
                  </div>
                </div>
              )}
              {character.mentions !== undefined && (
                <div>
                  <span className="text-primary-gold text-sm">Mentions</span>
                  <div className="text-text-light font-semibold">
                    {character.mentions}
                  </div>
                </div>
              )}
              {character.firstMention && (
                <div className="col-span-2">
                  <span className="text-primary-gold text-sm">First Mentioned</span>
                  <div className="text-text-light font-semibold">
                    Chapter {character.firstMention.chapter}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}