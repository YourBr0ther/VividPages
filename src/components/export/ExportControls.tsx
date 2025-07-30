'use client';

import { useState } from 'react';
import { PDFExportData } from '@/lib/types/export';
import { PDFGenerator } from '@/lib/pdf/generator';

interface ExportControlsProps {
  projectId: string;
  selectedImageIds?: string[];
  totalImages: number;
  onExportComplete?: () => void;
}

export default function ExportControls({ 
  projectId, 
  selectedImageIds, 
  totalImages,
  onExportComplete 
}: ExportControlsProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportType, setExportType] = useState<'images' | 'pdf' | 'project'>('images');

  const handleExportImages = async () => {
    setIsExporting(true);
    try {
      const response = await fetch('/api/export/images', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId,
          imageIds: selectedImageIds,
        }),
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      // Download the ZIP file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vividpages-images-${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      onExportComplete?.();
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export images. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      const response = await fetch('/api/export/pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId,
          includeCharacters: true,
          includeScenes: true,
        }),
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const { data }: { data: PDFExportData } = await response.json();
      
      // Generate real PDF using jsPDF
      const pdfGenerator = new PDFGenerator();
      const pdfBlob = await pdfGenerator.generatePDF(data);
      
      const url = window.URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vividpages-${data.project.name}-${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      onExportComplete?.();
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export PDF. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportProject = async () => {
    setIsExporting(true);
    try {
      const response = await fetch('/api/export/project', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ projectId }),
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      // Download the JSON file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vividpages-project-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      onExportComplete?.();
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export project. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExport = () => {
    switch (exportType) {
      case 'images':
        handleExportImages();
        break;
      case 'pdf':
        handleExportPDF();
        break;
      case 'project':
        handleExportProject();
        break;
    }
  };


  const exportCount = selectedImageIds ? selectedImageIds.length : totalImages;

  return (
    <div className="bg-primary-navy/30 backdrop-blur-sm rounded-xl p-6 border border-primary-gold/20">
      <h3 className="text-xl font-serif font-semibold text-primary-gold mb-4">
        Export Options
      </h3>

      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={() => setExportType('images')}
            className={`p-3 rounded-lg border transition-all ${
              exportType === 'images'
                ? 'bg-primary-gold text-primary-navy border-primary-gold'
                : 'border-primary-gold/30 text-text-light hover:border-primary-gold/60'
            }`}
          >
            <div className="text-2xl mb-1">🖼️</div>
            <div className="text-sm font-medium">Images ZIP</div>
            <div className="text-xs opacity-75 mt-1">
              {exportCount} image{exportCount !== 1 ? 's' : ''}
            </div>
          </button>

          <button
            onClick={() => setExportType('pdf')}
            className={`p-3 rounded-lg border transition-all ${
              exportType === 'pdf'
                ? 'bg-primary-gold text-primary-navy border-primary-gold'
                : 'border-primary-gold/30 text-text-light hover:border-primary-gold/60'
            }`}
          >
            <div className="text-2xl mb-1">📄</div>
            <div className="text-sm font-medium">PDF Report</div>
            <div className="text-xs opacity-75 mt-1">With descriptions</div>
          </button>

          <button
            onClick={() => setExportType('project')}
            className={`p-3 rounded-lg border transition-all ${
              exportType === 'project'
                ? 'bg-primary-gold text-primary-navy border-primary-gold'
                : 'border-primary-gold/30 text-text-light hover:border-primary-gold/60'
            }`}
          >
            <div className="text-2xl mb-1">💾</div>
            <div className="text-sm font-medium">Full Project</div>
            <div className="text-xs opacity-75 mt-1">For backup/sharing</div>
          </button>
        </div>

        {selectedImageIds && selectedImageIds.length > 0 && (
          <div className="text-sm text-text-muted">
            Exporting {selectedImageIds.length} selected image{selectedImageIds.length !== 1 ? 's' : ''} 
            {exportType === 'images' && ' as ZIP'}
          </div>
        )}

        <button
          onClick={handleExport}
          disabled={isExporting}
          className="w-full py-3 bg-primary-gold hover:bg-accent-gold text-primary-navy font-semibold rounded-lg transition-colors disabled:opacity-50"
        >
          {isExporting ? (
            <span className="flex items-center justify-center space-x-2">
              <span className="animate-spin">⏳</span>
              <span>Exporting...</span>
            </span>
          ) : (
            <span>Export {exportType === 'images' ? 'Images' : exportType === 'pdf' ? 'PDF' : 'Project'}</span>
          )}
        </button>
      </div>
    </div>
  );
}