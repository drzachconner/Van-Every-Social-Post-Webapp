const imageDropzone = document.getElementById('image-dropzone');
const videoDropzone = document.getElementById('video-dropzone');
const imageFileInput = document.getElementById('image-file-input');
const videoFileInput = document.getElementById('video-file-input');
const previewsThumbs = document.getElementById('previews');
const videoUploadPreview = document.getElementById('video-upload-preview');
const fileCount = document.getElementById('file-count');
const reorderHint = document.getElementById('reorder-hint');
const submitBtn = document.getElementById('submit-btn');
const descriptionEl = document.getElementById('description');
const descriptionLabel = document.getElementById('description-label');
const addText = document.getElementById('add-text');
const textOverlayRow = document.getElementById('text-overlay-row');
const formSection = document.getElementById('form-section');
const loadingSection = document.getElementById('loading');
const loadingText = document.getElementById('loading-text');
const previewSection = document.getElementById('preview-section');
const previewImages = document.getElementById('preview-images');
const videoPreviewContainer = document.getElementById('video-preview-container');
const overlayEditor = document.getElementById('overlay-editor');
const overlayInputs = document.getElementById('overlay-inputs');
const captionInputs = document.getElementById('caption-inputs');
const regenBtn = document.getElementById('regen-btn');
const postBtn = document.getElementById('post-btn');
const postingResults = document.getElementById('posting-results');
const resultList = document.getElementById('result-list');
const resetBtn = document.getElementById('reset-btn');
const errorMsg = document.getElementById('error-msg');

// New DOM refs
const multiPostSection = document.getElementById('multi-post-section');
const multiPostToggle = document.getElementById('multi-post-toggle');
const intervalRow = document.getElementById('interval-row');
const postInterval = document.getElementById('post-interval');
const videoModeSection = document.getElementById('video-mode-section');
const specialVideoToggle = document.getElementById('special-video-toggle');
const platformCheckboxes = document.getElementById('platform-checkboxes');

// Job status DOM refs
const jobStatusSection = document.getElementById('job-status-section');
const jobStatusContent = document.getElementById('job-status-content');
const jobResultContent = document.getElementById('job-result-content');
const jobIdDisplay = document.getElementById('job-id-display');
const jobSpinner = document.getElementById('job-spinner');
const jobResetBtn = document.getElementById('job-reset-btn');
const recentJobsSection = document.getElementById('recent-jobs-section');
const recentJobsList = document.getElementById('recent-jobs-list');

// Font size DOM refs
const fontSizeSlider = document.getElementById('font-size-slider');
const fontSizeDisplay = document.getElementById('font-size-display');
const fontAutoBtn = document.getElementById('font-auto-btn');

// State
let selectedFiles = [];
let videoFiles = [];
let mediaType = null; // 'image' or 'video'
let currentOverlayTexts = [];
let overlayEnabled = false;
let currentVideoUrl = null;
let currentVideoTitle = null;
let currentVideoResults = [];
let currentVideoUrls = [];
let currentVideoTitles = [];
let isMultiPostMode = false;
let isSpecialVideoMode = false;
let currentPerImageCaptions = []; // for multi-post mode
let currentFontSize = 0; // 0 = auto
let isFontAuto = true;

// Multi-post toggle
multiPostToggle.addEventListener('change', () => {
  isMultiPostMode = multiPostToggle.checked;
  intervalRow.style.display = isMultiPostMode ? 'flex' : 'none';
});

// Special video toggle
specialVideoToggle.addEventListener('change', () => {
  isSpecialVideoMode = specialVideoToggle.checked;
  platformCheckboxes.classList.toggle('active', !isSpecialVideoMode);
  if (isSpecialVideoMode) {
    submitBtn.textContent = 'Process Special Video';
  } else {
    submitBtn.textContent = videoFiles.length > 1 ? 'Process Videos' : 'Process Video';
  }
});

// Font size slider events
fontSizeSlider.addEventListener('input', () => {
  isFontAuto = false;
  fontAutoBtn.classList.remove('active');
  currentFontSize = parseInt(fontSizeSlider.value);
  fontSizeDisplay.textContent = currentFontSize + 'px';
});
fontAutoBtn.addEventListener('click', () => {
  isFontAuto = true;
  fontAutoBtn.classList.add('active');
  currentFontSize = 0;
  fontSizeDisplay.textContent = 'Auto';
});

// Job management
function saveJob(jobId, description) {
  const jobs = JSON.parse(localStorage.getItem('ve_jobs') || '[]');
  jobs.unshift({ id: jobId, desc: description, time: new Date().toISOString(), status: 'pending' });
  if (jobs.length > 20) jobs.length = 20;
  localStorage.setItem('ve_jobs', JSON.stringify(jobs));
}
function updateJobStatus(jobId, status) {
  const jobs = JSON.parse(localStorage.getItem('ve_jobs') || '[]');
  const job = jobs.find(j => j.id === jobId);
  if (job) { job.status = status; localStorage.setItem('ve_jobs', JSON.stringify(jobs)); }
}
function renderRecentJobs() {
  const jobs = JSON.parse(localStorage.getItem('ve_jobs') || '[]');

  // Render in job status section
  if (jobs.length === 0) { recentJobsSection.style.display = 'none'; }
  else {
    recentJobsSection.style.display = 'block';
    recentJobsList.innerHTML = '';
    jobs.slice(0, 10).forEach(job => {
      const div = document.createElement('div');
      div.className = 'recent-job-item';
      const timeStr = new Date(job.time).toLocaleString();
      div.innerHTML = '<div><div>' + (job.desc || 'Post').substring(0, 40) + '</div><div class="job-time">' + timeStr + '</div></div>' +
        '<span class="job-status-badge ' + (job.status || 'pending') + '">' + (job.status || 'pending') + '</span>';
      div.addEventListener('click', () => pollJob(job.id));
      recentJobsList.appendChild(div);
    });
  }

  // Also render in the form section
  const formJobsSection = document.getElementById('form-recent-jobs');
  const formJobsList = document.getElementById('form-recent-jobs-list');
  if (jobs.length === 0) { formJobsSection.style.display = 'none'; return; }
  formJobsSection.style.display = 'block';
  formJobsList.innerHTML = '';
  jobs.slice(0, 5).forEach(job => {
    const div = document.createElement('div');
    div.className = 'recent-job-item';
    const timeStr = new Date(job.time).toLocaleString();
    div.innerHTML = '<div><div>' + (job.desc || 'Post').substring(0, 40) + '</div><div class="job-time">' + timeStr + '</div></div>' +
      '<span class="job-status-badge ' + (job.status || 'pending') + '">' + (job.status || 'pending') + '</span>';
    div.addEventListener('click', () => pollJob(job.id));
    formJobsList.appendChild(div);
  });
}
async function pollJob(jobId) {
  jobStatusSection.classList.add('active');
  formSection.style.display = 'none';
  previewSection.classList.remove('active');
  loadingSection.classList.remove('active');
  jobIdDisplay.textContent = 'Job: ' + jobId;
  jobStatusContent.style.display = 'block';
  jobResultContent.style.display = 'none';
  jobSpinner.style.display = 'block';

  const poll = async () => {
    try {
      const resp = await fetch(API_BASE_URL + '/job/' + jobId);
      if (!resp.ok) { throw new Error('Job not found'); }
      const data = await resp.json();
      const status = data.status || 'pending';
      updateJobStatus(jobId, status);

      if (status === 'done' || status === 'failed') {
        jobSpinner.style.display = 'none';
        jobResultContent.style.display = 'block';
        jobStatusContent.querySelector('.job-pending-msg').textContent =
          status === 'done' ? 'Job complete!' : 'Job failed';
        jobStatusContent.querySelector('.job-pending-msg').style.color =
          status === 'done' ? '#2e7d32' : '#c62828';
        jobStatusContent.querySelector('p').style.display = 'none';

        // Render platform results
        if (data.multi_post && data.results) {
          let html = '<h3 style="font-size:0.9rem;margin-bottom:10px;">Posting Results</h3>';
          for (const item of data.results) {
            const idx = item.video_index !== undefined ? item.video_index : item.image_index;
            const label = item.video_index !== undefined ? 'Video' : 'Image';
            const schedLabel = item.scheduled_time ? ' (Scheduled)' : ' (Immediate)';
            html += '<div style="font-weight:700;font-size:0.85rem;margin-top:12px;margin-bottom:4px;color:#e09f9f;">' +
              label + ' ' + (idx + 1) + schedLabel + '</div>';
            for (const [platform, result] of Object.entries(item.platform_results || {})) {
              const ok = result.success;
              html += '<div class="result-item"><div><span class="platform">' + platform + '</span>';
              if (!ok && result.error) html += '<div class="error-detail">' + (result.error || '').substring(0, 150).replace(/</g, '&lt;') + '</div>';
              html += '</div><span class="status ' + (ok ? 'success' : 'failed') + '">' + (ok ? 'Posted' : 'Failed') + '</span></div>';
            }
          }
          jobResultContent.innerHTML = html;
        } else if (data.platform_results) {
          let html = '<h3 style="font-size:0.9rem;margin-bottom:10px;">Posting Results</h3>';
          for (const [platform, result] of Object.entries(data.platform_results)) {
            const ok = result.success;
            html += '<div class="result-item"><div><span class="platform">' + platform + '</span>';
            if (!ok && result.error) html += '<div class="error-detail">' + (result.error || '').substring(0, 150).replace(/</g, '&lt;') + '</div>';
            html += '</div><span class="status ' + (ok ? 'success' : 'failed') + '">' + (ok ? 'Posted' : 'Failed') + '</span></div>';
          }
          jobResultContent.innerHTML = html;
        } else if (data.error) {
          jobResultContent.innerHTML = '<div class="error-msg active">' + data.error + '</div>';
        }
        renderRecentJobs();
        return; // Stop polling
      }

      // Update status message
      const msgs = { pending: 'Queued...', processing: 'Processing images...', uploading: 'Uploading to hosting...', posting: 'Posting to platforms...' };
      jobStatusContent.querySelector('.job-pending-msg').textContent = msgs[status] || 'Working...';

      setTimeout(poll, 5000);
    } catch (err) {
      jobSpinner.style.display = 'none';
      jobStatusContent.querySelector('.job-pending-msg').textContent = 'Error checking status';
      jobStatusContent.querySelector('.job-pending-msg').style.color = '#c62828';
    }
  };
  poll();
}

// Job reset button
jobResetBtn.addEventListener('click', () => {
  jobStatusSection.classList.remove('active');
  formSection.style.display = 'block';
  renderRecentJobs();
  // Reset state
  selectedFiles = [];
  videoFiles = [];
  mediaType = null;
  descriptionEl.value = '';
  submitBtn.disabled = true;
  updateDropzoneStates();
  updateUploadPreviews();
});

// Show recent jobs on page load
renderRecentJobs();

// Image dropzone events
imageDropzone.addEventListener('click', () => {
  if (mediaType === 'video') return;
  imageFileInput.click();
});
imageDropzone.addEventListener('dragover', (e) => {
  e.preventDefault();
  if (mediaType === 'video') return;
  imageDropzone.classList.add('dragover');
});
imageDropzone.addEventListener('dragleave', () => imageDropzone.classList.remove('dragover'));
imageDropzone.addEventListener('drop', (e) => {
  e.preventDefault();
  imageDropzone.classList.remove('dragover');
  if (mediaType === 'video') return;
  // Only accept image files dropped here
  const images = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
  if (images.length > 0) handleImageFiles(images);
});
imageFileInput.addEventListener('change', (e) => { handleImageFiles(Array.from(e.target.files)); imageFileInput.value = ''; });

// Video dropzone events
videoDropzone.addEventListener('click', () => {
  if (mediaType === 'image') return;
  videoFileInput.click();
});
videoDropzone.addEventListener('dragover', (e) => {
  e.preventDefault();
  if (mediaType === 'image') return;
  videoDropzone.classList.add('dragover');
});
videoDropzone.addEventListener('dragleave', () => videoDropzone.classList.remove('dragover'));
videoDropzone.addEventListener('drop', (e) => {
  e.preventDefault();
  videoDropzone.classList.remove('dragover');
  if (mediaType === 'image') return;
  // Only accept video files dropped here
  const videos = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('video/'));
  if (videos.length > 0) handleVideoFile(videos);
});
videoFileInput.addEventListener('change', (e) => { handleVideoFile(Array.from(e.target.files)); videoFileInput.value = ''; });

function handleImageFiles(files) {
  const newImages = files.filter(f => f.type.startsWith('image/'));
  if (newImages.length === 0) return;
  mediaType = 'image';
  videoFiles = [];
  selectedFiles = selectedFiles.concat(newImages);
  updateDropzoneStates();
  updateUIForMediaType();
  updateUploadPreviews();
}

function handleVideoFile(files) {
  const vids = files.filter(f => f.type.startsWith('video/'));
  if (vids.length === 0) return;
  mediaType = 'video';
  videoFiles = videoFiles.concat(vids);
  selectedFiles = [];
  updateDropzoneStates();
  updateUIForMediaType();
  updateUploadPreviews();
}

function updateDropzoneStates() {
  if (mediaType === 'image') {
    videoDropzone.classList.add('disabled');
    imageDropzone.classList.remove('disabled');
  } else if (mediaType === 'video') {
    imageDropzone.classList.add('disabled');
    videoDropzone.classList.remove('disabled');
  } else {
    imageDropzone.classList.remove('disabled');
    videoDropzone.classList.remove('disabled');
  }
}

function removeImage(index) {
  selectedFiles.splice(index, 1);
  if (selectedFiles.length === 0) {
    mediaType = null;
    updateDropzoneStates();
    updateUIForMediaType();
  }
  updateUploadPreviews();
}

function removeVideo(index) {
  videoFiles.splice(index, 1);
  if (videoFiles.length === 0) {
    mediaType = null;
    updateDropzoneStates();
    updateUIForMediaType();
  }
  updateUploadPreviews();
}

// Drag-to-reorder state
let dragSrcIndex = null;

function handleThumbDragStart(e) {
  dragSrcIndex = parseInt(e.currentTarget.dataset.index);
  e.currentTarget.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', dragSrcIndex);
}

function handleThumbDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  e.currentTarget.classList.add('drag-over');
}

function handleThumbDragLeave(e) {
  e.currentTarget.classList.remove('drag-over');
}

function handleThumbDrop(e) {
  e.preventDefault();
  e.currentTarget.classList.remove('drag-over');
  const targetIndex = parseInt(e.currentTarget.dataset.index);
  if (dragSrcIndex !== null && dragSrcIndex !== targetIndex) {
    // Swap files in the correct array based on media type
    const arr = mediaType === 'video' ? videoFiles : selectedFiles;
    const moved = arr.splice(dragSrcIndex, 1)[0];
    arr.splice(targetIndex, 0, moved);
    updateUploadPreviews();
  }
  dragSrcIndex = null;
}

function handleThumbDragEnd(e) {
  e.currentTarget.classList.remove('dragging');
  dragSrcIndex = null;
}

function updateUIForMediaType() {
  if (mediaType === 'video') {
    textOverlayRow.style.display = 'none';
    videoModeSection.classList.add('active');
    descriptionEl.placeholder = 'Optional: describe the video for better AI captions';
    descriptionLabel.textContent = 'Description (optional)';
    if (isSpecialVideoMode) {
      submitBtn.textContent = 'Process Special Video';
    } else {
      submitBtn.textContent = videoFiles.length > 1 ? 'Process Videos' : 'Process Video';
    }
    // Show multi-post scheduling when 2+ videos
    if (videoFiles.length >= 2) {
      multiPostSection.classList.add('active');
    } else {
      multiPostSection.classList.remove('active');
      multiPostToggle.checked = false;
      isMultiPostMode = false;
      intervalRow.style.display = 'none';
    }
  } else {
    textOverlayRow.style.display = 'flex';
    videoModeSection.classList.remove('active');
    descriptionEl.placeholder = "Describe what's in the image(s). AI will use this to generate on-screen text and captions.";
    descriptionLabel.textContent = 'Description';
    submitBtn.textContent = 'Generate Preview';
    // Show multi-post option only when 2+ images
    if (selectedFiles.length >= 2) {
      multiPostSection.classList.add('active');
    } else {
      multiPostSection.classList.remove('active');
      multiPostToggle.checked = false;
      isMultiPostMode = false;
      intervalRow.style.display = 'none';
    }
  }
}

function updateUploadPreviews() {
  previewsThumbs.innerHTML = '';
  videoUploadPreview.style.display = 'none';
  videoUploadPreview.innerHTML = '';
  reorderHint.style.display = 'none';

  if (mediaType === 'video' && videoFiles.length > 0) {
    // Render video thumb cards (same style as image thumbs)
    videoFiles.forEach((f, i) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'thumb-wrapper';
      wrapper.draggable = true;
      wrapper.dataset.index = i;
      wrapper.style.marginBottom = '20px';

      const thumb = document.createElement('div');
      thumb.className = 'video-thumb';
      thumb.innerHTML = '&#9658;';

      const delBtn = document.createElement('button');
      delBtn.className = 'thumb-delete';
      delBtn.textContent = 'x';
      delBtn.title = 'Remove video';
      delBtn.addEventListener('click', (e) => { e.stopPropagation(); removeVideo(i); });

      const order = document.createElement('span');
      order.className = 'thumb-order';
      order.textContent = i + 1;

      const info = document.createElement('div');
      info.className = 'video-thumb-info';
      const sizeMB = (f.size / (1024 * 1024)).toFixed(1);
      info.textContent = f.name.length > 12 ? f.name.slice(0, 10) + '..' : f.name;
      info.title = f.name + ' (' + sizeMB + ' MB)';

      wrapper.appendChild(thumb);
      wrapper.appendChild(delBtn);
      wrapper.appendChild(order);
      wrapper.appendChild(info);

      // Drag-to-reorder events
      wrapper.addEventListener('dragstart', handleThumbDragStart);
      wrapper.addEventListener('dragover', handleThumbDragOver);
      wrapper.addEventListener('dragleave', handleThumbDragLeave);
      wrapper.addEventListener('drop', handleThumbDrop);
      wrapper.addEventListener('dragend', handleThumbDragEnd);

      previewsThumbs.appendChild(wrapper);
    });
    fileCount.textContent = videoFiles.length + ' video' + (videoFiles.length > 1 ? 's' : '') + ' selected';
    if (videoFiles.length > 1) {
      reorderHint.style.display = 'block';
      reorderHint.textContent = 'Drag to reorder videos';
    }
    submitBtn.disabled = false;
  } else if (mediaType === 'image' && selectedFiles.length > 0) {
    selectedFiles.forEach((f, i) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'thumb-wrapper';
      wrapper.draggable = true;
      wrapper.dataset.index = i;

      const img = document.createElement('img');
      img.classList.add('thumb');
      img.src = URL.createObjectURL(f);

      const delBtn = document.createElement('button');
      delBtn.className = 'thumb-delete';
      delBtn.textContent = 'x';
      delBtn.title = 'Remove image';
      delBtn.addEventListener('click', (e) => { e.stopPropagation(); removeImage(i); });

      const order = document.createElement('span');
      order.className = 'thumb-order';
      order.textContent = i + 1;

      wrapper.appendChild(img);
      wrapper.appendChild(delBtn);
      wrapper.appendChild(order);

      // Drag-to-reorder events
      wrapper.addEventListener('dragstart', handleThumbDragStart);
      wrapper.addEventListener('dragover', handleThumbDragOver);
      wrapper.addEventListener('dragleave', handleThumbDragLeave);
      wrapper.addEventListener('drop', handleThumbDrop);
      wrapper.addEventListener('dragend', handleThumbDragEnd);

      previewsThumbs.appendChild(wrapper);
    });
    fileCount.textContent = selectedFiles.length + ' image' + (selectedFiles.length > 1 ? 's' : '') + ' selected';
    if (selectedFiles.length > 1) {
      reorderHint.style.display = 'block';
      reorderHint.textContent = 'Drag to reorder images';
      multiPostSection.classList.add('active');
    } else {
      multiPostSection.classList.remove('active');
      multiPostToggle.checked = false;
      isMultiPostMode = false;
      intervalRow.style.display = 'none';
    }
    submitBtn.disabled = descriptionEl.value.trim() === '';
  } else {
    fileCount.textContent = '';
    submitBtn.disabled = true;
  }
}

descriptionEl.addEventListener('input', () => {
  if (mediaType === 'video') {
    // Description is optional for video
    submitBtn.disabled = videoFiles.length === 0;
  } else {
    submitBtn.disabled = selectedFiles.length === 0 || descriptionEl.value.trim() === '';
  }
});

// Generate Preview / Process Video
submitBtn.addEventListener('click', async () => {
  if (mediaType === 'video') {
    await processVideo();
  } else {
    await processImages();
  }
});

async function processImages() {
  if (selectedFiles.length === 0 || descriptionEl.value.trim() === '') return;

  errorMsg.classList.remove('active');
  formSection.style.display = 'none';
  loadingSection.classList.add('active');
  previewSection.classList.remove('active');

  const steps = ['Uploading images...', 'Generating AI text...', 'Overlaying text on images...', 'Generating preview...'];
  let step = 0;
  const stepInterval = setInterval(() => {
    if (step < steps.length) { loadingText.textContent = steps[step]; step++; }
  }, 3000);

  try {
    const formData = new FormData();
    selectedFiles.forEach(f => formData.append('images', f));
    formData.append('description', descriptionEl.value.trim());
    formData.append('add_text_overlay', addText.checked ? '1' : '0');
    if (isMultiPostMode) formData.append('multi_post', '1');
    if (currentFontSize > 0) formData.append('font_size', currentFontSize.toString());

    const response = await fetch(API_BASE_URL + '/process', { method: 'POST', body: formData });
    clearInterval(stepInterval);

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(errText || 'Server error ' + response.status);
    }

    const data = await response.json();
    showImagePreview(data);

  } catch (err) {
    clearInterval(stepInterval);
    loadingSection.classList.remove('active');
    formSection.style.display = 'block';
    errorMsg.textContent = 'Error: ' + err.message;
    errorMsg.classList.add('active');
  }
}

async function processVideo() {
  if (videoFiles.length === 0) return;

  errorMsg.classList.remove('active');
  formSection.style.display = 'none';
  loadingSection.classList.add('active');
  previewSection.classList.remove('active');

  const totalVideos = videoFiles.length;
  currentVideoResults = [];

  try {
    for (let v = 0; v < totalVideos; v++) {
      const prefix = totalVideos > 1 ? 'Video ' + (v + 1) + ' of ' + totalVideos + ': ' : '';
      const steps = [
        prefix + 'Uploading video...',
        prefix + 'Processing audio cleanup...',
        prefix + 'Transcribing speech...',
        prefix + 'Adding TikTok-style captions...',
        prefix + 'Compressing for mobile...',
        prefix + 'Generating social captions...',
      ];
      let step = 0;
      loadingText.textContent = steps[0];
      const stepInterval = setInterval(() => {
        step++;
        if (step < steps.length) { loadingText.textContent = steps[step]; }
      }, 15000);

      const formData = new FormData();
      formData.append('video', videoFiles[v]);
      if (descriptionEl.value.trim()) {
        formData.append('description', descriptionEl.value.trim());
      }
      if (isSpecialVideoMode) formData.append('special_video', '1');

      const response = await fetch(API_BASE_URL + '/process-video', { method: 'POST', body: formData });
      clearInterval(stepInterval);

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || 'Server error ' + response.status);
      }

      const data = await response.json();
      currentVideoResults.push(data);
    }

    showVideoPreview(currentVideoResults);

  } catch (err) {
    loadingSection.classList.remove('active');
    formSection.style.display = 'block';
    errorMsg.textContent = 'Error: ' + err.message;
    errorMsg.classList.add('active');
  }
}

function showImagePreview(data) {
  loadingSection.classList.remove('active');
  previewSection.classList.add('active');
  postingResults.style.display = 'none';
  regenBtn.disabled = false;
  regenBtn.style.display = 'block';
  postBtn.disabled = false;

  // Store state
  overlayEnabled = data.add_text_overlay || false;
  currentOverlayTexts = data.overlay_texts || [];
  currentPerImageCaptions = data.per_image_captions || [];

  // Set font size from backend
  if (data.font_size_used && data.font_size_used > 0) {
    fontSizeSlider.value = data.font_size_used;
    if (isFontAuto) {
      fontSizeDisplay.textContent = 'Auto (' + data.font_size_used + 'px)';
    } else {
      fontSizeDisplay.textContent = data.font_size_used + 'px';
      currentFontSize = data.font_size_used;
    }
  }

  // Show image preview, hide video preview
  previewImages.style.display = 'grid';
  videoPreviewContainer.style.display = 'none';

  // Render preview images (base64 data URLs)
  previewImages.innerHTML = '';
  for (const img of (data.preview_images || [])) {
    const imgEl = document.createElement('img');
    imgEl.src = img.url;
    imgEl.alt = img.name;
    previewImages.appendChild(imgEl);
  }

  // Overlay text editor
  if (overlayEnabled && currentOverlayTexts.length > 0) {
    overlayEditor.style.display = 'block';
    overlayInputs.innerHTML = '';
    currentOverlayTexts.forEach((text, i) => {
      const group = document.createElement('div');
      group.className = 'overlay-input-group';
      group.innerHTML = '<label>Image ' + (i + 1) + ' text</label>' +
        '<input type="text" id="overlay-text-' + i + '" value="' + text.replace(/"/g, '&quot;') + '">';
      overlayInputs.appendChild(group);
    });
  } else {
    overlayEditor.style.display = 'none';
  }

  captionInputs.innerHTML = '';

  if (data.multi_post && data.per_image_captions) {
    // Multi-post mode: show per-image caption editors
    const platformOrder = ['facebook', 'instagram', 'linkedin', 'pinterest', 'tiktok', 'twitter'];
    data.per_image_captions.forEach((imgCaptions, imgIdx) => {
      const group = document.createElement('div');
      group.className = 'image-caption-group';

      const schedLabel = imgIdx === 0 ? 'Immediate' : '+' + (imgIdx * parseFloat(postInterval.value || 3)) + 'h';
      group.innerHTML = '<h4>Image ' + (imgIdx + 1) + ' (' + schedLabel + ')</h4>';
      captionInputs.appendChild(group);

      for (const plat of platformOrder) {
        if (!(plat in imgCaptions)) continue;
        renderCaptionEditor(plat, imgCaptions[plat], 'caption-' + imgIdx + '-');
      }
    });

    postBtn.textContent = 'Post All Images (Scheduled)';
  } else {
    // Standard carousel/single mode
    const captions = data.platform_captions || {};
    const platformOrder = ['facebook', 'instagram', 'linkedin', 'pinterest', 'tiktok', 'twitter'];
    for (const plat of platformOrder) {
      if (!(plat in captions)) continue;
      renderCaptionEditor(plat, captions[plat]);
    }
    postBtn.textContent = 'Post to All Platforms';
  }
}

function showVideoPreview(results) {
  // results is an array of per-video data objects
  const isMulti = results.length > 1;

  loadingSection.classList.remove('active');
  previewSection.classList.add('active');
  postingResults.style.display = 'none';
  regenBtn.style.display = 'none'; // Can't re-process video
  postBtn.disabled = false;

  // Store state
  currentVideoUrls = results.map(r => r.video_url);
  currentVideoTitles = results.map(r => r.title || '');
  // Keep backward compat for single video
  currentVideoUrl = currentVideoUrls[0];
  currentVideoTitle = currentVideoTitles[0];

  // Show video preview, hide image preview
  previewImages.style.display = 'none';
  videoPreviewContainer.style.display = 'block';
  overlayEditor.style.display = 'none';

  videoPreviewContainer.innerHTML = '';
  captionInputs.innerHTML = '';

  const isSpecial = results[0].special_video;
  const platformOrder = isSpecial
    ? ['youtube']
    : ['facebook', 'instagram', 'linkedin', 'pinterest', 'tiktok', 'twitter', 'youtube'];

  results.forEach((data, vIdx) => {
    // Video player
    let statsHtml = '';
    if (data.processing_time) {
      statsHtml += 'Processed in ' + Math.round(data.processing_time) + 's';
    }

    const videoLabel = isMulti ? '<div style="font-weight:700;font-size:0.85rem;color:#e09f9f;margin-bottom:6px;">Video ' + (vIdx + 1) + '</div>' : '';
    videoPreviewContainer.innerHTML +=
      videoLabel +
      '<video class="preview-video" controls src="' + data.video_url + '"></video>' +
      (statsHtml ? '<div class="video-stats">' + statsHtml + '</div>' : '');

    // Caption editors
    const captions = data.platform_captions || {};
    const idPrefix = isMulti ? 'caption-' + vIdx + '-' : 'caption-';

    if (isMulti) {
      const schedLabel = vIdx === 0 ? 'Immediate' : '+' + (vIdx * parseFloat(postInterval.value || 3)) + 'h';
      const group = document.createElement('div');
      group.className = 'video-caption-group';
      group.innerHTML = '<h4>Video ' + (vIdx + 1) + ' (' + schedLabel + ')</h4>';
      captionInputs.appendChild(group);
    }

    for (const plat of platformOrder) {
      if (!(plat in captions)) continue;
      renderCaptionEditor(plat, captions[plat], idPrefix);
    }
  });

  if (isSpecial) {
    postBtn.textContent = 'Post to YouTube (Unlisted)';
  } else if (isMulti && isMultiPostMode) {
    postBtn.textContent = 'Post All Videos (Scheduled)';
  } else if (isMulti) {
    postBtn.textContent = 'Post All Videos';
  } else {
    postBtn.textContent = 'Post to All Platforms';
  }
}

function renderCaptionEditor(plat, val, idPrefix) {
  idPrefix = idPrefix || 'caption-';
  const limit = PLATFORM_LIMITS[plat] || 5000;
  const group = document.createElement('div');
  group.className = 'caption-group';
  group.innerHTML = '<div class="plat-name">' + plat + '</div>' +
    '<textarea id="' + idPrefix + plat + '">' + val.replace(/</g, '&lt;') + '</textarea>' +
    '<div class="char-count">' + val.length + ' / ' + limit + '</div>';
  captionInputs.appendChild(group);

  const ta = group.querySelector('textarea');
  const cc = group.querySelector('.char-count');
  ta.addEventListener('input', () => {
    const len = ta.value.length;
    cc.textContent = len + ' / ' + limit;
    cc.classList.toggle('over', len > limit);
  });
}

// Re-Generate Preview (images only)
regenBtn.addEventListener('click', async () => {
  regenBtn.disabled = true;
  postBtn.disabled = true;
  loadingSection.classList.add('active');
  previewSection.classList.remove('active');
  loadingText.textContent = 'Re-generating preview...';

  try {
    const overlayTexts = [];
    for (let i = 0; i < currentOverlayTexts.length; i++) {
      const input = document.getElementById('overlay-text-' + i);
      overlayTexts.push(input ? input.value : currentOverlayTexts[i]);
    }

    const formData = new FormData();
    selectedFiles.forEach(f => formData.append('images', f));
    formData.append('overlay_texts', JSON.stringify(overlayTexts));
    formData.append('description', descriptionEl.value.trim());
    if (currentFontSize > 0) formData.append('font_size', currentFontSize.toString());

    const response = await fetch(API_BASE_URL + '/regenerate', { method: 'POST', body: formData });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(errText || 'Server error ' + response.status);
    }

    const data = await response.json();

    loadingSection.classList.remove('active');
    previewSection.classList.add('active');
    regenBtn.disabled = false;
    postBtn.disabled = false;

    currentOverlayTexts = data.overlay_texts || currentOverlayTexts;

    // Update font size display from response
    if (data.font_size_used && data.font_size_used > 0) {
      fontSizeSlider.value = data.font_size_used;
      if (isFontAuto) {
        fontSizeDisplay.textContent = 'Auto (' + data.font_size_used + 'px)';
      } else {
        fontSizeDisplay.textContent = data.font_size_used + 'px';
      }
    }

    previewImages.innerHTML = '';
    for (const img of (data.preview_images || [])) {
      const imgEl = document.createElement('img');
      imgEl.src = img.url;
      imgEl.alt = img.name;
      previewImages.appendChild(imgEl);
    }

    if (overlayEnabled && currentOverlayTexts.length > 0) {
      currentOverlayTexts.forEach((text, i) => {
        const input = document.getElementById('overlay-text-' + i);
        if (input) input.value = text;
      });
    }

  } catch (err) {
    loadingSection.classList.remove('active');
    previewSection.classList.add('active');
    regenBtn.disabled = false;
    postBtn.disabled = false;
    alert('Re-generate failed: ' + err.message);
  }
});

// Helper: get selected video platforms from checkboxes
function getSelectedVideoPlatforms() {
  const checks = document.querySelectorAll('#platform-checkboxes input[type="checkbox"]');
  return Array.from(checks).filter(c => c.checked).map(c => c.value);
}

// Post to All Platforms
postBtn.addEventListener('click', async () => {
  const isMultiVideo = mediaType === 'video' && currentVideoUrls.length > 1;
  const confirmMsg = isMultiVideo && isMultiPostMode
    ? 'Post each video as a separate post (scheduled hours apart)?'
    : isMultiPostMode
      ? 'Post each image as a separate post (scheduled hours apart)?'
      : isSpecialVideoMode
        ? 'Post to YouTube as unlisted?'
        : isMultiVideo
          ? 'Post all ' + currentVideoUrls.length + ' videos to all platforms?'
          : 'Post to all platforms with the current captions?';
  if (!confirm(confirmMsg)) return;

  regenBtn.disabled = true;
  postBtn.disabled = true;
  postBtn.textContent = 'Posting...';
  postingResults.style.display = 'none';

  try {
    let response;

    if (mediaType === 'video') {
      // Video posting — fire-and-forget via /submit-job
      const isMultiVideo = currentVideoUrls.length > 1;
      const platformOrder = isSpecialVideoMode
        ? ['youtube']
        : ['facebook', 'instagram', 'linkedin', 'pinterest', 'tiktok', 'twitter', 'youtube'];

      const intervalHours = parseFloat(postInterval.value || 3);

      // Collect all video data
      const videos = [];
      for (let vIdx = 0; vIdx < currentVideoUrls.length; vIdx++) {
        const idPrefix = isMultiVideo ? 'caption-' + vIdx + '-' : 'caption-';
        const platformCaptions = {};
        for (const plat of platformOrder) {
          const ta = document.getElementById(idPrefix + plat);
          if (ta) platformCaptions[plat] = ta.value;
        }
        videos.push({
          video_url: currentVideoUrls[vIdx],
          title: currentVideoTitles[vIdx],
          platform_captions: platformCaptions,
        });
      }

      const jobBody = {
        job_type: 'video',
        videos: videos,
        interval_hours: intervalHours,
        multi_post: isMultiVideo && isMultiPostMode,
      };

      if (isSpecialVideoMode) {
        jobBody.platforms = ['youtube'];
        jobBody.youtube_privacy = 'unlisted';
      } else {
        const selectedPlats = getSelectedVideoPlatforms();
        if (selectedPlats.length < 7) {
          jobBody.platforms = selectedPlats;
        }
      }

      const jobResp = await fetch(API_BASE_URL + '/submit-video-job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(jobBody),
      });
      if (!jobResp.ok) { const errText = await jobResp.text(); throw new Error(errText || 'Server error'); }
      const jobData = await jobResp.json();
      saveJob(jobData.job_id, (currentVideoTitles[0] || 'Video post').substring(0, 40));
      previewSection.classList.remove('active');
      regenBtn.disabled = false;
      postBtn.disabled = false;
      postBtn.textContent = 'Post to All Platforms';
      pollJob(jobData.job_id);
      return;

    } else if (isMultiPostMode && currentPerImageCaptions.length > 0) {
      // Multi-post mode: fire-and-forget via /submit-job
      const platformOrder = ['facebook', 'instagram', 'linkedin', 'pinterest', 'tiktok', 'twitter'];

      const perImageCaptions = [];
      for (let imgIdx = 0; imgIdx < currentPerImageCaptions.length; imgIdx++) {
        const caps = {};
        for (const plat of platformOrder) {
          const ta = document.getElementById('caption-' + imgIdx + '-' + plat);
          if (ta) caps[plat] = ta.value;
        }
        perImageCaptions.push(caps);
      }

      const overlayTexts = [];
      for (let i = 0; i < currentOverlayTexts.length; i++) {
        const input = document.getElementById('overlay-text-' + i);
        overlayTexts.push(input ? input.value : currentOverlayTexts[i]);
      }

      const formData = new FormData();
      selectedFiles.forEach(f => formData.append('images', f));
      formData.append('per_image_captions', JSON.stringify(perImageCaptions));
      formData.append('overlay_texts', JSON.stringify(overlayTexts));
      formData.append('add_text_overlay', overlayEnabled ? '1' : '0');
      formData.append('interval_hours', postInterval.value || '3');
      formData.append('job_type', 'multi');
      if (currentFontSize > 0) formData.append('font_size', currentFontSize.toString());

      const jobResp = await fetch(API_BASE_URL + '/submit-job', { method: 'POST', body: formData });
      if (!jobResp.ok) { const errText = await jobResp.text(); throw new Error(errText || 'Server error'); }
      const jobData = await jobResp.json();
      saveJob(jobData.job_id, descriptionEl.value.trim());
      previewSection.classList.remove('active');
      pollJob(jobData.job_id);
      return;
    } else {
      // Standard image posting (carousel or single) — fire-and-forget via /submit-job
      const platformCaptions = {};
      const platformOrder = ['facebook', 'instagram', 'linkedin', 'pinterest', 'tiktok', 'twitter'];
      for (const plat of platformOrder) {
        const ta = document.getElementById('caption-' + plat);
        if (ta) platformCaptions[plat] = ta.value;
      }

      const overlayTexts = [];
      for (let i = 0; i < currentOverlayTexts.length; i++) {
        const input = document.getElementById('overlay-text-' + i);
        overlayTexts.push(input ? input.value : currentOverlayTexts[i]);
      }

      const formData = new FormData();
      selectedFiles.forEach(f => formData.append('images', f));
      formData.append('platform_captions', JSON.stringify(platformCaptions));
      formData.append('overlay_texts', JSON.stringify(overlayTexts));
      formData.append('add_text_overlay', overlayEnabled ? '1' : '0');
      formData.append('job_type', 'standard');
      if (currentFontSize > 0) formData.append('font_size', currentFontSize.toString());

      const jobResp = await fetch(API_BASE_URL + '/submit-job', { method: 'POST', body: formData });
      if (!jobResp.ok) { const errText = await jobResp.text(); throw new Error(errText || 'Server error'); }
      const jobData = await jobResp.json();
      saveJob(jobData.job_id, descriptionEl.value.trim());
      previewSection.classList.remove('active');
      pollJob(jobData.job_id);
      return;
    }

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(errText || 'Server error ' + response.status);
    }

    const data = await response.json();

    postingResults.style.display = 'block';
    resultList.innerHTML = '';

    if (data.multi_post && data.results) {
      // Multi-post results: show per-image results
      for (const imgResult of data.results) {
        const imgIdx = imgResult.image_index;
        const schedLabel = imgResult.scheduled_time
          ? 'Scheduled: ' + new Date(imgResult.scheduled_time).toLocaleString()
          : 'Posted immediately';

        const header = document.createElement('div');
        header.style.cssText = 'font-weight:700;font-size:0.85rem;margin-top:12px;margin-bottom:4px;color:#e09f9f;';
        header.textContent = 'Image ' + (imgIdx + 1) + ' — ' + schedLabel;
        resultList.appendChild(header);

        const results = imgResult.platform_results || {};
        for (const [platform, result] of Object.entries(results)) {
          const div = document.createElement('div');
          div.classList.add('result-item');
          const ok = result.success;
          const statusClass = imgResult.scheduled_time ? (ok ? 'scheduled' : 'failed') : (ok ? 'success' : 'failed');
          const statusText = imgResult.scheduled_time ? (ok ? 'Scheduled' : 'Failed') : (ok ? 'Posted' : 'Failed');
          let errorHtml = '';
          if (!ok && result.error) {
            errorHtml = '<div class="error-detail">' + (result.error || '').substring(0, 150).replace(/</g, '&lt;') + '</div>';
          }
          div.innerHTML = '<div><span class="platform">' + platform + '</span>' + errorHtml + '</div>' +
            '<span class="status ' + statusClass + '">' + statusText + '</span>';
          resultList.appendChild(div);
        }
      }
    } else {
      // Standard results
      const results = data.platform_results || {};
      for (const [platform, result] of Object.entries(results)) {
        const div = document.createElement('div');
        div.classList.add('result-item');
        const ok = result.success;
        let errorHtml = '';
        if (!ok && result.error) {
          errorHtml = '<div class="error-detail">' + (result.error || '').substring(0, 150).replace(/</g, '&lt;') + '</div>';
        }
        div.innerHTML = '<div><span class="platform">' + platform + '</span>' + errorHtml + '</div>' +
          '<span class="status ' + (ok ? 'success' : 'failed') + '">' +
          (ok ? 'Posted' : 'Failed') + '</span>';
        resultList.appendChild(div);
      }
    }

  } catch (err) {
    alert('Posting failed: ' + err.message);
  } finally {
    regenBtn.disabled = false;
    postBtn.disabled = false;
    postBtn.textContent = 'Post to All Platforms';
  }
});

// Start Over
resetBtn.addEventListener('click', () => {
  previewSection.classList.remove('active');
  formSection.style.display = 'block';
  selectedFiles = [];
  videoFiles = [];
  mediaType = null;
  currentOverlayTexts = [];
  overlayEnabled = false;
  currentVideoUrl = null;
  currentVideoTitle = null;
  currentVideoResults = [];
  currentVideoUrls = [];
  currentVideoTitles = [];
  isMultiPostMode = false;
  isSpecialVideoMode = false;
  currentPerImageCaptions = [];
  currentFontSize = 0;
  isFontAuto = true;
  fontSizeDisplay.textContent = 'Auto';
  fontAutoBtn.classList.add('active');

  previewsThumbs.innerHTML = '';
  videoUploadPreview.style.display = 'none';
  videoUploadPreview.innerHTML = '';
  fileCount.textContent = '';
  reorderHint.style.display = 'none';

  // Reset toggles
  multiPostToggle.checked = false;
  intervalRow.style.display = 'none';
  multiPostSection.classList.remove('active');
  specialVideoToggle.checked = false;
  videoModeSection.classList.remove('active');
  platformCheckboxes.classList.add('active');

  // Reset platform checkboxes to all checked
  document.querySelectorAll('#platform-checkboxes input[type="checkbox"]').forEach(c => { c.checked = true; });

  // Reset UI to default (image mode)
  textOverlayRow.style.display = 'flex';
  descriptionEl.placeholder = "Describe what's in the image(s). AI will use this to generate on-screen text and captions.";
  descriptionLabel.textContent = 'Description';
  submitBtn.textContent = 'Generate Preview';

  descriptionEl.value = '';
  submitBtn.disabled = true;
  imageFileInput.value = '';
  videoFileInput.value = '';
  updateDropzoneStates();
  postingResults.style.display = 'none';
});
