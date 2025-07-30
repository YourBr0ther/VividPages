import { OllamaClient, Character } from '../ollama-client';

export interface ExtractedCharacter extends Character {
  importance: number; // 0-1 scale
  firstMention: {
    chapter: number;
    position: number;
  };
  mentions: number;
  relationships: string[];
}

export interface CharacterExtractionOptions {
  maxCharacters?: number;
  minMentions?: number;
  sensitivity?: number; // 0.3-1.0
  includeMinorCharacters?: boolean;
  model?: string;
}

export class CharacterExtractor {
  private ollama: OllamaClient;

  constructor(ollamaHost = 'http://localhost:11434', defaultModel = 'llama2') {
    this.ollama = new OllamaClient(ollamaHost, defaultModel);
  }

  async extractCharacters(
    chapters: Array<{ title: string; content: string; order: number }>,
    options: CharacterExtractionOptions = {}
  ): Promise<ExtractedCharacter[]> {
    const {
      maxCharacters = 10,
      minMentions = 2,
      sensitivity = 0.7,
      includeMinorCharacters = false,
      model
    } = options;

    // Step 1: Extract characters from all chapters
    const allCharacters: ExtractedCharacter[] = [];
    
    for (const chapter of chapters) {
      const chapterCharacters = await this.extractFromChapter(chapter, model);
      
      // Merge with existing characters or add new ones
      for (const newChar of chapterCharacters) {
        const existingIndex = allCharacters.findIndex(
          char => this.isSameCharacter(char.name, newChar.name)
        );

        if (existingIndex >= 0) {
          // Update existing character
          allCharacters[existingIndex] = this.mergeCharacters(
            allCharacters[existingIndex],
            newChar,
            chapter.order
          );
        } else {
          // Add new character
          allCharacters.push({
            ...newChar,
            firstMention: {
              chapter: chapter.order,
              position: 0,
            },
            mentions: 1,
            relationships: [],
            importance: this.calculateImportance(newChar, chapter.content),
          });
        }
      }
    }

    // Step 2: Analyze character relationships
    const charactersWithRelationships = await this.analyzeRelationships(
      allCharacters,
      chapters,
      model
    );

    // Step 3: Calculate final importance scores
    const scoredCharacters = this.calculateFinalScores(
      charactersWithRelationships,
      chapters.length
    );

    // Step 4: Filter and rank characters
    let filteredCharacters = scoredCharacters.filter(char => {
      if (!includeMinorCharacters && char.mentions < minMentions) {
        return false;
      }
      return char.importance >= (1 - sensitivity);
    });

    // Sort by importance and limit
    filteredCharacters = filteredCharacters
      .sort((a, b) => b.importance - a.importance)
      .slice(0, maxCharacters);

    return filteredCharacters;
  }

  private async extractFromChapter(
    chapter: { title: string; content: string; order: number },
    model?: string
  ): Promise<Character[]> {
    const prompt = `
Analyze this chapter and extract all mentioned characters. Focus on named characters with speaking roles or significant presence.

For each character, provide:
1. Name (first name or most commonly used name)
2. Physical description (age, appearance, notable features)
3. Personality traits (behavior, motivations, characteristics)
4. A detailed image prompt for AI generation

Chapter: "${chapter.title}"
Content: ${chapter.content.substring(0, 5000)}...

Return only a JSON array with this exact structure:
[
  {
    "name": "Character Name",
    "description": "Physical description",
    "personality": "Personality traits",
    "imagePrompt": "Detailed AI image prompt"
  }
]
`;

    try {
      const response = await this.ollama.generate(prompt, model, {
        temperature: 0.5,
        num_predict: 1500,
      });

      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        return [];
      }

      const characters = JSON.parse(jsonMatch[0]);
      return characters.filter((char: any) => char.name && char.description);
    } catch (error) {
      console.error(`Error extracting characters from chapter ${chapter.order}:`, error);
      return [];
    }
  }

  private async analyzeRelationships(
    characters: ExtractedCharacter[],
    chapters: Array<{ title: string; content: string; order: number }>,
    model?: string
  ): Promise<ExtractedCharacter[]> {
    if (characters.length < 2) {
      return characters;
    }

    const characterNames = characters.map(c => c.name);
    const combinedText = chapters.map(c => c.content).join('\n\n').substring(0, 15000);

    const prompt = `
Analyze the relationships between these characters based on the text:
Characters: ${characterNames.join(', ')}

Text: ${combinedText}...

For each character, identify their key relationships with other characters.
Return a JSON object with character names as keys and arrays of related character names as values:

{
  "Character1": ["Character2", "Character3"],
  "Character2": ["Character1"],
  ...
}

Only include meaningful relationships (family, friends, enemies, colleagues, etc.).
`;

    try {
      const response = await this.ollama.generate(prompt, model, {
        temperature: 0.4,
        num_predict: 800,
      });

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return characters;
      }

      const relationships = JSON.parse(jsonMatch[0]);

      return characters.map(char => ({
        ...char,
        relationships: relationships[char.name] || [],
      }));
    } catch (error) {
      console.error('Error analyzing relationships:', error);
      return characters;
    }
  }

  private isSameCharacter(name1: string, name2: string): boolean {
    const normalize = (name: string) => name.toLowerCase().trim();
    const n1 = normalize(name1);
    const n2 = normalize(name2);

    // Exact match
    if (n1 === n2) return true;

    // Check if one name contains the other (for nicknames/full names)
    if (n1.includes(n2) || n2.includes(n1)) {
      return Math.abs(n1.length - n2.length) <= 3;
    }

    // Check first name match for longer names
    const parts1 = n1.split(' ');
    const parts2 = n2.split(' ');
    
    return parts1[0] === parts2[0] && (parts1[0].length > 3);
  }

  private mergeCharacters(
    existing: ExtractedCharacter,
    newChar: Character,
    _chapterOrder: number
  ): ExtractedCharacter {
    return {
      ...existing,
      // Use longer description
      description: newChar.description.length > existing.description.length 
        ? newChar.description 
        : existing.description,
      // Merge personality traits
      personality: this.mergeText(existing.personality, newChar.personality),
      // Use more detailed image prompt
      imagePrompt: newChar.imagePrompt.length > existing.imagePrompt.length
        ? newChar.imagePrompt
        : existing.imagePrompt,
      mentions: existing.mentions + 1,
    };
  }

  private mergeText(text1: string, text2: string): string {
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = text2.toLowerCase().split(/\s+/);
    
    // Add new words from text2 that aren't in text1
    const newWords = words2.filter(word => !words1.has(word));
    
    if (newWords.length > 0) {
      return `${text1}, ${newWords.join(' ')}`;
    }
    
    return text1;
  }

  private calculateImportance(character: Character, chapterContent: string): number {
    let score = 0;

    // Name frequency (normalized)
    const nameCount = (chapterContent.match(new RegExp(character.name, 'gi')) || []).length;
    score += Math.min(nameCount / 10, 0.3);

    // Description length indicates detail level
    score += Math.min(character.description.length / 200, 0.2);

    // Personality complexity
    score += Math.min(character.personality.split(',').length / 5, 0.2);

    // Base importance for being mentioned
    score += 0.3;

    return Math.min(score, 1);
  }

  private calculateFinalScores(
    characters: ExtractedCharacter[],
    totalChapters: number
  ): ExtractedCharacter[] {
    return characters.map(char => {
      let score = char.importance;

      // Boost for characters mentioned across multiple chapters
      const chapterSpread = Math.min(char.mentions / totalChapters, 1);
      score += chapterSpread * 0.3;

      // Boost for characters with relationships
      score += Math.min(char.relationships.length / 3, 0.2);

      // Boost for early introduction (main characters often appear early)
      const earlyBoost = char.firstMention.chapter <= 2 ? 0.1 : 0;
      score += earlyBoost;

      return {
        ...char,
        importance: Math.min(score, 1),
      };
    });
  }
}