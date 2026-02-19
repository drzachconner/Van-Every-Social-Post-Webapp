'use client';

import type { PreviewImage, VideoResult, PlatformCaptions } from '@/lib/types';
import { OverlayEditor } from './OverlayEditor';
import { CaptionEditor, MultiCaptionEditor } from './CaptionEditor';

interface PreviewSectionProps {
  mediaType: 'image' | 'video';

  // Image preview
  previewImages: PreviewImage[];
  overlayEnabled: boolean;
  overlayTexts: string[];
  onOverlayTextChange: (index: number, value: string) => void;

  // Font size
  isFontAuto: boolean;
  fontSize: number;
  fontSizeUsed: number;
  onAutoClick: () => void;
  onSliderChange: (value: number) => void;

  // Captions
  isMultiPost: boolean;
  platformCaptions: Record<string, string>;
  perImageCaptions: Record<string, string>[];
  onCaptionChange: (platform: string, value: string) => void;
  onMultiCaptionChange: (imageIndex: number, platform: string, value: string) => void;
  intervalHours: number;

  // Video
  videoResults: VideoResult[];

  // Actions
  onRegenerate: () => void;
  onPost: () => void;
  onReset: () => void;
  isRegenerating: boolean;
  isPosting: boolean;
  postButtonText: string;
}

export function PreviewSection({
  mediaType,
  previewImages,
  overlayEnabled,
  overlayTexts,
  onOverlayTextChange,
  isFontAuto,
  fontSize,
  fontSizeUsed,
  onAutoClick,
  onSliderChange,
  isMultiPost,
  platformCaptions,
  perImageCaptions,
  onCaptionChange,
  onMultiCaptionChange,
  intervalHours,
  videoResults,
  onRegenerate,
  onPost,
  onReset,
  isRegenerating,
  isPosting,
  postButtonText,
}: PreviewSectionProps) {
  return (
    <div>
      {/* Preview card */}
      <div className="card">
        <h2 className="text-[1.1rem] font-bold mb-3">Preview</h2>

        {mediaType === 'image' && previewImages.length > 0 && (
          <div className="preview-images">
            {previewImages.map((img, i) => (
              <img key={i} src={img.url} alt={img.name} />
            ))}
          </div>
        )}

        {mediaType === 'video' && videoResults.length > 0 && (
          <div>
            {videoResults.map((result, vIdx) => (
              <div key={vIdx}>
                {videoResults.length > 1 && (
                  <div className="font-bold text-[0.85rem] text-brand-pink mb-1.5">
                    Video {vIdx + 1}
                  </div>
                )}
                <video
                  className="preview-video"
                  controls
                  src={result.video_url}
                />
                {result.processing_time && (
                  <div className="text-[0.8rem] text-[#888] mb-3">
                    Processed in {Math.round(result.processing_time)}s
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Overlay editor (images only) */}
      {mediaType === 'image' && overlayEnabled && overlayTexts.length > 0 && (
        <OverlayEditor
          overlayTexts={overlayTexts}
          onTextChange={onOverlayTextChange}
          isFontAuto={isFontAuto}
          fontSize={fontSize}
          fontSizeUsed={fontSizeUsed}
          onAutoClick={onAutoClick}
          onSliderChange={onSliderChange}
          onRegenerate={onRegenerate}
          isRegenerating={isRegenerating}
        />
      )}

      {/* Caption editor */}
      <div className="card">
        <h3 className="text-[0.9rem] mb-2.5 text-brand-charcoal">Captions by Platform</h3>

        {isMultiPost && perImageCaptions.length > 0 ? (
          <MultiCaptionEditor
            perImageCaptions={perImageCaptions}
            onCaptionChange={onMultiCaptionChange}
            intervalHours={intervalHours}
            type={mediaType === 'video' ? 'video' : 'image'}
          />
        ) : (
          <CaptionEditor
            captions={platformCaptions}
            onCaptionChange={onCaptionChange}
          />
        )}
      </div>

      {/* Action buttons */}
      <div className="action-buttons">
        {mediaType === 'image' && (
          <button
            className="btn btn-regen"
            disabled={isRegenerating || isPosting}
            onClick={onRegenerate}
          >
            Re-Generate Preview
          </button>
        )}
        <button
          className="btn btn-post"
          disabled={isRegenerating || isPosting}
          onClick={onPost}
        >
          {isPosting ? 'Posting...' : postButtonText}
        </button>
      </div>

      <button className="reset-btn" onClick={onReset}>
        Start Over
      </button>
    </div>
  );
}
