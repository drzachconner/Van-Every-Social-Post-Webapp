import type { SavedJob } from './types';

const STORAGE_KEY = 've_jobs';
const MAX_JOBS = 20;

export function getSavedJobs(): SavedJob[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
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
