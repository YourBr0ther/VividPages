import React, { useCallback, useState } from 'react';

interface EpubUploaderProps {
  onFileUpload: (file: File) => void;
}

const EpubUploader: React.FC<EpubUploaderProps> = ({ onFileUpload }) => {
  const [error, setError] = useState<string>('');

  const validateEpubFile = (file: File): boolean => {
    // Check if file is an ePUB
    if (!file.name.toLowerCase().endsWith('.epub')) {
      setError('Please upload an ePUB file');
      return false;
    }

    // Check file size (e.g., max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      setError('File size must be less than 50MB');
      return false;
    }

    return true;
  };

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (validateEpubFile(file)) {
      setError('');
      onFileUpload(file);
    }
  }, [onFileUpload]);

  return (
    <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-lg">
      <input
        type="file"
        accept=".epub"
        onChange={handleFileChange}
        className="hidden"
        id="epub-upload"
      />
      <label
        htmlFor="epub-upload"
        className="cursor-pointer bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
      >
        Upload ePUB File
      </label>
      {error && (
        <p className="mt-2 text-red-500 text-sm">{error}</p>
      )}
    </div>
  );
};

export default EpubUploader; 