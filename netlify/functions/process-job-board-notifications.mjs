import { createClient } from '@supabase/supabase-js';
import { generateDigestNotifications } from '../../lib/job-board/notifications.js';
import { deliverQueuedDigests } from '../../lib/job-board/emailDelivery.mjs';

export default async () => {
  if (Netlify.env.get('JOB_BOARD_NOTIFICATIONS_ENABLED') !== 'true') {
    return Response.json({ disabled: true });
  }
  const url = Netlify.env.get('NEXT_PUBLIC_SUPABASE_URL');
  const key = Netlify.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) return Response.json({ error: 'Supabase credentials are not configured.' }, { status: 500 });
  const service = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  const now = new Date();
  let digest;
  let email;
  try {
    digest = await generateDigestNotifications(service, { now, shard: { index: now.getUTCHours(), count: 24 } });
  } catch (error) {
    console.error('Job Board digest generation failed:', error);
    digest = { error: error.message };
  }
  try {
    email = await deliverQueuedDigests(service, { env: {
      JOB_BOARD_EMAIL_SEND_ENABLED: Netlify.env.get('JOB_BOARD_EMAIL_SEND_ENABLED'),
      GMAIL_SMTP_USER: Netlify.env.get('GMAIL_SMTP_USER'),
      GMAIL_SMTP_APP_PASSWORD: Netlify.env.get('GMAIL_SMTP_APP_PASSWORD'),
      JOB_BOARD_SITE_URL: Netlify.env.get('JOB_BOARD_SITE_URL'),
      JOB_BOARD_EMAIL_ALLOWLIST: Netlify.env.get('JOB_BOARD_EMAIL_ALLOWLIST'),
    } });
  } catch (error) {
    console.error('Job Board email delivery failed:', error.message);
    email = { error: error.message };
  }
  return Response.json({ digest, email });
};

export const config = { schedule: '*/15 * * * *' };
