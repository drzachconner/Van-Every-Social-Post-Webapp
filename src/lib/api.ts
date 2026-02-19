import { API_BASE_URL } from './constants';
import type { ProcessResponse, RegenerateResponse, VideoResult, JobData } from './types';

export async function processImages(
  files: File[],
  description: string,
  addTextOverlay: boolean,
  multiPost: boolean,
  fontSize: number
): Promise<ProcessResponse> {
  const formData = new FormData();
  files.forEach(f => formData.append('images', f));
  formData.append('description', description);
  formData.append('add_text_overlay', addTextOverlay ? '1' : '0');
  if (multiPost) formData.append('multi_post', '1');
  if (fontSize > 0) formData.append('font_size', fontSize.toString());

  const response = await fetch(`${API_BASE_URL}/process`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(errText || `Server error ${response.status}`);
  }

  return response.json();
}

export async function regeneratePreview(
  files: File[],
  overlayTexts: string[],
  description: string,
  fontSize: number
): Promise<RegenerateResponse> {
  const formData = new FormData();
  files.forEach(f => formData.append('images', f));
  formData.append('overlay_texts', JSON.stringify(overlayTexts));
  formData.append('description', description);
  if (fontSize > 0) formData.append('font_size', fontSize.toString());

  const response = await fetch(`${API_BASE_URL}/regenerate`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(errText || `Server error ${response.status}`);
  }

  return response.json();
}

export async function processVideo(
  file: File,
  description: string,
  isSpecial: boolean
): Promise<VideoResult> {
  const formData = new FormData();
  formData.append('video', file);
  if (description) formData.append('description', description);
  if (isSpecial) formData.append('special_video', '1');

  const response = await fetch(`${API_BASE_URL}/process-video`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(errText || `Server error ${response.status}`);
  }

  return response.json();
}

export async function submitImageJob(
  files: File[],
  jobType: 'standard' | 'multi',
  options: {
    platformCaptions?: Record<string, string>;
    perImageCaptions?: Record<string, string>[];
    overlayTexts: string[];
    addTextOverlay: boolean;
    intervalHours?: number;
    fontSize?: number;
  }
): Promise<{ job_id: string }> {
  const formData = new FormData();
  files.forEach(f => formData.append('images', f));
  formData.append('job_type', jobType);
  formData.append('add_text_overlay', options.addTextOverlay ? '1' : '0');
  formData.append('overlay_texts', JSON.stringify(options.overlayTexts));

  if (jobType === 'multi' && options.perImageCaptions) {
    formData.append('per_image_captions', JSON.stringify(options.perImageCaptions));
    if (options.intervalHours) formData.append('interval_hours', options.intervalHours.toString());
  } else if (options.platformCaptions) {
    formData.append('platform_captions', JSON.stringify(options.platformCaptions));
  }

  if (options.fontSize && options.fontSize > 0) {
    formData.append('font_size', options.fontSize.toString());
  }

  const response = await fetch(`${API_BASE_URL}/submit-job`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(errText || 'Server error');
  }

  return response.json();
}

export async function submitVideoJob(options: {
  videos: Array<{
    video_url: string;
    title: string;
    platform_captions: Record<string, string>;
  }>;
  intervalHours: number;
  multiPost: boolean;
  platforms?: string[];
  youtubePrivacy?: string;
}): Promise<{ job_id: string }> {
  const body: Record<string, unknown> = {
    job_type: 'video',
    videos: options.videos,
    interval_hours: options.intervalHours,
    multi_post: options.multiPost,
  };

  if (options.platforms) body.platforms = options.platforms;
  if (options.youtubePrivacy) body.youtube_privacy = options.youtubePrivacy;

  const response = await fetch(`${API_BASE_URL}/submit-video-job`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(errText || 'Server error');
  }

  return response.json();
}

export async function fetchJobStatus(jobId: string): Promise<JobData> {
  const response = await fetch(`${API_BASE_URL}/job/${jobId}`);
  if (!response.ok) throw new Error('Job not found');
  return response.json();
}
