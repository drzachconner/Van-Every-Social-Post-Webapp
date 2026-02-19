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
}

export function OverlayEditor({
  overlayTexts,
  onTextChange,
  isFontAuto,
  fontSize,
  fontSizeUsed,
  onAutoClick,
  onSliderChange,
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
    </div>
  );
}
