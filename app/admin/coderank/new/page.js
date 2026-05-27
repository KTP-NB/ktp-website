import { headers } from 'next/headers';
import NewAssessmentClient from './NewAssessmentClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';
export const runtime = 'nodejs';

export default function NewAssessmentPage() {
  headers();
  return <NewAssessmentClient />;
}
