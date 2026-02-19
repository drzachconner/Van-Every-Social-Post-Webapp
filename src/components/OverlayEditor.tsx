'use client';

import { FontSizeControl } from './FontSizeControl';

interface OverlayEditorProps {
  overlayTexts: string[];
  onTextChange: (index: number, value: string) => void;
  isFontAuto: boolean;
  fontSize: number;
  fontSizeUsed: number;
  onAutoClick: () => void;
  onSliderChange: (value: number) => void;
  onRegenerate?: () => void;
  isRegenerating?: boolean;
}

export function OverlayEditor({
  overlayTexts,
  onTextChange,
  isFontAuto,
  fontSize,
  fontSizeUsed,
  onAutoClick,
  onSliderChange,
  onRegenerate,
  isRegenerating,
}: OverlayEditorProps) {
  if (overlayTexts.length === 0) return null;

  return (
    <div className="card">
      <h3 className="text-[0.9rem] mb-2.5 text-brand-charcoal">Overlay Text</h3>
      {overlayTexts.map((text, i) => (
        <div key={i} className="mb-2">
          <label className="text-[0.8rem] text-[#888] mb-1">Image {i + 1} text</label>
          <input
            type="text"
            value={text}
            onChange={(e) => onTextChange(i, e.target.value)}
            className="overlay-text-input"
          />
        </div>
      ))}
      <FontSizeControl
        isFontAuto={isFontAuto}
        fontSize={fontSize}
        fontSizeUsed={fontSizeUsed}
        onAutoClick={onAutoClick}
        onSliderChange={onSliderChange}
      />
      {onRegenerate && (
        <button
          className="btn btn-regen w-full mt-3"
          disabled={isRegenerating}
          onClick={onRegenerate}
        >
          {isRegenerating ? 'Regenerating...' : 'Re-Generate Preview'}
        </button>
      )}
    </div>
  );
}
