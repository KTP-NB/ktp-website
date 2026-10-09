import nodemailer from 'nodemailer';

export function formatDigestEmail(payload, siteUrl) {
  const origin = new URL(siteUrl).origin;
  const sections = [
    ['New jobs', payload.newJobs || []],
    ['Saved jobs to apply to', payload.savedToApply || []],
  ];
  const lines = ['Your KTP Job Board update', '', payload.suggested?.length ? '' : (payload.summary || ''), ''];
  for (const [heading, jobs] of sections) {
    if (!jobs.length) continue;
    lines.push(`${heading}:`);
    for (const job of jobs) {
      lines.push(`- ${job.title} at ${job.company}: ${origin}/job-board/jobs/${job.id}`);
    }
    lines.push('');
  }
  lines.push(`Notification preferences: ${origin}/job-board/settings`);
  return lines.join('\n');
}

export function emailConfiguration(env) {
  if (env.JOB_BOARD_EMAIL_SEND_ENABLED !== 'true') return null;
  const sender = env.GMAIL_SMTP_USER?.trim();
  const password = env.GMAIL_SMTP_APP_PASSWORD?.trim();
  const siteUrl = env.JOB_BOARD_SITE_URL?.trim();
  const allowlist = new Set((env.JOB_BOARD_EMAIL_ALLOWLIST || '').split(',').map((email) => email.trim().toLowerCase()).filter(Boolean));
  if (!sender || !password || !siteUrl || !allowlist.size) throw new Error('Job Board email is enabled without sender, app password, site URL, or recipient allowlist.');
  if (new URL(siteUrl).protocol !== 'https:') throw new Error('Job Board email site URL must use HTTPS.');
  return { sender, password, siteUrl, allowlist };
}

export async function deliverQueuedDigests(service, { env = process.env, send = sendGmail, batchSize = 3 } = {}) {
  const config = emailConfiguration(env);
  if (!config) return { disabled: true, processed: 0, sent: 0 };

  const { data: queue, error: claimError } = await service.rpc('job_board_claim_notification_queue', { p_limit: batchSize });
  if (claimError) throw claimError;
  let sent = 0;
  for (const item of queue || []) {
    let status = 'skipped';
    let errorMessage = null;
    try {
      const { data: preference, error: prefError } = await service.from('job_board_notification_preferences')
        .select('email_enabled').eq('user_id', item.user_id).maybeSingle();
      if (prefError) throw prefError;
      if (!preference?.email_enabled) {
        errorMessage = 'Member opted out before delivery';
      } else {
        const { data: userData, error: userError } = await service.auth.admin.getUserById(item.user_id);
        if (userError) throw userError;
        const recipient = userData?.user?.email?.trim().toLowerCase();
        if (!recipient || (!config.allowlist.has('*') && !config.allowlist.has(recipient))) {
          errorMessage = 'Recipient is not on the beta allowlist';
        } else {
          await send(config, {
            to: recipient,
            subject: item.subject,
            text: formatDigestEmail(item.payload, config.siteUrl),
          });
          status = 'sent';
          sent += 1;
        }
      }
    } catch (error) {
      status = 'failed';
      errorMessage = String(error.message || error).slice(0, 500);
    }

    const scheduledAt = status === 'failed'
      ? new Date(Date.now() + Math.min(60, 5 * 2 ** Math.max(0, item.attempts - 1)) * 60000).toISOString()
      : item.scheduled_at;
    const { error: updateError } = await service.from('job_board_notification_queue').update({
      status,
      scheduled_at: scheduledAt,
      locked_until: null,
      last_error: errorMessage,
      sent_at: status === 'sent' ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    }).eq('id', item.id);
    if (updateError) throw updateError;

    const { error: deliveryError } = await service.from('job_board_notification_deliveries').insert({
      queue_id: item.id,
      user_id: item.user_id,
      provider: 'gmail_smtp',
      status,
      error_message: errorMessage,
    });
    if (deliveryError) throw deliveryError;
  }
  return { processed: (queue || []).length, sent };
}

async function sendGmail(config, message) {
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com', port: 587, secure: false, requireTLS: true,
    connectionTimeout: 6000, greetingTimeout: 6000, socketTimeout: 6000,
    auth: { user: config.sender, pass: config.password },
  });
  try {
    await transporter.sendMail({ from: config.sender, ...message });
  } finally {
    transporter.close();
  }
}
