import JobDetailClient from './JobDetailClient';

export default function JobDetailPage({ params }) {
  return <JobDetailClient jobId={params.id} />;
}
