'use client';

import { useRef, useCallback, DragEvent } from 'react';
import type { MediaType } from '@/lib/types';

interface UploadZoneProps {
  mediaType: MediaType;
  onImageFiles: (files: File[]) => void;
  onVideoFiles: (files: File[]) => void;
}

export function UploadZone({ mediaType, onImageFiles, onVideoFiles }: UploadZoneProps) {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const handleImageDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    if (mediaType === 'video') return;
    e.currentTarget.classList.add('dragover');
  }, [mediaType]);

  const handleImageDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.remove('dragover');
    if (mediaType === 'video') return;
    const images = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    if (images.length > 0) onImageFiles(images);
  }, [mediaType, onImageFiles]);

  const handleVideoDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    if (mediaType === 'image') return;
    e.currentTarget.classList.add('dragover');
  }, [mediaType]);

  const handleVideoDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.remove('dragover');
    if (mediaType === 'image') return;
    const videos = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('video/'));
    if (videos.length > 0) onVideoFiles(videos);
  }, [mediaType, onVideoFiles]);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.currentTarget.classList.remove('dragover');
  }, []);

  return (
    <div className="flex items-stretch gap-0 mb-2">
      {/* Image dropzone */}
      <div
        className={`dropzone flex-1 ${mediaType === 'video' ? 'disabled' : ''}`}
        onClick={() => mediaType !== 'video' && imageInputRef.current?.click()}
        onDragOver={handleImageDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleImageDrop}
      >
        <span className="text-[1.6rem] mb-1.5 block">+</span>
        <p className="text-[#999] text-[0.82rem]">Drop images or tap to select</p>
      </div>

      <div className="flex items-center px-3 text-[#bbb] text-[0.8rem] font-bold uppercase tracking-wider">
        OR
      </div>

      {/* Video dropzone */}
      <div
        className={`dropzone flex-1 ${mediaType === 'image' ? 'disabled' : ''}`}
        onClick={() => mediaType !== 'image' && videoInputRef.current?.click()}
        onDragOver={handleVideoDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleVideoDrop}
      >
        <span className="text-[1.6rem] mb-1.5 block">&#9658;</span>
        <p className="text-[#999] text-[0.82rem]">Drop video(s) or tap to select</p>
      </div>

      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) onImageFiles(Array.from(e.target.files));
          e.target.value = '';
        }}
      />
      <input
        ref={videoInputRef}
        type="file"
        accept="video/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) onVideoFiles(Array.from(e.target.files));
          e.target.value = '';
        }}
      />
    </div>
  );
}
