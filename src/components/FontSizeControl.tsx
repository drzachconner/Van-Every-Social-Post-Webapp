'use client';

interface FontSizeControlProps {
  isFontAuto: boolean;
  fontSize: number;
  fontSizeUsed: number;
  onAutoClick: () => void;
  onSliderChange: (value: number) => void;
}

export function FontSizeControl({
  isFontAuto,
  fontSize,
  fontSizeUsed,
  onAutoClick,
  onSliderChange,
}: FontSizeControlProps) {
  const displayText = isFontAuto
    ? fontSizeUsed > 0
      ? `Auto (${fontSizeUsed}px)`
      : 'Auto'
    : `${fontSize}px`;

  return (
    <div className="font-size-control">
      <label>Font size:</label>
      <button
        className={`auto-btn ${isFontAuto ? 'active' : ''}`}
        onClick={onAutoClick}
      >
        Auto
      </button>
      <input
        type="range"
        min={100}
        max={300}
        value={isFontAuto ? fontSizeUsed || 200 : fontSize}
        step={1}
        onChange={(e) => onSliderChange(parseInt(e.target.value))}
      />
      <span className="font-size-value">{displayText}</span>
    </div>
  );
}
