import { headers } from 'next/headers';
import CodeRankClient from './CodeRankClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';
export const runtime = 'nodejs';

export default function CodeRankPage() {
  // Touch a dynamic API so this segment is never statically prerendered.
  headers();
  return <CodeRankClient />;
}
