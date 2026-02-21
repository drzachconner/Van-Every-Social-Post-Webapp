'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { UploadZone } from '@/components/UploadZone';
import { MediaThumbnails } from '@/components/MediaThumbnails';
import { Toggle } from '@/components/Toggle';
import { PlatformSelector } from '@/components/PlatformSelector';
import { PreviewSection } from '@/components/PreviewSection';
import { JobStatus } from '@/components/JobStatus';
import { RecentJobs } from '@/components/RecentJobs';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import * as api from '@/lib/api';
import { saveJob, getSavedJobs } from '@/lib/jobs';
import { LOADING_STEPS_IMAGES, LOADING_STEPS_VIDEO, IMAGE_PLATFORMS, VIDEO_PLATFORMS, SPECIAL_VIDEO_PLATFORMS } from '@/lib/constants';
import type { MediaType, ViewState, PreviewImage, VideoResult, SavedJob, PlatformCaptions } from '@/lib/types';

export default function Home() {
  // --- View state ---
  const [currentView, setCurrentView] = useState<ViewState>('form');
  const [loadingText, setLoadingText] = useState('Processing...');
  const [errorMessage, setErrorMessage] = useState('');

  // --- File state ---
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [videoFiles, setVideoFiles] = useState<File[]>([]);
  const [mediaType, setMediaType] = useState<MediaType>(null);

  // --- Mode toggles ---
  const [isMultiPostMode, setIsMultiPostMode] = useState(false);
  const [isSpecialVideoMode, setIsSpecialVideoMode] = useState(false);
  const [overlayEnabled, setOverlayEnabled] = useState(true);
  const [postInterval, setPostInterval] = useState(3);

  // --- Platform selection ---
  const [selectedPlatforms, setSelectedPlatforms] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    VIDEO_PLATFORMS.forEach(p => { init[p] = true; });
    return init;
  });

  // --- Description ---
  const [description, setDescription] = useState('');

  // --- Preview data ---
  const [previewImages, setPreviewImages] = useState<PreviewImage[]>([]);
  const [overlayTexts, setOverlayTexts] = useState<string[]>([]);
  const [platformCaptions, setPlatformCaptions] = useState<Record<string, string>>({});
  const [perImageCaptions, setPerImageCaptions] = useState<Record<string, string>[]>([]);

  // --- Video data ---
  const [videoResults, setVideoResults] = useState<VideoResult[]>([]);

  // --- Font size ---
  const [isFontAuto, setIsFontAuto] = useState(false);
  const [currentFontSize, setCurrentFontSize] = useState(200);
  const [fontSizeUsed, setFontSizeUsed] = useState(0);

  // --- Job state ---
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [savedJobs, setSavedJobs] = useState<SavedJob[]>([]);

  // --- UI flags ---
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const loadingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load saved jobs on mount
  useEffect(() => {
    setSavedJobs(getSavedJobs());
  }, []);

  const refreshJobs = useCallback(() => {
    setSavedJobs(getSavedJobs());
  }, []);

  // --- File handlers ---
  const handleImageFiles = useCallback((files: File[]) => {
    const images = files.filter(f => f.type.startsWith('image/'));
    if (images.length === 0) return;
    setMediaType('image');
    setVideoFiles([]);
    setSelectedFiles(prev => [...prev, ...images]);
  }, []);

  const handleVideoFiles = useCallback((files: File[]) => {
    const videos = files.filter(f => f.type.startsWith('video/'));
    if (videos.length === 0) return;
    setMediaType('video');
    setSelectedFiles([]);
    setVideoFiles(prev => [...prev, ...videos]);
  }, []);

  const handleRemoveFile = useCallback((index: number) => {
    if (mediaType === 'video') {
      setVideoFiles(prev => {
        const next = prev.filter((_, i) => i !== index);
        if (next.length === 0) setMediaType(null);
        return next;
      });
    } else {
      setSelectedFiles(prev => {
        const next = prev.filter((_, i) => i !== index);
        if (next.length === 0) setMediaType(null);
        return next;
      });
    }
  }, [mediaType]);

  const handleReorder = useCallback((fromIndex: number, toIndex: number) => {
    const setter = mediaType === 'video' ? setVideoFiles : setSelectedFiles;
    setter(prev => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  }, [mediaType]);

  // --- Derived state ---
  const files = mediaType === 'video' ? videoFiles : selectedFiles;
  const showMultiPostSection = files.length >= 2;
  const isVideoMode = mediaType === 'video';

  const submitDisabled = isVideoMode
    ? videoFiles.length === 0
    : selectedFiles.length === 0 || description.trim() === '';

  const submitButtonText = isVideoMode
    ? isSpecialVideoMode
      ? 'Preview Special Video'
      : videoFiles.length > 1
        ? 'Preview Videos'
        : 'Preview Video'
    : 'Generate Preview';

  // --- Process Images ---
  const processImages = useCallback(async () => {
    if (selectedFiles.length === 0 || description.trim() === '') return;

    setErrorMessage('');
    setCurrentView('loading');

    let step = 0;
    setLoadingText(LOADING_STEPS_IMAGES[0]);
    loadingIntervalRef.current = setInterval(() => {
      step++;
      if (step < LOADING_STEPS_IMAGES.length) {
        setLoadingText(LOADING_STEPS_IMAGES[step]);
      }
    }, 3000);

    try {
      const data = await api.processImages(
        selectedFiles,
        description.trim(),
        overlayEnabled,
        isMultiPostMode,
        currentFontSize
      );

      if (loadingIntervalRef.current) clearInterval(loadingIntervalRef.current);

      setOverlayTexts(data.overlay_texts || []);
      setPreviewImages(data.preview_images || []);
      setOverlayEnabled(data.add_text_overlay || false);

      if (data.font_size_used && data.font_size_used > 0) {
        setFontSizeUsed(data.font_size_used);
      }

      if (data.multi_post && data.per_image_captions) {
        setPerImageCaptions(data.per_image_captions as Record<string, string>[]);
        setPlatformCaptions({});
      } else {
        setPlatformCaptions((data.platform_captions || {}) as Record<string, string>);
        setPerImageCaptions([]);
      }

      setCurrentView('preview');
    } catch (err) {
      if (loadingIntervalRef.current) clearInterval(loadingIntervalRef.current);
      setCurrentView('form');
      setErrorMessage(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }, [selectedFiles, description, overlayEnabled, isMultiPostMode, currentFontSize]);

  // --- Process Video ---
  const processVideoFiles = useCallback(async () => {
    if (videoFiles.length === 0) return;

    setErrorMessage('');
    setCurrentView('loading');
    const results: VideoResult[] = [];

    try {
      for (let v = 0; v < videoFiles.length; v++) {
        const prefix = videoFiles.length > 1 ? `Video ${v + 1} of ${videoFiles.length}: ` : '';
        const steps = LOADING_STEPS_VIDEO(prefix);
        let step = 0;
        setLoadingText(steps[0]);

        const stepInterval = setInterval(() => {
          step++;
          if (step < steps.length) setLoadingText(steps[step]);
        }, 15000);

        const data = await api.processVideo(videoFiles[v], description.trim(), isSpecialVideoMode);
        clearInterval(stepInterval);
        results.push(data);
      }

      setVideoResults(results);

      // Set captions from video results for the caption editor
      if (results.length === 1) {
        setPlatformCaptions(({ ...(results[0].platform_captions || {}) }) as Record<string, string>);
        setPerImageCaptions([]);
      } else {
        // Multiple videos — always use per-video captions
        setPerImageCaptions(results.map(r => ({ ...(r.platform_captions || {}) }) as Record<string, string>));
        setPlatformCaptions({});
      }

      setCurrentView('preview');
    } catch (err) {
      setCurrentView('form');
      setErrorMessage(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }, [videoFiles, description, isSpecialVideoMode]);

  // --- Submit handler ---
  const handleSubmit = useCallback(() => {
    if (isVideoMode) {
      processVideoFiles();
    } else {
      processImages();
    }
  }, [isVideoMode, processVideoFiles, processImages]);

  // --- Regenerate ---
  const handleRegenerate = useCallback(async () => {
    setIsRegenerating(true);
    setCurrentView('loading');
    setLoadingText('Re-generating preview...');

    try {
      const data = await api.regeneratePreview(
        selectedFiles,
        overlayTexts,
        description.trim(),
        currentFontSize
      );

      setOverlayTexts(data.overlay_texts || overlayTexts);
      setPreviewImages(data.preview_images || []);

      if (data.font_size_used && data.font_size_used > 0) {
        setFontSizeUsed(data.font_size_used);
      }

      setCurrentView('preview');
    } catch (err) {
      setCurrentView('preview');
      alert(`Re-generate failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsRegenerating(false);
    }
  }, [selectedFiles, overlayTexts, description, currentFontSize]);

  // --- Post ---
  const getSelectedVideoPlatforms = useCallback(() => {
    return Object.entries(selectedPlatforms)
      .filter(([, checked]) => checked)
      .map(([platform]) => platform);
  }, [selectedPlatforms]);

  const executePost = useCallback(async () => {
    setIsPosting(true);

    try {
      if (isVideoMode) {
        const isMultiVideo = videoResults.length > 1;
        const platformOrder = isSpecialVideoMode
          ? [...SPECIAL_VIDEO_PLATFORMS]
          : [...VIDEO_PLATFORMS];

        const videos = videoResults.map((result, vIdx) => {
          const captions: Record<string, string> = {};
          if (isMultiVideo && perImageCaptions[vIdx]) {
            Object.assign(captions, perImageCaptions[vIdx]);
          } else {
            Object.assign(captions, platformCaptions);
          }
          return {
            video_url: result.video_url,
            title: result.title || '',
            platform_captions: captions,
            thumbnail_url: result.thumbnail_url,
          };
        });

        const opts: Parameters<typeof api.submitVideoJob>[0] = {
          videos,
          intervalHours: postInterval,
          multiPost: isMultiVideo && isMultiPostMode,
        };

        if (isSpecialVideoMode) {
          opts.platforms = ['youtube'];
          opts.youtubePrivacy = 'unlisted';
        } else {
          const selected = getSelectedVideoPlatforms();
          if (selected.length < VIDEO_PLATFORMS.length) {
            opts.platforms = selected;
          }
        }

        const { job_id } = await api.submitVideoJob(opts);
        saveJob(job_id, (videoResults[0]?.title || 'Video post').substring(0, 40));
        refreshJobs();
        setCurrentJobId(job_id);
        setCurrentView('jobStatus');
      } else if (isMultiPostMode && perImageCaptions.length > 0) {
        const { job_id } = await api.submitImageJob(selectedFiles, 'multi', {
          perImageCaptions,
          overlayTexts,
          addTextOverlay: overlayEnabled,
          intervalHours: postInterval,
          fontSize: currentFontSize,
        });
        saveJob(job_id, description.trim());
        refreshJobs();
        setCurrentJobId(job_id);
        setCurrentView('jobStatus');
      } else {
        const { job_id } = await api.submitImageJob(selectedFiles, 'standard', {
          platformCaptions,
          overlayTexts,
          addTextOverlay: overlayEnabled,
          fontSize: currentFontSize,
        });
        saveJob(job_id, description.trim());
        refreshJobs();
        setCurrentJobId(job_id);
        setCurrentView('jobStatus');
      }
    } catch (err) {
      alert(`Posting failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsPosting(false);
    }
  }, [
    isVideoMode, videoResults, isSpecialVideoMode, isMultiPostMode,
    perImageCaptions, platformCaptions, selectedFiles, overlayTexts,
    overlayEnabled, postInterval, currentFontSize, description,
    getSelectedVideoPlatforms, refreshJobs,
  ]);

  const handlePost = useCallback(() => {
    const isMultiVideo = isVideoMode && videoResults.length > 1;
    let msg: string;

    if (isMultiVideo && isMultiPostMode) {
      msg = 'Post each video as a separate post (scheduled hours apart)?';
    } else if (isMultiPostMode) {
      msg = 'Post each image as a separate post (scheduled hours apart)?';
    } else if (isSpecialVideoMode) {
      msg = 'Post to YouTube as unlisted?';
    } else if (isMultiVideo) {
      msg = `Post all ${videoResults.length} videos to all platforms?`;
    } else {
      msg = 'Post to all platforms with the current captions?';
    }

    setConfirmDialog({ message: msg, onConfirm: executePost });
  }, [isVideoMode, videoResults, isMultiPostMode, isSpecialVideoMode, executePost]);

  // --- Post button text ---
  const getPostButtonText = () => {
    if (isVideoMode) {
      const isMultiVideo = videoResults.length > 1;
      if (isSpecialVideoMode) return 'Post to YouTube (Unlisted)';
      if (isMultiVideo && isMultiPostMode) return 'Post All Videos (Scheduled)';
      if (isMultiVideo) return 'Post All Videos';
      return 'Post to All Platforms';
    }
    if (isMultiPostMode && perImageCaptions.length > 0) return 'Post All Images (Scheduled)';
    return 'Post to All Platforms';
  };

  // --- Reset ---
  const handleReset = useCallback(() => {
    setCurrentView('form');
    setSelectedFiles([]);
    setVideoFiles([]);
    setMediaType(null);
    setIsMultiPostMode(false);
    setIsSpecialVideoMode(false);
    setOverlayEnabled(true);
    setDescription('');
    setPreviewImages([]);
    setOverlayTexts([]);
    setPlatformCaptions({});
    setPerImageCaptions([]);
    setVideoResults([]);
    setIsFontAuto(true);
    setCurrentFontSize(0);
    setFontSizeUsed(0);
    setCurrentJobId(null);
    setErrorMessage('');
    setPostInterval(3);
    const init: Record<string, boolean> = {};
    VIDEO_PLATFORMS.forEach(p => { init[p] = true; });
    setSelectedPlatforms(init);
    refreshJobs();
  }, [refreshJobs]);

  // --- Poll a saved job ---
  const handleJobClick = useCallback((jobId: string) => {
    setCurrentJobId(jobId);
    setCurrentView('jobStatus');
  }, []);

  // --- Caption change handlers ---
  const handleCaptionChange = useCallback((platform: string, value: string) => {
    setPlatformCaptions(prev => ({ ...prev, [platform]: value }));
  }, []);

  const handleMultiCaptionChange = useCallback((imageIndex: number, platform: string, value: string) => {
    setPerImageCaptions(prev => {
      const next = [...prev];
      next[imageIndex] = { ...next[imageIndex], [platform]: value };
      return next;
    });
  }, []);

  // --- Overlay text change handler ---
  const handleOverlayTextChange = useCallback((index: number, value: string) => {
    setOverlayTexts(prev => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }, []);

  // --- Font size handlers ---
  const handleFontAutoClick = useCallback(() => {
    setIsFontAuto(true);
    setCurrentFontSize(0);
  }, []);

  const handleFontSliderChange = useCallback((value: number) => {
    setIsFontAuto(false);
    setCurrentFontSize(value);
  }, []);

  return (
    <div className="container">
      <h1>Van Every Social Posts</h1>
      <p className="subtitle">Upload images or video, preview, edit, then post</p>

      {/* ===== FORM VIEW ===== */}
      {currentView === 'form' && (
        <div>
          <div className="card">
            <label>Media</label>
            <UploadZone
              mediaType={mediaType}
              onImageFiles={handleImageFiles}
              onVideoFiles={handleVideoFiles}
            />
            <MediaThumbnails
              files={files}
              mediaType={mediaType}
              onRemove={handleRemoveFile}
              onReorder={handleReorder}
            />

            {/* Multi-post toggle */}
            {showMultiPostSection && (
              <div className="multi-post-section active">
                <Toggle
                  label="Post as individual posts"
                  description="Each image gets its own caption, posted hours apart"
                  checked={isMultiPostMode}
                  onChange={setIsMultiPostMode}
                />
                {isMultiPostMode && (
                  <div className="interval-row" style={{ display: 'flex' }}>
                    <label>Hours between posts:</label>
                    <input
                      type="number"
                      value={postInterval}
                      min={1}
                      max={72}
                      step={1}
                      onChange={(e) => setPostInterval(parseInt(e.target.value) || 3)}
                    />
                    <span className="unit">hours</span>
                  </div>
                )}
              </div>
            )}

            {/* Video mode section */}
            {isVideoMode && (
              <div className="video-mode-section active">
                <Toggle
                  label="Special Office Video"
                  description="YouTube unlisted only (no other platforms)"
                  checked={isSpecialVideoMode}
                  onChange={setIsSpecialVideoMode}
                />
                <PlatformSelector
                  selectedPlatforms={selectedPlatforms}
                  onChange={setSelectedPlatforms}
                  visible={!isSpecialVideoMode}
                />
              </div>
            )}
          </div>

          <div className="card">
            <label>
              {isVideoMode ? 'Description (optional)' : 'Description'}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={
                isVideoMode
                  ? 'Optional: describe the video for better AI captions'
                  : "Describe what's in the image(s). AI will use this to generate on-screen text and captions."
              }
            />
            {!isVideoMode && (
              <Toggle
                label="Text overlay"
                description="Add text to images with branded styling"
                checked={overlayEnabled}
                onChange={setOverlayEnabled}
              />
            )}
          </div>

          <button
            className="submit-btn"
            disabled={submitDisabled}
            onClick={handleSubmit}
          >
            {submitButtonText}
          </button>

          {errorMessage && (
            <div className="error-msg active">{errorMessage}</div>
          )}

          <RecentJobs
            jobs={savedJobs}
            onJobClick={handleJobClick}
            maxItems={5}
          />
        </div>
      )}

      {/* ===== LOADING VIEW ===== */}
      {currentView === 'loading' && (
        <div className="loading active">
          <div className="spinner" />
          <p>{loadingText}</p>
        </div>
      )}

      {/* ===== PREVIEW VIEW ===== */}
      {currentView === 'preview' && mediaType && (
        <PreviewSection
          mediaType={mediaType}
          previewImages={previewImages}
          overlayEnabled={overlayEnabled}
          overlayTexts={overlayTexts}
          onOverlayTextChange={handleOverlayTextChange}
          isFontAuto={isFontAuto}
          fontSize={currentFontSize}
          fontSizeUsed={fontSizeUsed}
          onAutoClick={handleFontAutoClick}
          onSliderChange={handleFontSliderChange}
          isMultiPost={isMultiPostMode || (isVideoMode && videoResults.length > 1)}
          platformCaptions={platformCaptions}
          perImageCaptions={perImageCaptions}
          onCaptionChange={handleCaptionChange}
          onMultiCaptionChange={handleMultiCaptionChange}
          intervalHours={postInterval}
          videoResults={videoResults}
          onRegenerate={handleRegenerate}
          onPost={handlePost}
          onReset={handleReset}
          isRegenerating={isRegenerating}
          isPosting={isPosting}
          postButtonText={getPostButtonText()}
        />
      )}

      {/* ===== JOB STATUS VIEW ===== */}
      {currentView === 'jobStatus' && currentJobId && (
        <div>
          <JobStatus
            jobId={currentJobId}
            onReset={handleReset}
            onJobUpdate={refreshJobs}
          />
          <RecentJobs
            jobs={savedJobs}
            onJobClick={handleJobClick}
          />
        </div>
      )}

      {/* ===== CONFIRM DIALOG ===== */}
      {confirmDialog && (
        <ConfirmDialog
          message={confirmDialog.message}
          onConfirm={() => {
            setConfirmDialog(null);
            confirmDialog.onConfirm();
          }}
          onCancel={() => setConfirmDialog(null)}
        />
      )}
    </div>
  );
}
