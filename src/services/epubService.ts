import JSZip from 'jszip';

export interface EpubMetadata {
  title: string;
  author: string;
  language: string;
  publisher?: string;
  date?: string;
}

export interface TocItem {
  id: string;
  label: string;
  href: string;
  level: number;
  children: TocItem[];
}

export interface CharacterDescription {
  text: string;
  type: 'physical' | 'personality' | 'background' | 'other';
  character?: string;
  location: {
    chapterId: string;
    paragraphIndex: number;
  };
}

export interface Chapter {
  id: string;
  title: string;
  content: string;
  sections: {
    id: string;
    title: string;
    content: string;
  }[];
  characterDescriptions: CharacterDescription[];
}

export class EpubService {
  private zip: JSZip | null = null;
  private opfPath: string | null = null;
  private toc: TocItem[] = [];

  async loadEpub(file: File): Promise<void> {
    this.zip = await JSZip.loadAsync(file);
    
    // Get and store OPF path on load for reuse
    const container = await this.zip.file('META-INF/container.xml')?.async('text');
    if (!container) {
      throw new Error('Invalid ePUB file: container.xml not found');
    }
    this.opfPath = this.extractOpfPath(container);
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

  async getTableOfContents(): Promise<TocItem[]> {
    if (!this.zip || !this.opfPath) {
      throw new Error('No ePUB file loaded');
    }

    const opfContent = await this.zip.file(this.opfPath)?.async('text');
    if (!opfContent) {
      throw new Error('Invalid ePUB file: OPF file not found');
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(opfContent, 'application/xml');

    // Try to find NCX file first (ePUB 2.0)
    const ncxId = doc.querySelector('spine')?.getAttribute('toc');
    if (ncxId) {
      const ncxHref = doc.querySelector(`manifest item[id="${ncxId}"]`)?.getAttribute('href');
      if (ncxHref) {
        const ncxPath = this.resolveChapterPath(ncxHref);
        const ncxContent = await this.zip.file(ncxPath)?.async('text');
        if (ncxContent) {
          this.toc = this.parseNcxToc(ncxContent);
          return this.toc;
        }
      }
    }

    // Try to find navigation document (ePUB 3.0)
    const navItem = doc.querySelector('manifest item[properties~="nav"]');
    if (navItem) {
      const navHref = navItem.getAttribute('href');
      if (navHref) {
        const navPath = this.resolveChapterPath(navHref);
        const navContent = await this.zip.file(navPath)?.async('text');
        if (navContent) {
          this.toc = this.parseNavToc(navContent);
          return this.toc;
        }
      }
    }

    // Fallback: create TOC from spine
    return this.createTocFromSpine(doc);
  }

  private parseNcxToc(ncxContent: string): TocItem[] {
    const parser = new DOMParser();
    const doc = parser.parseFromString(ncxContent, 'application/xml');
    const navMap = doc.querySelector('navMap');
    if (!navMap) return [];

    const parseNavPoint = (navPoint: Element, level = 0): TocItem => {
      const id = navPoint.getAttribute('id') || '';
      const label = navPoint.querySelector('text')?.textContent || '';
      const href = navPoint.querySelector('content')?.getAttribute('src') || '';
      const children: TocItem[] = [];

      const childNavPoints = navPoint.querySelectorAll(':scope > navPoint');
      childNavPoints.forEach(childNavPoint => {
        children.push(parseNavPoint(childNavPoint, level + 1));
      });

      return { id, label, href, level, children };
    };

    const items: TocItem[] = [];
    const navPoints = navMap.querySelectorAll(':scope > navPoint');
    navPoints.forEach(navPoint => {
      items.push(parseNavPoint(navPoint));
    });

    return items;
  }

  private parseNavToc(navContent: string): TocItem[] {
    const parser = new DOMParser();
    const doc = parser.parseFromString(navContent, 'text/html');
    const nav = doc.querySelector('nav[epub\\:type="toc"], nav[*|type="toc"]');
    if (!nav) return [];

    const parseList = (list: Element, level = 0): TocItem[] => {
      const items: TocItem[] = [];
      const listItems = list.children;

      for (let i = 0; i < listItems.length; i++) {
        const item = listItems[i];
        const link = item.querySelector('a');
        if (!link) continue;

        const id = link.getAttribute('id') || `nav_${level}_${i}`;
        const label = link.textContent || '';
        const href = link.getAttribute('href') || '';
        const children: TocItem[] = [];

        const nestedList = item.querySelector('ol, ul');
        if (nestedList) {
          children.push(...parseList(nestedList, level + 1));
        }

        items.push({ id, label, href, level, children });
      }

      return items;
    };

    const list = nav.querySelector('ol, ul');
    return list ? parseList(list) : [];
  }

  private createTocFromSpine(doc: Document): TocItem[] {
    const items: TocItem[] = [];
    const spineItems = doc.getElementsByTagNameNS('*', 'itemref');
    
    for (let i = 0; i < spineItems.length; i++) {
      const idref = spineItems[i].getAttribute('idref');
      if (!idref) continue;

      items.push({
        id: idref,
        label: `Chapter ${i + 1}`,
        href: `#${idref}`,
        level: 0,
        children: []
      });
    }

    return items;
  }

  async getChapters(): Promise<Chapter[]> {
    if (!this.zip || !this.opfPath) {
      throw new Error('No ePUB file loaded');
    }

    // Get TOC first if not already loaded
    if (this.toc.length === 0) {
      await this.getTableOfContents();
    }

    const opfContent = await this.zip.file(this.opfPath)?.async('text');
    if (!opfContent) {
      throw new Error('Invalid ePUB file: OPF file not found');
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(opfContent, 'application/xml');

    // Parse manifest to get all content files
    const manifest: { [id: string]: string } = {};
    const manifestItems = doc.getElementsByTagNameNS('*', 'item');
    for (let i = 0; i < manifestItems.length; i++) {
      const item = manifestItems[i];
      const id = item.getAttribute('id');
      const href = item.getAttribute('href');
      const mediaType = item.getAttribute('media-type');
      if (id && href && mediaType?.includes('xhtml')) {
        manifest[id] = href;
      }
    }

    // Parse spine to get reading order
    const spineItems = doc.getElementsByTagNameNS('*', 'itemref');
    const chapters: Chapter[] = [];

    for (let i = 0; i < spineItems.length; i++) {
      const itemref = spineItems[i];
      const idref = itemref.getAttribute('idref');
      if (!idref || !manifest[idref]) continue;

      const chapterPath = this.resolveChapterPath(manifest[idref]);
      const chapterContent = await this.zip.file(chapterPath)?.async('text');
      if (!chapterContent) continue;

      // Find corresponding TOC item for better title
      const tocItem = this.findTocItemById(idref);

      // Parse chapter content
      const { title, content, sections, characterDescriptions } = this.parseChapterContent(chapterContent, idref, tocItem?.label);

      chapters.push({
        id: idref,
        title: title || tocItem?.label || `Chapter ${i + 1}`,
        content,
        sections,
        characterDescriptions
      });
    }

    return chapters;
  }

  private findTocItemById(id: string): TocItem | undefined {
    const search = (items: TocItem[]): TocItem | undefined => {
      for (const item of items) {
        if (item.id === id) return item;
        const found = search(item.children);
        if (found) return found;
      }
      return undefined;
    };

    return search(this.toc);
  }

  private parseChapterContent(
    html: string,
    chapterId: string,
    tocTitle?: string
  ): {
    title: string | null;
    content: string;
    sections: { id: string; title: string; content: string }[];
    characterDescriptions: CharacterDescription[];
  } {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // Extract title, prioritizing different sources
    const title = 
      tocTitle || 
      doc.querySelector('h1, h2, h3, h4, h5, h6')?.textContent ||
      doc.querySelector('title')?.textContent ||
      null;
    
    // Parse sections
    const sections: { id: string; title: string; content: string }[] = [];
    const sectionElements = doc.querySelectorAll('section, div[class*="section"], div[class*="chapter"]');
    
    sectionElements.forEach((section, index) => {
      const sectionTitle = section.querySelector('h1, h2, h3, h4, h5, h6')?.textContent || `Section ${index + 1}`;
      const sectionContent = this.cleanHtmlContent(section.innerHTML);
      sections.push({
        id: `${chapterId}_section_${index}`,
        title: sectionTitle,
        content: sectionContent
      });
    });

    // If no sections found, treat the whole chapter as one section
    if (sections.length === 0 && doc.body) {
      sections.push({
        id: `${chapterId}_section_0`,
        title: title || 'Main Content',
        content: this.cleanHtmlContent(doc.body.innerHTML)
      });
    }

    // Clean full content
    const content = this.cleanHtmlContent(doc.body.innerHTML);
    
    // Extract character descriptions
    const characterDescriptions = this.extractCharacterDescriptions(content, chapterId);
    
    return { title, content, sections, characterDescriptions };
  }

  private cleanHtmlContent(html: string): string {
    // Remove script tags and their content
    html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    
    // Remove style tags and their content
    html = html.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
    
    // Remove comments
    html = html.replace(/<!--[\s\S]*?-->/g, '');
    
    // Remove empty paragraphs
    html = html.replace(/<p>\s*<\/p>/g, '');
    
    // Remove multiple spaces
    html = html.replace(/\s+/g, ' ');
    
    // Clean up common formatting issues
    html = html
      .replace(/([.!?])\s+([A-Z])/g, '$1\n$2') // Add newlines after sentences
      .replace(/<br\s*\/?>\s*<br\s*\/?>/gi, '</p><p>') // Convert double breaks to paragraphs
      .replace(/\n{3,}/g, '\n\n'); // Normalize multiple newlines
    
    return html.trim();
  }

  private extractCharacterDescriptions(text: string, chapterId: string): CharacterDescription[] {
    const descriptions: CharacterDescription[] = [];
    const paragraphs = text.split(/(?:\r?\n|\r){2,}/);
    
    // Enhanced patterns for character descriptions
    const patterns = [
      // Physical descriptions
      {
        pattern: /([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)\s+(?:was|is|had)\s+(?:a|an|the)\s+([^.!?]*?(?:tall|short|slim|heavy|young|old|beautiful|handsome|striking|[0-9]+(?:\s+(?:feet|foot|inches))+)[^.!?]*[.!?])/g,
        type: 'physical'
      },
      // Personality descriptions
      {
        pattern: /([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)\s+(?:was|is)\s+(?:a|an)\s+([^.!?]*?(?:kind|gentle|fierce|quiet|loud|brave|timid|intelligent|curious)[^.!?]*[.!?])/g,
        type: 'personality'
      },
      // Background descriptions
      {
        pattern: /([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)\s+(?:came from|grew up|lived|worked|studied|was born|had been)\s+([^.!?]*[.!?])/g,
        type: 'background'
      },
      // Clothing/appearance descriptions
      {
        pattern: /([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)\s+(?:wore|was wearing|dressed in|carried|sported)\s+([^.!?]*[.!?])/g,
        type: 'physical'
      },
      // Pronoun-based descriptions
      {
        pattern: /(?:He|She|They)\s+(?:was|were|had)\s+(?:a|an|the)\s+([^.!?]*[.!?])/g,
        type: 'other'
      }
    ];
    
    paragraphs.forEach((paragraph, paragraphIndex) => {
      patterns.forEach(({ pattern, type }) => {
        const matches = paragraph.matchAll(pattern);
        for (const match of matches) {
          const [fullMatch, character, description] = match;
          descriptions.push({
            text: fullMatch.trim(),
            type: type as CharacterDescription['type'],
            character: character?.trim(),
            location: {
              chapterId,
              paragraphIndex
            }
          });
        }
      });
    });
    
    return descriptions;
  }

  private resolveChapterPath(href: string): string {
    if (!this.opfPath) return href;
    
    // Get the directory of the OPF file
    const opfDir = this.opfPath.substring(0, this.opfPath.lastIndexOf('/'));
    // Resolve the chapter path relative to the OPF directory
    return opfDir ? `${opfDir}/${href}` : href;
  }
} 