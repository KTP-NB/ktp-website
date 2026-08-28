import { createClient } from '@supabase/supabase-js';
import { previousMonthInTimeZone, processApplicationRequirementFines } from '../../lib/applicationFines.mjs';

export default async () => {
  const month = previousMonthInTimeZone();
  if (!month) return new Response('Not the first day in America/New_York; nothing to process.', { status: 200 });
  const url = Netlify.env.get('NEXT_PUBLIC_SUPABASE_URL');
  const key = Netlify.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) return new Response('Supabase credentials are not configured.', { status: 500 });
  const service = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  const result = await processApplicationRequirementFines(service, month);
  return Response.json(result);
};

export const config = { schedule: '0 6 * * *' };
