import { redirect } from 'next/navigation';
import { isJobBoardJobId } from '@/lib/job-board/trackerBridge';

export default function LegacyApplicationsPage({ searchParams }) {
  const jobId = searchParams?.jobBoardJob;
  const suffix = isJobBoardJobId(jobId) ? `?jobBoardJob=${encodeURIComponent(jobId)}` : '';
  redirect(`/job-board/applications${suffix}`);
}
