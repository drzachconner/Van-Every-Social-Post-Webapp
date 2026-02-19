'use client';

import { PLATFORM_LIMITS } from '@/lib/constants';

interface CaptionEditorProps {
  captions: Record<string, string>;
  onCaptionChange: (platform: string, value: string) => void;
  idPrefix?: string;
}

export function CaptionEditor({ captions, onCaptionChange, idPrefix = '' }: CaptionEditorProps) {
  return (
    <>
      {Object.entries(captions).map(([platform, value]) => {
        const limit = PLATFORM_LIMITS[platform] || 5000;
        const isOver = value.length > limit;

        return (
          <div key={`${idPrefix}${platform}`} className="caption-group">
            <div className="plat-name">{platform}</div>
            <textarea
              value={value}
              onChange={(e) => onCaptionChange(platform, e.target.value)}
            />
            <div className={`char-count ${isOver ? 'over' : ''}`}>
              {value.length} / {limit}
            </div>
          </div>
        );
      })}
    </>
  );
}

interface MultiCaptionEditorProps {
  perImageCaptions: Record<string, string>[];
  onCaptionChange: (imageIndex: number, platform: string, value: string) => void;
  intervalHours: number;
  type?: 'image' | 'video';
}

export function MultiCaptionEditor({
  perImageCaptions,
  onCaptionChange,
  intervalHours,
  type = 'image',
}: MultiCaptionEditorProps) {
  return (
    <>
      {perImageCaptions.map((captions, imgIdx) => {
        const schedLabel = imgIdx === 0 ? 'Immediate' : `+${imgIdx * intervalHours}h`;
        const label = type === 'video' ? 'Video' : 'Image';

        return (
          <div key={imgIdx} className={`${type}-caption-group`}>
            <h4>{label} {imgIdx + 1} ({schedLabel})</h4>
            <CaptionEditor
              captions={captions}
              onCaptionChange={(platform, value) => onCaptionChange(imgIdx, platform, value)}
              idPrefix={`${imgIdx}-`}
            />
          </div>
        );
      })}
    </>
  );
}
