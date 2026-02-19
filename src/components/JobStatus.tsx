'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { fetchJobStatus } from '@/lib/api';
import { updateJobStatus } from '@/lib/jobs';
import type { JobData, PlatformResult } from '@/lib/types';

interface JobStatusProps {
  jobId: string;
  onReset: () => void;
  onJobUpdate: () => void;
}

const STATUS_MESSAGES: Record<string, string> = {
  pending: 'Queued...',
  processing: 'Processing images...',
  uploading: 'Uploading to hosting...',
  posting: 'Posting to platforms...',
};

function PlatformResultItem({ platform, result }: { platform: string; result: PlatformResult }) {
  return (
    <div className="result-item">
      <div>
        <span className="platform">{platform}</span>
        {!result.success && result.error && (
          <div className="error-detail">
            {result.error.substring(0, 150)}
          </div>
        )}
      </div>
      <span className={`status ${result.success ? 'success' : 'failed'}`}>
        {result.success ? 'Posted' : 'Failed'}
      </span>
    </div>
  );
}

export function JobStatus({ jobId, onReset, onJobUpdate }: JobStatusProps) {
  const [jobData, setJobData] = useState<JobData | null>(null);
  const [statusMessage, setStatusMessage] = useState('Job submitted! Processing in background...');
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollingRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const poll = useCallback(async () => {
    try {
      const data = await fetchJobStatus(jobId);
      const status = data.status || 'pending';
      updateJobStatus(jobId, status);
      onJobUpdate();

      if (status === 'done' || status === 'failed') {
        setJobData(data);
        setIsComplete(true);
        setStatusMessage(status === 'done' ? 'Job complete!' : 'Job failed');
        return;
      }

      setStatusMessage(STATUS_MESSAGES[status] || 'Working...');
      pollingRef.current = setTimeout(poll, 5000);
    } catch {
      setError('Error checking status');
    }
  }, [jobId, onJobUpdate]);

  useEffect(() => {
    poll();
    return () => {
      if (pollingRef.current) clearTimeout(pollingRef.current);
    };
  }, [poll]);

  const renderResults = () => {
    if (!jobData) return null;

    if (jobData.multi_post && jobData.results) {
      return (
        <div>
          <h3 className="text-[0.9rem] mb-2.5">Posting Results</h3>
          {jobData.results.map((item, idx) => {
            const itemIdx = item.video_index !== undefined ? item.video_index : item.image_index;
            const label = item.video_index !== undefined ? 'Video' : 'Image';
            const schedLabel = item.scheduled_time ? ' (Scheduled)' : ' (Immediate)';

            return (
              <div key={idx}>
                <div className="font-bold text-[0.85rem] mt-3 mb-1 text-brand-pink">
                  {label} {(itemIdx ?? 0) + 1}{schedLabel}
                </div>
                {Object.entries(item.platform_results || {}).map(([platform, result]) => (
                  <PlatformResultItem key={platform} platform={platform} result={result} />
                ))}
              </div>
            );
          })}
        </div>
      );
    }

    if (jobData.platform_results) {
      return (
        <div>
          <h3 className="text-[0.9rem] mb-2.5">Posting Results</h3>
          {Object.entries(jobData.platform_results).map(([platform, result]) => (
            <PlatformResultItem key={platform} platform={platform} result={result} />
          ))}
        </div>
      );
    }

    if (jobData.error) {
      return <div className="error-msg active">{jobData.error}</div>;
    }

    return null;
  };

  return (
    <div className="job-status-section active">
      <div className="card">
        <div>
          <div
            className="job-pending-msg"
            style={{
              color: isComplete
                ? jobData?.status === 'done' ? '#2e7d32' : '#c62828'
                : undefined,
            }}
          >
            {error || statusMessage}
          </div>
          {!isComplete && !error && (
            <p className="text-[#888] text-[0.9rem] mb-2">
              You can close this page. Come back anytime to check status.
            </p>
          )}
          {!isComplete && !error && <div className="spinner" />}
        </div>
        {isComplete && renderResults()}
        <div className="job-id-display">Job: {jobId}</div>
        <button className="reset-btn mt-4" onClick={onReset}>
          Start New Post
        </button>
      </div>
    </div>
  );
}
