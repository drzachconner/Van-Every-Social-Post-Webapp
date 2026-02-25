'use client';

import { useState, useCallback, useEffect, DragEvent } from 'react';
import type { MediaType } from '@/lib/types';

interface MediaThumbnailsProps {
  files: File[];
  mediaType: MediaType;
  onRemove: (index: number) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
}

function isHeic(file: File): boolean {
  const name = file.name.toLowerCase();
  return name.endsWith('.heic') || name.endsWith('.heif') || file.type === 'image/heic' || file.type === 'image/heif';
}

export function MediaThumbnails({ files, mediaType, onRemove, onReorder }: MediaThumbnailsProps) {
  const [dragSrcIndex, setDragSrcIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [objectUrls, setObjectUrls] = useState<string[]>([]);

  useEffect(() => {
    if (mediaType !== 'image' || files.length === 0) {
      setObjectUrls([]);
      return;
    }

    let cancelled = false;
    const urls: string[] = [];

    async function createUrls() {
      const results: string[] = [];
      for (const file of files) {
        if (cancelled) return;
        if (isHeic(file)) {
          try {
            const heic2any = (await import('heic2any')).default;
            const blob = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.5 });
            const converted = Array.isArray(blob) ? blob[0] : blob;
            const url = URL.createObjectURL(converted);
            urls.push(url);
            results.push(url);
          } catch {
            // Conversion failed — create URL from original (may work on Safari)
            const url = URL.createObjectURL(file);
            urls.push(url);
            results.push(url);
          }
        } else {
          const url = URL.createObjectURL(file);
          urls.push(url);
          results.push(url);
        }
      }
      if (!cancelled) {
        setObjectUrls(results);
      }
    }

    createUrls();
    return () => {
      cancelled = true;
      urls.forEach(url => URL.revokeObjectURL(url));
    };
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
            ) : objectUrls[i] ? (
              <img
                src={objectUrls[i]}
                alt={file.name}
                className="thumb"
              />
            ) : (
              <div className="thumb flex items-center justify-center bg-[#f5f0eb] rounded-lg">
                <div className="w-5 h-5 border-2 border-[#c77e7e] border-t-transparent rounded-full animate-spin" />
              </div>
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
