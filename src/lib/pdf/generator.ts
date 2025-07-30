import jsPDF from 'jspdf';
import { PDFExportData, ExportedImage } from '@/lib/types/export';

export class PDFGenerator {
  private doc: jsPDF;
  private pageWidth: number;
  private pageHeight: number;
  private margin: number;
  private currentY: number;
  private lineHeight: number;

  constructor() {
    this.doc = new jsPDF();
    this.pageWidth = this.doc.internal.pageSize.getWidth();
    this.pageHeight = this.doc.internal.pageSize.getHeight();
    this.margin = 20;
    this.currentY = this.margin;
    this.lineHeight = 7;
  }

  async generatePDF(data: PDFExportData): Promise<Blob> {
    // Add title page
    this.addTitle(data.project.name);
    this.addText(`Generated: ${new Date(data.generatedAt).toLocaleDateString()}`);
    this.addText(`Author: ${data.project.metadata.author || 'Unknown'}`);
    
    if (data.project.metadata.description) {
      this.addSpacing(10);
      this.addText('Description:', { fontSize: 14, isBold: true });
      this.addText(data.project.metadata.description);
    }

    // Add characters section
    if (data.characters.length > 0) {
      this.addNewPage();
      this.addSectionHeader('Characters');
      
      for (const character of data.characters) {
        await this.addCharacter(character);
      }
    }

    // Add scenes section
    if (data.scenes.length > 0) {
      this.addNewPage();
      this.addSectionHeader('Scenes');
      
      for (const scene of data.scenes) {
        await this.addScene(scene);
      }
    }

    return this.doc.output('blob');
  }

  private addTitle(title: string) {
    this.doc.setFontSize(24);
    this.doc.setFont('helvetica', 'bold');
    
    const textWidth = this.doc.getTextWidth(title);
    const x = (this.pageWidth - textWidth) / 2;
    
    this.doc.text(title, x, this.currentY);
    this.currentY += 20;
    
    // Add a line under the title
    this.doc.setLineWidth(0.5);
    this.doc.line(this.margin, this.currentY, this.pageWidth - this.margin, this.currentY);
    this.currentY += 15;
  }

  private addSectionHeader(title: string) {
    this.doc.setFontSize(18);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(title, this.margin, this.currentY);
    this.currentY += 15;
  }

  private addText(text: string, options?: { fontSize?: number; isBold?: boolean }) {
    const fontSize = options?.fontSize || 12;
    const fontStyle = options?.isBold ? 'bold' : 'normal';
    
    this.doc.setFontSize(fontSize);
    this.doc.setFont('helvetica', fontStyle);
    
    const maxWidth = this.pageWidth - (this.margin * 2);
    const lines = this.doc.splitTextToSize(text, maxWidth);
    
    for (const line of lines) {
      if (this.currentY > this.pageHeight - this.margin) {
        this.addNewPage();
      }
      
      this.doc.text(line, this.margin, this.currentY);
      this.currentY += this.lineHeight;
    }
  }

  private addSpacing(space: number) {
    this.currentY += space;
  }

  private addNewPage() {
    this.doc.addPage();
    this.currentY = this.margin;
  }

  private async addCharacter(character: ExportedImage) {
    // Check if we need a new page
    if (this.currentY > this.pageHeight - 100) {
      this.addNewPage();
    }

    // Character name
    this.doc.setFontSize(14);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(character.title, this.margin, this.currentY);
    this.currentY += 10;

    // Character description
    this.doc.setFontSize(11);
    this.doc.setFont('helvetica', 'normal');
    
    const maxWidth = this.pageWidth - (this.margin * 2);
    const lines = this.doc.splitTextToSize(character.description, maxWidth);
    
    for (const line of lines) {
      if (this.currentY > this.pageHeight - this.margin) {
        this.addNewPage();
      }
      
      this.doc.text(line, this.margin, this.currentY);
      this.currentY += this.lineHeight;
    }

    // Try to add character image if available
    if (character.imageUrl) {
      try {
        await this.addImageToPDF(character.imageUrl, 60, 60);
      } catch (error) {
        console.warn('Failed to add character image to PDF:', error);
        // Add placeholder text instead
        this.addText('[Character Image]', { fontSize: 10 });
      }
    }

    this.addSpacing(15);
  }

  private async addScene(scene: ExportedImage) {
    // Check if we need a new page
    if (this.currentY > this.pageHeight - 120) {
      this.addNewPage();
    }

    // Scene title
    this.doc.setFontSize(14);
    this.doc.setFont('helvetica', 'bold');
    const sceneTitle = `Chapter ${scene.chapter}, Scene ${scene.scene}: ${scene.title}`;
    this.doc.text(sceneTitle, this.margin, this.currentY);
    this.currentY += 10;

    // Scene description
    this.doc.setFontSize(11);
    this.doc.setFont('helvetica', 'normal');
    
    const maxWidth = this.pageWidth - (this.margin * 2);
    const lines = this.doc.splitTextToSize(scene.description, maxWidth);
    
    for (const line of lines) {
      if (this.currentY > this.pageHeight - this.margin) {
        this.addNewPage();
      }
      
      this.doc.text(line, this.margin, this.currentY);
      this.currentY += this.lineHeight;
    }

    // Try to add scene image if available
    if (scene.imageUrl) {
      try {
        await this.addImageToPDF(scene.imageUrl, 80, 80);
      } catch (error) {
        console.warn('Failed to add scene image to PDF:', error);
        // Add placeholder text instead
        this.addText('[Scene Image]', { fontSize: 10 });
      }
    }

    this.addSpacing(20);
  }

  private async addImageToPDF(imageUrl: string, width: number, height: number): Promise<void> {
    try {
      // Check if we need a new page for the image
      if (this.currentY + height > this.pageHeight - this.margin) {
        this.addNewPage();
      }

      // Fetch image and convert to base64
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const base64 = reader.result as string;
            
            // Determine image format
            const format = imageUrl.toLowerCase().includes('.png') ? 'PNG' : 'JPEG';
            
            // Add image to PDF
            this.doc.addImage(
              base64,
              format,
              this.margin,
              this.currentY,
              width,
              height
            );
            
            this.currentY += height + 10;
            resolve();
          } catch (error) {
            reject(error);
          }
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      throw error;
    }
  }
}