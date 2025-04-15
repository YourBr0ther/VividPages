import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EpubService, EpubMetadata, Chapter, TocItem } from '../services/epubService';
import JSZip from 'jszip';

// Create a minimal valid ePUB file structure
const createMockEpubFile = () => {
  const zip = new JSZip();
  
  // Add container.xml
  zip.file('META-INF/container.xml', `<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`);

  // Add content.opf
  zip.file('OEBPS/content.opf', `<?xml version="1.0"?>
<package version="3.0" xmlns="http://www.idpf.org/2007/opf">
  <metadata>
    <dc:title xmlns:dc="http://purl.org/dc/elements/1.1/">Test Book</dc:title>
    <dc:creator xmlns:dc="http://purl.org/dc/elements/1.1/">Test Author</dc:creator>
    <dc:language xmlns:dc="http://purl.org/dc/elements/1.1/">en</dc:language>
    <dc:publisher xmlns:dc="http://purl.org/dc/elements/1.1/">Test Publisher</dc:publisher>
    <dc:date xmlns:dc="http://purl.org/dc/elements/1.1/">2023-01-01</dc:date>
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="chapter1" href="chapter1.xhtml" media-type="application/xhtml+xml"/>
    <item id="chapter2" href="chapter2.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine toc="nav">
    <itemref idref="chapter1"/>
    <itemref idref="chapter2"/>
  </spine>
</package>`);

  // Add nav.xhtml
  zip.file('OEBPS/nav.xhtml', `<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
  <body>
    <nav epub:type="toc">
      <ol>
        <li><a href="chapter1.xhtml">Chapter 1</a></li>
        <li><a href="chapter2.xhtml">Chapter 2</a></li>
      </ol>
    </nav>
  </body>
</html>`);

  // Add chapter1.xhtml
  zip.file('OEBPS/chapter1.xhtml', `<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
  <body>
    <h1>Chapter 1</h1>
    <p>This is the first chapter of the book.</p>
    <p>It contains some interesting content.</p>
  </body>
</html>`);

  // Add chapter2.xhtml
  zip.file('OEBPS/chapter2.xhtml', `<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
  <body>
    <h1>Chapter 2</h1>
    <p>This is the second chapter of the book.</p>
    <p>It continues the story.</p>
  </body>
</html>`);

  return zip;
};

describe('EpubService', () => {
  let epubService: EpubService;
  let mockFile: File;

  beforeEach(async () => {
    epubService = new EpubService();
    // Generate a real ZIP file for testing
    const zip = createMockEpubFile();
    const blob = await zip.generateAsync({ type: 'blob' });
    mockFile = new File([blob], 'test.epub', { type: 'application/epub+zip' });
  });

  describe('loadEpub', () => {
    it('should load a valid ePUB file', async () => {
      await expect(epubService.loadEpub(mockFile)).resolves.not.toThrow();
    });

    it('should throw an error for invalid ePUB file', async () => {
      // Create a corrupted ZIP file
      const invalidBlob = new Blob(['invalid zip content'], { type: 'application/epub+zip' });
      const invalidFile = new File([invalidBlob], 'test.epub', { type: 'application/epub+zip' });
      await expect(epubService.loadEpub(invalidFile)).rejects.toThrow('Invalid ePUB file');
    });
  });

  describe('getMetadata', () => {
    it('should extract correct metadata from ePUB file', async () => {
      await epubService.loadEpub(mockFile);
      const metadata = await epubService.getMetadata();
      
      expect(metadata).toEqual({
        title: 'Test Book',
        author: 'Test Author',
        language: 'en',
        publisher: 'Test Publisher',
        date: '2023-01-01'
      });
    });

    it('should throw an error if no ePUB file is loaded', async () => {
      await expect(epubService.getMetadata()).rejects.toThrow('No ePUB file loaded');
    });
  });

  describe('getTableOfContents', () => {
    it('should parse table of contents correctly', async () => {
      await epubService.loadEpub(mockFile);
      const toc = await epubService.getTableOfContents();
      
      expect(toc).toEqual([
        {
          id: 'nav_0_0',
          label: 'Chapter 1',
          href: 'chapter1.xhtml',
          level: 0,
          children: []
        },
        {
          id: 'nav_0_1',
          label: 'Chapter 2',
          href: 'chapter2.xhtml',
          level: 0,
          children: []
        }
      ]);
    });

    it('should throw an error if no ePUB file is loaded', async () => {
      await expect(epubService.getTableOfContents()).rejects.toThrow('No ePUB file loaded');
    });
  });

  describe('getChapters', () => {
    it('should extract chapters with content', async () => {
      await epubService.loadEpub(mockFile);
      const chapters = await epubService.getChapters();
      
      expect(chapters).toHaveLength(2);
      
      // Check first chapter
      expect(chapters[0]).toMatchObject({
        id: 'chapter1',
        title: 'Chapter 1',
        content: expect.stringContaining('This is the first chapter of the book'),
        sections: expect.arrayContaining([
          expect.objectContaining({
            title: 'Chapter 1',
            content: expect.stringContaining('This is the first chapter of the book')
          })
        ])
      });

      // Check second chapter
      expect(chapters[1]).toMatchObject({
        id: 'chapter2',
        title: 'Chapter 2',
        content: expect.stringContaining('This is the second chapter of the book'),
        sections: expect.arrayContaining([
          expect.objectContaining({
            title: 'Chapter 2',
            content: expect.stringContaining('This is the second chapter of the book')
          })
        ])
      });
    });

    it('should throw an error if no ePUB file is loaded', async () => {
      await expect(epubService.getChapters()).rejects.toThrow('No ePUB file loaded');
    });
  });
}); 