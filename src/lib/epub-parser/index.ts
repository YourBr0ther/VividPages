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
}

export class EpubParser {
  private book: Book | null;

  constructor() {
    this.book = null;
  }

  async parseFile(file: File): Promise<EpubMetadata> {
    try {
      // Validate file type
      if (!file.name.toLowerCase().endsWith('.epub') && !file.type.includes('epub')) {
        throw new Error('Please select a valid EPUB file');
      }

      // Convert file to ArrayBuffer for better compatibility
      const arrayBuffer = await file.arrayBuffer();
      
      // Initialize the book with ArrayBuffer instead of blob URL
      this.book = ePub(arrayBuffer);
      
      // Wait for the book to be ready with timeout
      await Promise.race([
        this.book.ready,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('EPUB parsing timeout')), 30000)
        )
      ]);

      // Extract metadata
      const metadata = await this.extractMetadata();
      
      // Extract chapters
      const chapters = await this.extractChapters();

      return {
        ...metadata,
        chapters,
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

  private async extractChapters(): Promise<Chapter[]> {
    if (!this.book) {
      throw new Error('No book loaded');
    }
    const chapters: Chapter[] = [];
    const spine = this.book.spine;
    
    for (let i = 0; i < spine.length; i++) {
      const item = spine.get(i);
      
      try {
        // Load the chapter content
        const doc = await item.load(this.book.load.bind(this.book));
        
        // Extract text content
        const textContent = this.extractTextFromDocument(doc);
        
        // Skip very short chapters (likely navigation or empty pages)
        if (textContent.length < 100) {
          continue;
        }

        // Get chapter title (try to find h1, h2, or use first line)
        const title = this.extractChapterTitle(doc, textContent) || `Chapter ${chapters.length + 1}`;

        chapters.push({
          id: item.idref,
          title,
          content: textContent,
          href: item.href,
          order: i,
        });
      } catch (error) {
        console.warn(`Failed to load chapter ${i}:`, error);
        continue;
      }
    }

    return chapters;
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