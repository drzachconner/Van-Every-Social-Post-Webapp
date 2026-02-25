import type { SavedJob } from './types';

const STORAGE_KEY = 've_jobs';
const MAX_JOBS = 20;
const STALE_MINUTES = 30;

export function getSavedJobs(): SavedJob[] {
  if (typeof window === 'undefined') return [];
  try {
    const jobs: SavedJob[] = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    let changed = false;
    const now = Date.now();
    for (const job of jobs) {
      if (
        (job.status === 'pending' || job.status === 'processing') &&
        now - new Date(job.time).getTime() > STALE_MINUTES * 60 * 1000
      ) {
        job.status = 'failed';
        changed = true;
      }
    }
    if (changed) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs));
    }
    return jobs;
  } catch {
    return [];
  }
}

export function saveJob(jobId: string, description: string): void {
  const jobs = getSavedJobs();
  jobs.unshift({
    id: jobId,
    desc: description,
    time: new Date().toISOString(),
    status: 'pending',
  });
  if (jobs.length > MAX_JOBS) jobs.length = MAX_JOBS;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs));
}

export function updateJobStatus(jobId: string, status: string): void {
  const jobs = getSavedJobs();
  const job = jobs.find(j => j.id === jobId);
  if (job) {
    job.status = status;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs));
  }
}
