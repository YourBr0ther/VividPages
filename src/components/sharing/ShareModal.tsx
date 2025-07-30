'use client';

import { useState } from 'react';
import Image from 'next/image';
import { GalleryImage } from '@/components/gallery/ImageGallery';

interface ShareModalProps {
  image: GalleryImage;
  isOpen: boolean;
  onClose: () => void;
}

export default function ShareModal({ image, isOpen, onClose }: ShareModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const shareUrl = `${window.location.origin}/shared/${image.id}`;
  
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const downloadImage = async () => {
    try {
      const response = await fetch(image.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${image.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

  const shareToSocial = (platform: 'twitter' | 'facebook' | 'pinterest') => {
    const text = `Check out this amazing scene: ${image.title}`;
    let url = '';

    switch (platform) {
      case 'twitter':
        url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`;
        break;
      case 'facebook':
        url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
        break;
      case 'pinterest':
        url = `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(shareUrl)}&media=${encodeURIComponent(image.url)}&description=${encodeURIComponent(text)}`;
        break;
    }

    window.open(url, '_blank', 'width=600,height=400');
  };

  return (
    <div 
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className="bg-primary-navy/90 rounded-2xl p-6 max-w-2xl w-full animate-scaleIn"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <h2 className="text-2xl font-serif font-bold text-primary-gold">
            Share Scene
          </h2>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-light text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Preview */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <div className="relative aspect-square rounded-lg overflow-hidden">
            <Image
              src={image.url}
              alt={image.title}
              fill
              className="object-cover"
            />
          </div>
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-serif font-semibold text-text-light mb-2">
                {image.title}
              </h3>
              <p className="text-text-muted text-sm">
                {image.description}
              </p>
              {image.chapter && (
                <p className="text-text-muted text-xs mt-2">
                  Chapter {image.chapter} {image.scene && `• Scene ${image.scene}`}
                </p>
              )}
            </div>

            {/* Share Link */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-light">Share Link</label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={shareUrl}
                  readOnly
                  className="flex-1 bg-primary-navy border border-primary-gold/30 rounded px-3 py-2 text-sm text-text-light"
                />
                <button
                  onClick={copyToClipboard}
                  className="px-4 py-2 bg-primary-gold hover:bg-accent-gold text-primary-navy font-medium rounded transition-colors"
                >
                  {copied ? '✓ Copied' : 'Copy'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-4">
          {/* Social Sharing */}
          <div>
            <label className="text-sm font-medium text-text-light mb-2 block">
              Share on Social Media
            </label>
            <div className="flex space-x-3">
              <button
                onClick={() => shareToSocial('twitter')}
                className="flex-1 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded font-medium transition-colors"
              >
                Twitter
              </button>
              <button
                onClick={() => shareToSocial('facebook')}
                className="flex-1 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded font-medium transition-colors"
              >
                Facebook
              </button>
              <button
                onClick={() => shareToSocial('pinterest')}
                className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-medium transition-colors"
              >
                Pinterest
              </button>
            </div>
          </div>

          {/* Download */}
          <button
            onClick={downloadImage}
            className="w-full py-3 bg-primary-navy border border-primary-gold/30 hover:border-primary-gold/60 text-text-light rounded font-medium transition-colors"
          >
            Download Image
          </button>
        </div>
      </div>
    </div>
  );
}