'use client';

import { VIDEO_PLATFORMS } from '@/lib/constants';

interface PlatformSelectorProps {
  selectedPlatforms: Record<string, boolean>;
  onChange: (platforms: Record<string, boolean>) => void;
  visible: boolean;
}

const PLATFORM_LABELS: Record<string, string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
  pinterest: 'Pinterest',
  tiktok: 'TikTok',
  twitter: 'Twitter/X',
  youtube: 'YouTube',
};

export function PlatformSelector({ selectedPlatforms, onChange, visible }: PlatformSelectorProps) {
  if (!visible) return null;

  return (
    <div className="platform-checkboxes active">
      <h4>Post to platforms:</h4>
      <div className="platform-checks">
        {VIDEO_PLATFORMS.map(platform => (
          <label key={platform} className="platform-check">
            <input
              type="checkbox"
              checked={selectedPlatforms[platform] ?? true}
              onChange={(e) => {
                onChange({ ...selectedPlatforms, [platform]: e.target.checked });
              }}
            />
            {PLATFORM_LABELS[platform]}
          </label>
        ))}
      </div>
    </div>
  );
}
