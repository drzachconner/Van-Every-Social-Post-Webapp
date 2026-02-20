import { API_BASE_URL } from './constants';
import type { ProcessResponse, RegenerateResponse, VideoResult, JobData } from './types';

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

async function safeJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Server returned non-JSON response: ${text.substring(0, 200)}`);
  }
}

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

  const response = await fetchWithTimeout(`${API_BASE_URL}/process`, {
    method: 'POST',
    body: formData,
  }, 60_000);

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(errText || `Server error ${response.status}`);
  }

  return safeJson<ProcessResponse>(response);
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

  const response = await fetchWithTimeout(`${API_BASE_URL}/regenerate`, {
    method: 'POST',
    body: formData,
  }, 30_000);

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(errText || `Server error ${response.status}`);
  }

  return safeJson<RegenerateResponse>(response);
}

async function uploadToLitterbox(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('reqtype', 'fileupload');
  formData.append('time', '1h');
  formData.append('fileToUpload', file);

  const response = await fetch('https://litterbox.catbox.moe/resources/serverside/llUpload.php', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Litterbox upload failed: ${response.status}`);
  }

  const url = await response.text();
  if (!url.startsWith('http')) {
    throw new Error(`Litterbox returned unexpected response: ${url.substring(0, 200)}`);
  }
  return url.trim();
}

export async function processVideo(
  file: File,
  description: string,
  isSpecial: boolean
): Promise<VideoResult> {
  const fileSizeMB = file.size / (1024 * 1024);

  // Reject extremely large files (litterbox limit is 1GB)
  if (fileSizeMB > 1000) {
    throw new Error(
      `Video is too large (${fileSizeMB.toFixed(0)}MB). Maximum is 1GB. Try trimming or compressing first.`
    );
  }

  // Step 1: Upload video directly to litterbox (bypasses Modal's request size limit)
  let videoUrl: string;
  try {
    videoUrl = await uploadToLitterbox(file);
  } catch (err) {
    const msg = err instanceof Error ? err.message : '';
    if (msg.includes('Load Failed') || msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
      throw new Error(
        `Video upload failed — your connection may have dropped. ` +
        `Video size: ${fileSizeMB.toFixed(0)}MB. Try on Wi-Fi or with a smaller file.`
      );
    }
    throw new Error(`Video upload failed: ${msg}`);
  }

  // Step 2: Send URL to backend for processing (lightweight JSON request)
  const response = await fetchWithTimeout(`${API_BASE_URL}/process-video`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      video_url: videoUrl,
      description: description || '',
      special_video: isSpecial,
    }),
  }, 720_000);

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(errText || `Server error ${response.status}`);
  }

  return safeJson<VideoResult>(response);
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

  const response = await fetchWithTimeout(`${API_BASE_URL}/submit-job`, {
    method: 'POST',
    body: formData,
  }, 120_000);

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(errText || 'Server error');
  }

  return safeJson<{ job_id: string }>(response);
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

  const response = await fetchWithTimeout(`${API_BASE_URL}/submit-video-job`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }, 30_000);

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(errText || 'Server error');
  }

  return safeJson<{ job_id: string }>(response);
}

export async function fetchJobStatus(jobId: string): Promise<JobData> {
  const maxAttempts = 3;
  let delay = 2000;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const response = await fetchWithTimeout(
      `${API_BASE_URL}/job/${jobId}`,
      {},
      10_000
    );

    if (response.ok) {
      return safeJson<JobData>(response);
    }

    // Don't retry on 404
    if (response.status === 404) {
      throw new Error('Job not found');
    }

    // Retry on 500/503
    if ((response.status === 500 || response.status === 503) && attempt < maxAttempts - 1) {
      await new Promise(r => setTimeout(r, delay));
      delay *= 2;
      continue;
    }

    throw new Error(`Job status error: ${response.status}`);
  }

  throw new Error('Job status check failed after retries');
}
