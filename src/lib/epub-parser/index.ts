import ePub from 'epubjs';
import type { Book } from 'epubjs';

export interface Chapter {
  id: string;
  title: string;
  content: string;
  href: string;
  order: number;
}

export interface EpubMetadata {
  title: string;
  author: string;
  description?: string;
  language?: string;
  identifier?: string;
  chapters: Chapter[];
  processingInfo?: {
    totalSections: number;
    excludedSections: string[];
    chapterCount: number;
  };
}

export class EpubParser {
  private book: Book | null;

  constructor() {
    this.book = null;
  }

  async parseFile(file: File): Promise<EpubMetadata> {
    try {
      console.log(`📖 Starting EPUB parsing for: ${file.name}`);
      console.log(`📏 File size: ${(file.size / 1024 / 1024).toFixed(2)} MB`);
      
      // Validate file type
      if (!file.name.toLowerCase().endsWith('.epub') && !file.type.includes('epub')) {
        throw new Error('Please select a valid EPUB file');
      }

      // Convert file to ArrayBuffer for better compatibility
      const arrayBuffer = await file.arrayBuffer();
      
      // Initialize the book with ArrayBuffer instead of blob URL
      this.book = ePub(arrayBuffer);
      
      console.log(`⏳ Waiting for EPUB to be ready...`);
      // Wait for the book to be ready with timeout
      await Promise.race([
        this.book.ready,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('EPUB parsing timeout')), 30000)
        )
      ]);
      console.log(`✅ EPUB loaded successfully`);

      // Extract metadata
      const metadata = await this.extractMetadata();
      console.log(`📚 Book: "${metadata.title}" by ${metadata.author}`);
      
      // Extract chapters
      console.log(`🔍 Starting chapter extraction...`);
      const { chapters, processingInfo } = await this.extractChapters();
      console.log(`📑 Chapter processing complete: ${chapters.length} chapters found from ${processingInfo.totalSections} sections`);

      return {
        ...metadata,
        chapters,
        processingInfo,
      };
    } catch (error) {
      console.error('Error parsing EPUB:', error);
      throw new Error('Failed to parse EPUB file. Please ensure it\'s a valid EPUB file.');
    }
  }

  private async extractMetadata(): Promise<Omit<EpubMetadata, 'chapters'>> {
    if (!this.book) {
      throw new Error('No book loaded');
    }
    const metadata = this.book.package.metadata;
    
    return {
      title: metadata.title || 'Unknown Title',
      author: metadata.creator || 'Unknown Author',
      description: metadata.description,
      language: metadata.language,
      identifier: metadata.identifier,
    };
  }

  private async extractChapters(): Promise<{ chapters: Chapter[]; processingInfo: { totalSections: number; excludedSections: string[]; chapterCount: number; } }> {
    if (!this.book) {
      throw new Error('No book loaded');
    }
    const allSections: Chapter[] = [];
    const spine = this.book.spine;
    
    console.log(`📋 Found ${spine.length} sections in EPUB spine`);
    
    // First pass: extract all sections
    for (let i = 0; i < spine.length; i++) {
      const item = spine.get(i);
      
      try {
        // Load the section content
        const doc = await item.load(this.book.load.bind(this.book));
        
        // Extract text content
        const textContent = this.extractTextFromDocument(doc);
        
        // Skip very short sections (likely navigation or empty pages)
        // Use character count for initial filtering, word count for final filtering
        if (textContent.length < 300) { // Roughly equivalent to ~50 words
          continue;
        }

        // Get section title
        const title = this.extractChapterTitle(doc, textContent) || `Section ${allSections.length + 1}`;
        const wordCount = textContent.split(/\s+/).length;

        console.log(`📄 Section ${i + 1}/${spine.length}: "${title}" (${wordCount} words)`);

        allSections.push({
          id: item.idref,
          title,
          content: textContent,
          href: item.href,
          order: i,
        });
      } catch (error) {
        console.warn(`⚠️ Failed to load section ${i + 1}/${spine.length}:`, error);
        continue;
      }
    }

    console.log(`✅ Extracted ${allSections.length} valid sections from ${spine.length} total`);
    console.log(`🔍 Now filtering to identify actual chapters...`);
    
    // Second pass: filter to get only actual chapters
    const { chapters, excludedSections } = this.filterChaptersOnly(allSections);
    
    return {
      chapters,
      processingInfo: {
        totalSections: allSections.length,
        excludedSections,
        chapterCount: chapters.length,
      }
    };
  }

  private extractTextFromDocument(doc: Document): string {
    // Remove script and style elements
    const scripts = doc.querySelectorAll('script, style');
    scripts.forEach(script => script.remove());
    
    // Get text content and clean it up
    const textContent = doc.body?.textContent || doc.textContent || '';
    
    // Clean up whitespace and normalize
    return textContent
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n\n')
      .trim();
  }

  private extractChapterTitle(doc: Document, content: string): string | null {
    // Try to find title in heading tags
    const headings = doc.querySelectorAll('h1, h2, h3, h4, h5, h6');
    if (headings.length > 0) {
      const firstHeading = headings[0].textContent?.trim();
      if (firstHeading && firstHeading.length < 100) {
        return firstHeading;
      }
    }

    // Try to extract from first line of content
    const firstLine = content.split('\n')[0]?.trim();
    if (firstLine && firstLine.length < 100) {
      // Check if it looks like a title (not too long, maybe starts with Chapter, etc.)
      if (/^(chapter|ch\.?\s*\d+|part|section)/i.test(firstLine) || firstLine.length < 50) {
        return firstLine;
      }
    }

    return null;
  }

  private filterChaptersOnly(allSections: Chapter[]): { chapters: Chapter[]; excludedSections: string[]; } {
    const chapters: Chapter[] = [];
    const excludedSections: string[] = [];
    
    // Define patterns to exclude non-chapter content
    const excludePatterns = [
      // Common non-chapter titles
      /^(title page?|cover|front\s*matter|back\s*matter)$/i,
      /^(copyright|dedication|acknowledgment|about\s+the\s+author)$/i,
      /^(preface|foreword|introduction|prologue|epilogue)$/i,
      /^(table\s+of\s+contents|contents|toc)$/i,
      /^(bibliography|references|index|glossary|appendix)$/i,
      /^(notes?|endnotes?|footnotes?)$/i,
      /^(credits?|attribution|license)$/i,
      /^(also\s+by|other\s+books?|more\s+from)$/i,
      
      // Publishing/technical content
      /^(isbn|publication|publisher|imprint)$/i,
      /^(version|edition|printing|print)$/i,
      /^(legal|disclaimer|notice)$/i,
      
      // Navigation elements
      /^(start|begin|go\s+to|jump\s+to)$/i,
      /^(next|previous|back|home)$/i,
    ];

    // Define patterns that indicate actual chapters
    const chapterPatterns = [
      /^chapter\s+(\d+|one|two|three|four|five|six|seven|eight|nine|ten|[ivxlc]+)/i,
      /^ch\.?\s*\d+/i,
      /^part\s+(\d+|one|two|three|four|five|[ivxlc]+)/i,
      /^section\s+(\d+|one|two|three|four|five|[ivxlc]+)/i,
      /^\d+\.?\s+/,  // Numbered sections like "1.", "2.", etc.
      /^[ivxlc]+\.?\s*$/i,  // Roman numerals
    ];

    // Analyze content characteristics
    for (const section of allSections) {
      const title = section.title.toLowerCase().trim();
      const content = section.content;
      const wordCount = content.split(/\s+/).length;
      
      // Exclude based on title patterns
      const shouldExclude = excludePatterns.some(pattern => pattern.test(title));
      if (shouldExclude) {
        console.log(`Excluding section: "${section.title}" (matches exclude pattern)`);
        excludedSections.push(`${section.title} (exclude pattern)`);
        continue;
      }
      
      // Check if it looks like a chapter
      const looksLikeChapter = chapterPatterns.some(pattern => pattern.test(title));
      
      // Content-based filtering - stricter word count requirements
      const minWordCount = 100; // Absolute minimum words for any chapter
      const preferredWordCount = 200; // Preferred minimum for substantial content
      
      // Immediately exclude very short sections
      if (wordCount < minWordCount) {
        console.log(`Excluding section: "${section.title}" (only ${wordCount} words, minimum ${minWordCount})`);
        excludedSections.push(`${section.title} (too short: ${wordCount} words)`);
        continue;
      }
      
      const hasSubstantialContent = wordCount >= preferredWordCount;
      
      // Look for narrative content indicators
      const narrativeIndicators = [
        /\b(he|she|they|I|we)\s+(said|walked|looked|felt|thought|saw|heard)/i,
        /\b(the|a|an)\s+\w+\s+(was|were|is|are)/i,
        /\b(suddenly|then|later|meanwhile|after|before|when|while)/i,
        /["'""].+["'""]/,  // Dialogue
      ];
      const hasNarrativeContent = narrativeIndicators.some(pattern => pattern.test(content));
      
      // Check for high density of proper nouns (character names, places)
      const properNounMatches = content.match(/\b[A-Z][a-z]+\b/g) || [];
      const properNounDensity = properNounMatches.length / wordCount;
      const hasCharacterNames = properNounDensity > 0.02; // More than 2% proper nouns
      
      // Scoring system to determine if it's a chapter
      let chapterScore = 0;
      
      if (looksLikeChapter) chapterScore += 3;
      if (hasSubstantialContent) chapterScore += 2;
      if (hasNarrativeContent) chapterScore += 2;
      if (hasCharacterNames) chapterScore += 1;
      if (wordCount > 1000) chapterScore += 1; // Longer content is more likely a chapter
      
      // Additional checks for very short titles that might be chapter markers
      if (title.length < 20 && wordCount > 500) {
        chapterScore += 1;
      }
      
      // Threshold for considering something a chapter
      const chapterThreshold = 3;
      
      if (chapterScore >= chapterThreshold) {
        chapters.push({
          ...section,
          title: section.title || `Chapter ${chapters.length + 1}`,
        });
        console.log(`Including chapter: "${section.title}" (score: ${chapterScore}, words: ${wordCount})`);
      } else {
        console.log(`Excluding section: "${section.title}" (score: ${chapterScore}, words: ${wordCount}) - likely not a chapter`);
        excludedSections.push(`${section.title} (score: ${chapterScore})`);
      }
    }
    
    // Final validation: ensure we have reasonable chapter sequence
    if (chapters.length === 0 && allSections.length > 0) {
      // Fallback: if no chapters detected, include the longest sections
      console.warn('No chapters detected using filters, falling back to longest sections');
      const sortedByLength = allSections
        .sort((a, b) => b.content.length - a.content.length)
        .slice(0, Math.min(10, allSections.length)); // Take up to 10 longest sections
      
      return {
        chapters: sortedByLength.map((section, index) => ({
          ...section,
          title: section.title || `Chapter ${index + 1}`,
        })),
        excludedSections: excludedSections.concat(['Used fallback: selected longest sections']),
      };
    }
    
    return { chapters, excludedSections };
  }

  async getChapterRange(startChapter: number, endChapter: number): Promise<Chapter[]> {
    if (!this.book) {
      throw new Error('No book loaded. Please parse an EPUB file first.');
    }

    const allChapters = await this.extractChapters();
    return allChapters.slice(startChapter, endChapter + 1);
  }

  destroy() {
    if (this.book) {
      this.book.destroy();
      this.book = null;
    }
  }
}