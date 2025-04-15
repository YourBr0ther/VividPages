import { EpubService } from '../epubService';
import JSZip from 'jszip';
import { describe, it, expect, beforeEach } from 'vitest';

const createMockEpubFile = () => {
  const zip = new JSZip();

  // Add container.xml
  zip.file('META-INF/container.xml', `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`);

  // Add content.opf
  zip.file('OEBPS/content.opf', `<?xml version="1.0" encoding="UTF-8"?>
<package version="3.0" xmlns="http://www.idpf.org/2007/opf" unique-identifier="uid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>Test Book</dc:title>
    <dc:creator>Test Author</dc:creator>
    <dc:language>en</dc:language>
    <dc:publisher>Test Publisher</dc:publisher>
    <dc:date>2023-01-01</dc:date>
  </metadata>
  <manifest>
    <item id="nav" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    <item id="chapter1" href="chapter1.xhtml" media-type="application/xhtml+xml"/>
    <item id="chapter2" href="chapter2.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine toc="nav">
    <itemref idref="chapter1"/>
    <itemref idref="chapter2"/>
  </spine>
</package>`);

  // Add toc.ncx
  zip.file('OEBPS/toc.ncx', `<?xml version="1.0" encoding="UTF-8"?>
<ncx version="2005-1" xmlns="http://www.daisy.org/z3986/2005/ncx/">
  <navMap>
    <navPoint id="nav_0_0" playOrder="1">
      <navLabel><text>Chapter 1</text></navLabel>
      <content src="chapter1.xhtml"/>
    </navPoint>
    <navPoint id="nav_0_1" playOrder="2">
      <navLabel><text>Chapter 2</text></navLabel>
      <content src="chapter2.xhtml"/>
    </navPoint>
  </navMap>
</ncx>`);

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
    it('should extract chapters correctly', async () => {
      await epubService.loadEpub(mockFile);
      const chapters = await epubService.getChapters();
      
      expect(chapters).toHaveLength(2);
      expect(chapters[0]).toEqual({
        id: 'chapter1',
        title: 'Chapter 1',
        content: expect.stringContaining('This is the first chapter'),
        sections: [],
        characterDescriptions: []
      });
    });

    it('should throw an error if no ePUB file is loaded', async () => {
      await expect(epubService.getChapters()).rejects.toThrow('No ePUB file loaded');
    });
  });
}); 