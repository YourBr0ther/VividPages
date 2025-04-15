import JSZip from 'jszip';

export interface EpubMetadata {
  title: string;
  author: string;
  language: string;
  publisher?: string;
  date?: string;
}

export interface Chapter {
  id: string;
  title: string;
  content: string;
}

export class EpubService {
  private zip: JSZip | null = null;

  async loadEpub(file: File): Promise<void> {
    this.zip = await JSZip.loadAsync(file);
  }

  async getMetadata(): Promise<EpubMetadata> {
    if (!this.zip) {
      throw new Error('No ePUB file loaded');
    }

    const container = await this.zip.file('META-INF/container.xml')?.async('text');
    if (!container) {
      throw new Error('Invalid ePUB file: container.xml not found');
    }

    // Parse container.xml to find the OPF file path
    const opfPath = this.extractOpfPath(container);
    const opfContent = await this.zip.file(opfPath)?.async('text');
    
    if (!opfContent) {
      throw new Error('Invalid ePUB file: OPF file not found');
    }

    return this.parseMetadata(opfContent);
  }

  private extractOpfPath(container: string): string {
    const match = container.match(/<rootfile[^>]*full-path="([^"]*)"[^>]*\/>/);
    if (!match) {
      throw new Error('Invalid ePUB file: OPF path not found in container.xml');
    }
    return match[1];
  }

  private parseMetadata(opfContent: string): EpubMetadata {
    const parser = new DOMParser();
    const doc = parser.parseFromString(opfContent, 'application/xml');
    
    // Find the metadata element with namespace
    const metadata = doc.getElementsByTagNameNS('*', 'metadata')[0];
    
    if (!metadata) {
      throw new Error('Invalid ePUB file: metadata not found in OPF');
    }

    const getTextContent = (localName: string): string | undefined => {
      // Search for the element with any namespace
      const elements = metadata.getElementsByTagNameNS('*', localName);
      const element = elements[0];
      return element?.textContent || undefined;
    };

    return {
      title: getTextContent('title') || 'Unknown Title',
      author: getTextContent('creator') || 'Unknown Author',
      language: getTextContent('language') || 'en',
      publisher: getTextContent('publisher'),
      date: getTextContent('date'),
    };
  }

  async getChapters(): Promise<Chapter[]> {
    if (!this.zip) {
      throw new Error('No ePUB file loaded');
    }

    // TODO: Implement chapter extraction
    // This will require parsing the spine and manifest from the OPF file
    // and then extracting the content from each chapter file
    return [];
  }
} 