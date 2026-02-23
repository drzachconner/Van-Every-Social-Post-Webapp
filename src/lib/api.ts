import { API_BASE_URL } from './constants';
import type { ProcessResponse, RegenerateResponse, VideoResult, JobData } from './types';

// =============================================================================
// Core utilities
// =============================================================================

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

// =============================================================================
// Video upload cascade — 3 independent paths with retry on each
// =============================================================================

/** Upload to litterbox directly from browser (up to 1GB, 1h expiry) */
async function uploadToLitterbox(file: File): Promise<string> {
  const form = new FormData();
  form.append('reqtype', 'fileupload');
  form.append('time', '1h');
  form.append('fileToUpload', file);

  const resp = await fetch(
    'https://litterbox.catbox.moe/resources/serverside/llUpload.php',
    { method: 'POST', body: form }
  );
  if (!resp.ok) throw new Error(`litterbox HTTP ${resp.status}`);
  const url = (await resp.text()).trim();
  if (!url.startsWith('http')) throw new Error(`litterbox bad response: ${url.substring(0, 100)}`);
  return url;
}

/** Upload to catbox directly from browser (up to 200MB, permanent) */
async function uploadToCatbox(file: File): Promise<string> {
  const form = new FormData();
  form.append('reqtype', 'fileupload');
  form.append('fileToUpload', file);

  const resp = await fetch(
    'https://catbox.moe/user/api.php',
    { method: 'POST', body: form }
  );
  if (!resp.ok) throw new Error(`catbox HTTP ${resp.status}`);
  const url = (await resp.text()).trim();
  if (!url.startsWith('http')) throw new Error(`catbox bad response: ${url.substring(0, 100)}`);
  return url;
}

/** Upload through our backend proxy (streams to litterbox server-side) */
async function uploadViaProxy(file: File): Promise<string> {
  const form = new FormData();
  form.append('file', file);

  const resp = await fetchWithTimeout(
    `${API_BASE_URL}/upload-proxy`,
    { method: 'POST', body: form },
    300_000 // 5 min for large files
  );
  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`proxy upload HTTP ${resp.status}: ${errText.substring(0, 200)}`);
  }
  const data = await safeJson<{ url: string }>(resp);
  return data.url;
}

/** Retry a single upload function up to `tries` times */
async function withRetry(
  fn: () => Promise<string>,
  tries: number,
  label: string
): Promise<string> {
  let lastErr: Error | null = null;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err instanceof Error ? err : new Error(String(err));
      console.warn(`${label} attempt ${i + 1}/${tries} failed: ${lastErr.message}`);
      if (i < tries - 1) await new Promise(r => setTimeout(r, 2000 * (i + 1)));
    }
  }
  throw lastErr!;
}

/**
 * Upload a file with full cascade: litterbox → catbox → backend proxy.
 * Each host gets 2 attempts. If all 3 hosts fail, throws with details.
 */
async function uploadFileWithCascade(file: File): Promise<string> {
  const errors: string[] = [];

  // Path 1: Litterbox (1GB limit, best for large videos)
  try {
    return await withRetry(() => uploadToLitterbox(file), 2, 'litterbox');
  } catch (err) {
    errors.push(`litterbox: ${err instanceof Error ? err.message : err}`);
  }

  // Path 2: Catbox (200MB limit, permanent URLs)
  if (file.size <= 200 * 1024 * 1024) {
    try {
      return await withRetry(() => uploadToCatbox(file), 2, 'catbox');
    } catch (err) {
      errors.push(`catbox: ${err instanceof Error ? err.message : err}`);
    }
  }

  // Path 3: Backend proxy (uploads to litterbox server-side, bypasses CORS)
  try {
    return await withRetry(() => uploadViaProxy(file), 2, 'proxy');
  } catch (err) {
    errors.push(`proxy: ${err instanceof Error ? err.message : err}`);
  }

  throw new Error(
    `All upload methods failed. Try a different network or smaller file.\n` +
    errors.map(e => `  - ${e}`).join('\n')
  );
}

// =============================================================================
// Image endpoints
// =============================================================================

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

// =============================================================================
// Video endpoints — uses upload cascade
// =============================================================================

export async function processVideo(
  file: File,
  description: string,
  isSpecial: boolean
): Promise<VideoResult> {
  // Hard limit — no host accepts >1GB
  const fileSizeMB = file.size / (1024 * 1024);
  if (fileSizeMB > 1000) {
    throw new Error(
      `Video is too large (${fileSizeMB.toFixed(0)}MB). Maximum is 1GB. ` +
      `Try trimming or compressing first.`
    );
  }

  // Primary: upload video directly to backend via multipart form.
  // The backend handles temp host upload server-side (no CORS issues,
  // no iOS Safari memory limits). This was the original approach that
  // worked reliably for all file sizes.
  try {
    const formData = new FormData();
    formData.append('video', file);
    if (description) formData.append('description', description);
    if (isSpecial) formData.append('special_video', '1');

    const response = await fetchWithTimeout(`${API_BASE_URL}/process-video`, {
      method: 'POST',
      body: formData,
    }, 720_000); // 12 min timeout for large videos

    if (response.ok) {
      return safeJson<VideoResult>(response);
    }

    const errText = await response.text();
    // If backend rejected due to size, fall through to cascade
    if (response.status === 413) {
      console.warn('Backend rejected file size, trying upload cascade...');
    } else {
      throw new Error(errText || `Server error ${response.status}`);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : '';
    // Only fall through to cascade on upload/network failures, not server errors
    if (!msg.includes('Load failed') && !msg.includes('Failed to fetch') &&
        !msg.includes('NetworkError') && !msg.includes('aborted') &&
        !msg.includes('rejected file size')) {
      throw err;
    }
    console.warn('Direct upload failed, trying upload cascade...', msg);
  }

  // Fallback: upload to temp host first, then send URL to backend.
  // Used when direct upload fails (e.g., request body too large for proxy).
  const videoUrl = await uploadFileWithCascade(file);

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

// =============================================================================
// Job submission endpoints
// =============================================================================

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
    thumbnail_url?: string;
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

// =============================================================================
// Job status polling — with retry
// =============================================================================

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

    if (response.status === 404) {
      throw new Error('Job not found');
    }

    if ((response.status === 500 || response.status === 503) && attempt < maxAttempts - 1) {
      await new Promise(r => setTimeout(r, delay));
      delay *= 2;
      continue;
    }

    throw new Error(`Job status error: ${response.status}`);
  }

  throw new Error('Job status check failed after retries');
}
