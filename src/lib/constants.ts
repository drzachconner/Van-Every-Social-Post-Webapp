export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '';

export const PLATFORM_LIMITS: Record<string, number> = {
  facebook: 63206,
  instagram: 2200,
  linkedin: 3000,
  pinterest: 800,
  tiktok: 2200,
  twitter: 280,
  youtube: 5000,
};

export const IMAGE_PLATFORMS = ['facebook', 'instagram', 'linkedin', 'pinterest', 'tiktok', 'twitter'] as const;
export const VIDEO_PLATFORMS = ['facebook', 'instagram', 'linkedin', 'pinterest', 'tiktok', 'twitter', 'youtube'] as const;
export const SPECIAL_VIDEO_PLATFORMS = ['youtube'] as const;

export const LOADING_STEPS_IMAGES = [
  'Uploading images...',
  'Generating AI text...',
  'Overlaying text on images...',
  'Generating preview...',
];

export const LOADING_STEPS_VIDEO = (prefix: string) => [
  `${prefix}Uploading video...`,
  `${prefix}Processing audio cleanup...`,
  `${prefix}Transcribing speech...`,
  `${prefix}Adding TikTok-style captions...`,
  `${prefix}Compressing for mobile...`,
  `${prefix}Generating social captions...`,
];
