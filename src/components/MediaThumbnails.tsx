'use client';

import { useState, useCallback, useEffect, DragEvent } from 'react';
import type { MediaType } from '@/lib/types';

interface MediaThumbnailsProps {
  files: File[];
  mediaType: MediaType;
  onRemove: (index: number) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
}

export function MediaThumbnails({ files, mediaType, onRemove, onReorder }: MediaThumbnailsProps) {
  const [dragSrcIndex, setDragSrcIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [objectUrls, setObjectUrls] = useState<string[]>([]);
  const [failedUrls, setFailedUrls] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (mediaType === 'image') {
      const urls = files.map(f => URL.createObjectURL(f));
      setObjectUrls(urls);
      setFailedUrls(new Set());
      return () => urls.forEach(url => URL.revokeObjectURL(url));
    }
    setObjectUrls([]);
  }, [files, mediaType]);

  const handleDragStart = useCallback((e: DragEvent, index: number) => {
    setDragSrcIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  }, []);

  const handleDragOver = useCallback((e: DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  }, []);

  const handleDrop = useCallback((e: DragEvent, targetIndex: number) => {
    e.preventDefault();
    setDragOverIndex(null);
    if (dragSrcIndex !== null && dragSrcIndex !== targetIndex) {
      onReorder(dragSrcIndex, targetIndex);
    }
    setDragSrcIndex(null);
  }, [dragSrcIndex, onReorder]);

  const handleDragEnd = useCallback(() => {
    setDragSrcIndex(null);
    setDragOverIndex(null);
  }, []);

  if (files.length === 0) return null;

  return (
    <div>
      <div className="flex gap-2 flex-wrap mt-3">
        {files.map((file, i) => (
          <div
            key={`${file.name}-${i}`}
            className={`thumb-wrapper ${dragSrcIndex === i ? 'dragging' : ''} ${dragOverIndex === i ? 'drag-over' : ''}`}
            draggable
            onDragStart={(e) => handleDragStart(e, i)}
            onDragOver={(e) => handleDragOver(e, i)}
            onDragLeave={() => setDragOverIndex(null)}
            onDrop={(e) => handleDrop(e, i)}
            onDragEnd={handleDragEnd}
          >
            {mediaType === 'video' ? (
              <div className="video-thumb">&#9658;</div>
            ) : (
              objectUrls[i] && !failedUrls.has(i) ? (
                <img
                  src={objectUrls[i]}
                  alt={file.name}
                  className="thumb"
                  onError={() => setFailedUrls(prev => new Set(prev).add(i))}
                />
              ) : (
                <div className="thumb flex items-center justify-center bg-[#f5f0eb] rounded-lg text-[0.6rem] text-[#888] text-center p-1 overflow-hidden">
                  {file.name.length > 15 ? file.name.slice(0, 12) + '...' : file.name}
                </div>
              )
            )}
            <button
              className="thumb-delete"
              onClick={(e) => { e.stopPropagation(); onRemove(i); }}
              title={`Remove ${mediaType === 'video' ? 'video' : 'image'}`}
            >
              x
            </button>
            <span className="thumb-order">{i + 1}</span>
            {mediaType === 'video' && (
              <div className="video-thumb-info" title={`${file.name} (${(file.size / (1024 * 1024)).toFixed(1)} MB)`}>
                {file.name.length > 12 ? file.name.slice(0, 10) + '..' : file.name}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="text-[0.8rem] text-[#888] mt-1">
        {files.length} {mediaType === 'video' ? 'video' : 'image'}{files.length > 1 ? 's' : ''} selected
      </div>

      {files.length > 1 && (
        <div className="text-[0.75rem] text-[#aaa] mt-0.5 italic">
          Drag to reorder {mediaType === 'video' ? 'videos' : 'images'}
        </div>
      )}
    </div>
  );
}
