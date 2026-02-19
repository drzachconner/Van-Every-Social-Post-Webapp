export type MediaType = 'image' | 'video' | null;

export type ViewState = 'form' | 'loading' | 'preview' | 'jobStatus';

export interface PreviewImage {
  name: string;
  url: string;
}

export interface PlatformCaptions {
  facebook?: string;
  instagram?: string;
  linkedin?: string;
  pinterest?: string;
  tiktok?: string;
  twitter?: string;
  youtube?: string;
}

export interface ProcessResponse {
  success: boolean;
  num_images: number;
  add_text_overlay: boolean;
  overlay_texts: string[];
  preview_images: PreviewImage[];
  multi_post: boolean;
  font_size_used: number;
  platform_captions?: PlatformCaptions;
  per_image_captions?: PlatformCaptions[];
}

export interface RegenerateResponse {
  success: boolean;
  overlay_texts: string[];
  preview_images: PreviewImage[];
  font_size_used: number;
}

export interface VideoResult {
  success: boolean;
  video_url: string;
  title: string;
  transcript?: string;
  platform_captions: PlatformCaptions;
  processing_time?: number;
  special_video?: boolean;
}

export interface PlatformResult {
  success: boolean;
  post_id?: string;
  url?: string;
  error?: string;
}

export interface JobData {
  status: 'pending' | 'processing' | 'uploading' | 'posting' | 'done' | 'failed';
  job_type?: string;
  multi_post?: boolean;
  platform_results?: Record<string, PlatformResult>;
  results?: Array<{
    image_index?: number;
    video_index?: number;
    scheduled_time?: string | null;
    platform_results: Record<string, PlatformResult>;
  }>;
  error?: string;
}

export interface SavedJob {
  id: string;
  desc: string;
  time: string;
  status: string;
}

export type Platform = 'facebook' | 'instagram' | 'linkedin' | 'pinterest' | 'tiktok' | 'twitter' | 'youtube';
