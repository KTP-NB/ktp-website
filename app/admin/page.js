import { headers } from 'next/headers';
import AdminPortalClient from './AdminPortalClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';
export const runtime = 'nodejs';

export default function AdminPortalPage() {
  headers();
  return <AdminPortalClient />;
}
