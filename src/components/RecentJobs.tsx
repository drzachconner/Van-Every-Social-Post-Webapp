'use client';

import type { SavedJob } from '@/lib/types';

interface RecentJobsProps {
  jobs: SavedJob[];
  onJobClick: (jobId: string) => void;
  maxItems?: number;
}

export function RecentJobs({ jobs, onJobClick, maxItems = 10 }: RecentJobsProps) {
  if (jobs.length === 0) return null;

  return (
    <div className="card recent-jobs">
      <h4>Recent Jobs</h4>
      {jobs.slice(0, maxItems).map(job => (
        <div
          key={job.id}
          className="recent-job-item"
          onClick={() => onJobClick(job.id)}
        >
          <div>
            <div>{(job.desc || 'Post').substring(0, 40)}</div>
            <div className="job-time">{new Date(job.time).toLocaleString()}</div>
          </div>
          <span className={`job-status-badge ${job.status || 'pending'}`}>
            {job.status || 'pending'}
          </span>
        </div>
      ))}
    </div>
  );
}
