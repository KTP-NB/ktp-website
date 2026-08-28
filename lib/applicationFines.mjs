const ACTIVE_STATUS = 'active';

export function isActiveStatus(status) {
  return String(status || '').trim().toLowerCase() === ACTIVE_STATUS;
}

export function effectiveApplicationTarget(member, monthlyOverride, chapterDefault) {
  if (!isActiveStatus(member.member_status)) return 0;
  if (monthlyOverride !== undefined && monthlyOverride !== null) return Number(monthlyOverride);
  return member.uses_default_application_target
    ? Number(chapterDefault)
    : Number(member.default_application_target ?? 40);
}

export function applicationFineCandidates({ members, countsByUser, overridesByUser, chapterDefault }) {
  return members.flatMap((member) => {
    // A persistent custom baseline is a personal goal, never a chapter fine obligation.
    if (!member.user_id || !isActiveStatus(member.member_status) || !member.uses_default_application_target) return [];
    const target = effectiveApplicationTarget(member, overridesByUser.get(member.user_id), chapterDefault);
    const submitted = Number(countsByUser.get(member.user_id) || 0);
    if (target <= 0 || submitted >= target) return [];
    return [{ member, target, submitted }];
  });
}

export function previousMonthInTimeZone(now = new Date(), timeZone = 'America/New_York') {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  if (value.day !== '01') return null;
  const current = new Date(Date.UTC(Number(value.year), Number(value.month) - 1, 1));
  current.setUTCMonth(current.getUTCMonth() - 1);
  return current.toISOString().slice(0, 7);
}

export function currentMonthInTimeZone(now = new Date(), timeZone = 'America/New_York') {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(now);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}`;
}

function monthBounds(month) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month || '')) throw new Error('A valid month is required.');
  const start = `${month}-01`;
  const endDate = new Date(`${start}T00:00:00Z`);
  endDate.setUTCMonth(endDate.getUTCMonth() + 1);
  return { start, end: endDate.toISOString().slice(0, 10) };
}

export async function processApplicationRequirementFines(service, month, createdBy = null) {
  const { start, end } = monthBounds(month);
  if (month >= currentMonthInTimeZone()) throw new Error('Fines can only be processed after the selected month has ended.');
  const [settingResult, membersResult, appsResult, overridesResult] = await Promise.all([
    service.from('chapter_application_requirements').select('default_target,fine_amount').eq('month_start', start).maybeSingle(),
    service.from('member_profiles').select('id,user_id,name,member_status,default_application_target,uses_default_application_target').not('user_id', 'is', null),
    service.from('internship_applications').select('user_id').gte('date_applied', start).lt('date_applied', end),
    service.from('application_requirements').select('user_id,target_count').eq('month_start', start),
  ]);
  const error = settingResult.error || membersResult.error || appsResult.error || overridesResult.error;
  if (error) throw error;

  const fineAmount = Number(settingResult.data?.fine_amount ?? 0);
  const chapterDefault = Number(settingResult.data?.default_target ?? 40);
  if (fineAmount <= 0) return { month, fine_amount: fineAmount, eligible: 0, created: 0, skipped: 'fine-disabled' };

  const countsByUser = new Map();
  for (const app of appsResult.data || []) countsByUser.set(app.user_id, (countsByUser.get(app.user_id) || 0) + 1);
  const overridesByUser = new Map((overridesResult.data || []).map((row) => [row.user_id, row.target_count]));
  const candidates = applicationFineCandidates({
    members: membersResult.data || [],
    countsByUser,
    overridesByUser,
    chapterDefault,
  });
  if (candidates.length === 0) return { month, fine_amount: fineAmount, eligible: 0, created: 0 };

  const monthLabel = new Date(`${start}T12:00:00Z`).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
  const rows = candidates.map(({ member, target, submitted }) => ({
    member_id: member.id,
    date_issued: end,
    description: `${monthLabel} Application Requirement`,
    amount: fineAmount,
    paid: false,
    notes: `Automatically assessed: ${submitted} of ${target} required applications submitted.`,
    created_by: createdBy,
    application_requirement_month: start,
  }));
  const { data, error: insertError } = await service
    .from('member_fines')
    .upsert(rows, { onConflict: 'member_id,application_requirement_month', ignoreDuplicates: true })
    .select('id');
  if (insertError) throw insertError;
  return { month, fine_amount: fineAmount, eligible: candidates.length, created: data?.length || 0 };
}
