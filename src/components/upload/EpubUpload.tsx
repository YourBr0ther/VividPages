'use client';

import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';

interface EpubUploadProps {
  onFileUpload: (file: File) => void;
  isProcessing?: boolean;
}

export default function EpubUpload({ onFileUpload, isProcessing = false }: EpubUploadProps) {

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        const file = acceptedFiles[0];
        if (file.type === 'application/epub+zip' || file.name.endsWith('.epub')) {
          onFileUpload(file);
        } else {
          alert('Please upload a valid EPUB file');
        }
      }
    },
    [onFileUpload]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/epub+zip': ['.epub'],
    },
    maxFiles: 1,
    disabled: isProcessing,
  });

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200
          ${isDragActive 
            ? 'border-primary-gold bg-primary-gold/10' 
            : 'border-primary-gold/30 hover:border-primary-gold/60'
          }
          ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input {...getInputProps()} />
        
        <div className="space-y-4">
          <div className="text-6xl">📚</div>
          
          {isProcessing ? (
            <div className="space-y-2">
              <div className="text-xl text-primary-gold">Processing EPUB...</div>
              <div className="w-full bg-primary-navy rounded-full h-2">
                <div className="bg-primary-gold h-2 rounded-full animate-pulse w-3/4"></div>
              </div>
              <p className="text-text-muted text-sm">
                Extracting chapters and preparing for analysis
              </p>
            </div>
          ) : (
            <>
              <div className="text-xl font-semibold text-text-light">
                {isDragActive ? 'Drop your EPUB file here' : 'Upload EPUB File'}
              </div>
              
              <p className="text-text-muted">
                Drag and drop your EPUB file here, or click to browse
              </p>
              
              <p className="text-sm text-text-muted/70">
                Supported format: .epub files only
              </p>
            </>
          )}
        </div>
      </div>
      
      {!isProcessing && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="flex items-center space-x-2 text-text-muted">
            <span className="text-primary-gold">✓</span>
            <span>Privacy first - processed locally</span>
          </div>
          <div className="flex items-center space-x-2 text-text-muted">
            <span className="text-primary-gold">✓</span>
            <span>No file size limits</span>
          </div>
          <div className="flex items-center space-x-2 text-text-muted">
            <span className="text-primary-gold">✓</span>
            <span>Secure processing</span>
          </div>
        </div>
      )}
    </div>
  );
}