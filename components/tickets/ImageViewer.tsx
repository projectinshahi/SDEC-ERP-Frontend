'use client';

import React, { useState } from 'react';
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Download } from 'lucide-react';
import { classNames } from '@/lib/utils';
import { createPortal } from 'react-dom';

interface ImageViewerProps {
  images: { id: number; url: string; name: string }[];
  initialIndex?: number;
  isOpen: boolean;
  onClose: () => void;
}

export function ImageViewer({ images, initialIndex = 0, isOpen, onClose }: ImageViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);

  if (!isOpen || images.length === 0) return null;

  const currentImage = images[currentIndex];

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % images.length);
    setScale(1);
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
    setScale(1);
  };

  const handleZoomIn = (e: React.MouseEvent) => {
    e.stopPropagation();
    setScale((prev) => Math.min(prev + 0.5, 3));
  };

  const handleZoomOut = (e: React.MouseEvent) => {
    e.stopPropagation();
    setScale((prev) => Math.max(prev - 0.5, 0.5));
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    const link = document.createElement('a');
    link.href = currentImage.url;
    link.download = currentImage.name;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return createPortal(
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Top Toolbar */}
      <div 
        className="absolute top-0 inset-x-0 p-4 flex items-center justify-between bg-gradient-to-b from-black/50 to-transparent"
        onClick={e => e.stopPropagation()}
      >
        <div className="text-white">
          <p className="font-medium">{currentImage.name}</p>
          <p className="text-sm text-gray-300">
            {currentIndex + 1} of {images.length}
          </p>
        </div>
        <div className="flex items-center space-x-4 text-white">
          <button onClick={handleZoomOut} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <ZoomOut className="w-5 h-5" />
          </button>
          <span className="text-sm font-medium w-12 text-center">{Math.round(scale * 100)}%</span>
          <button onClick={handleZoomIn} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <ZoomIn className="w-5 h-5" />
          </button>
          <div className="w-px h-6 bg-white/20 mx-2" />
          <button onClick={handleDownload} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <Download className="w-5 h-5" />
          </button>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors ml-4">
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Navigation Arrows */}
      {images.length > 1 && (
        <>
          <button
            onClick={handlePrev}
            className="absolute left-4 p-3 text-white bg-black/50 hover:bg-black/70 rounded-full transition-colors backdrop-blur-sm"
          >
            <ChevronLeft className="w-8 h-8" />
          </button>
          <button
            onClick={handleNext}
            className="absolute right-4 p-3 text-white bg-black/50 hover:bg-black/70 rounded-full transition-colors backdrop-blur-sm"
          >
            <ChevronRight className="w-8 h-8" />
          </button>
        </>
      )}

      {/* Main Image View */}
      <div 
        className="w-full h-full flex items-center justify-center p-20 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <img
          src={currentImage.url}
          alt={currentImage.name}
          className="max-w-full max-h-full object-contain transition-transform duration-200 ease-out"
          style={{ transform: `scale(${scale})` }}
        />
      </div>
    </div>,
    document.body
  );
}
