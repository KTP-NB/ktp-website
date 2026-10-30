const ACTIVE_STATUS = 'active';
const APPLICATION_PAGE_SIZE = 1000;

export async function fetchMonthlyApplications(service, start, end) {
  const rows = [];
  for (let offset = 0; ; offset += APPLICATION_PAGE_SIZE) {
    const { data, error } = await service
      .from('internship_applications')
      .select('id,user_id,status')
      .gte('date_applied', start)
      .lt('date_applied', end)
      .order('id', { ascending: true })
      .range(offset, offset + APPLICATION_PAGE_SIZE - 1);
    if (error) return { data: null, error };
    rows.push(...(data || []));
    if (!data || data.length < APPLICATION_PAGE_SIZE) break;
  }
  return { data: rows, error: null };
}

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

export function isApplicationFineEligible({ member, target, submitted }) {
  return Boolean(
    member?.user_id
      && isActiveStatus(member.member_status)
      && member.uses_default_application_target
      && Number(target) > 0
      && Number(submitted || 0) < Number(target),
  );
}

export function applicationFineCandidates({ members, countsByUser, overridesByUser, chapterDefault }) {
  return members.flatMap((member) => {
    const target = effectiveApplicationTarget(member, overridesByUser.get(member.user_id), chapterDefault);
    const submitted = Number(countsByUser.get(member.user_id) || 0);
    if (!isApplicationFineEligible({ member, target, submitted })) return [];
    return [{ member, target, submitted }];
  });
}

export function applicationFineAmount(previousViolations) {
  const count = Math.max(0, Math.trunc(Number(previousViolations) || 0));
  return Math.min(5 + count * 5, 20);
}

export function potentialApplicationFineAmount({ member, target, submitted, previousViolations }) {
  return isApplicationFineEligible({ member, target, submitted })
    ? applicationFineAmount(previousViolations)
    : 0;
}

export function applicationViolationLabel(violationNumber) {
  const number = Math.max(1, Math.trunc(Number(violationNumber) || 1));
  const remainder100 = number % 100;
  const remainder10 = number % 10;
  const suffix = remainder100 >= 11 && remainder100 <= 13
    ? 'th'
    : remainder10 === 1
      ? 'st'
      : remainder10 === 2
        ? 'nd'
        : remainder10 === 3
          ? 'rd'
          : 'th';
  return `${number}${suffix} violation`;
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
  const [settingResult, membersResult, appsResult, overridesResult, priorFinesResult] = await Promise.all([
    service.from('chapter_application_requirements').select('default_target').eq('month_start', start).maybeSingle(),
    service.from('member_profiles').select('id,user_id,name,member_status,default_application_target,uses_default_application_target').not('user_id', 'is', null),
    fetchMonthlyApplications(service, start, end),
    service.from('application_requirements').select('user_id,target_count').eq('month_start', start),
    service.from('member_fines').select('member_id').not('application_requirement_month', 'is', null).lt('application_requirement_month', start),
  ]);
  const error = settingResult.error || membersResult.error || appsResult.error || overridesResult.error || priorFinesResult.error;
  if (error) throw error;

  const chapterDefault = Number(settingResult.data?.default_target ?? 40);

  const countsByUser = new Map();
  for (const app of appsResult.data || []) countsByUser.set(app.user_id, (countsByUser.get(app.user_id) || 0) + 1);
  const overridesByUser = new Map((overridesResult.data || []).map((row) => [row.user_id, row.target_count]));
  const priorViolationsByMember = new Map();
  for (const fine of priorFinesResult.data || []) {
    priorViolationsByMember.set(fine.member_id, (priorViolationsByMember.get(fine.member_id) || 0) + 1);
  }
  const candidates = applicationFineCandidates({
    members: membersResult.data || [],
    countsByUser,
    overridesByUser,
    chapterDefault,
  });
  if (candidates.length === 0) return { month, eligible: 0, created: 0, total_assessed: 0 };

  const monthLabel = new Date(`${start}T12:00:00Z`).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
  const rows = candidates.map(({ member, target, submitted }) => {
    const previousViolations = priorViolationsByMember.get(member.id) || 0;
    const violationNumber = previousViolations + 1;
    return {
      member_id: member.id,
      date_issued: end,
      description: `${monthLabel} Application Requirement`,
      amount: applicationFineAmount(previousViolations),
      paid: false,
      notes: `Automatically assessed: ${submitted} of ${target} required applications submitted; ${applicationViolationLabel(violationNumber)}.`,
      created_by: createdBy,
      application_requirement_month: start,
    };
  });
  const { data, error: insertError } = await service
    .from('member_fines')
    .upsert(rows, { onConflict: 'member_id,application_requirement_month', ignoreDuplicates: true })
    .select('id,amount');
  if (insertError) throw insertError;
  return {
    month,
    eligible: candidates.length,
    created: data?.length || 0,
    total_assessed: (data || []).reduce((sum, fine) => sum + Number(fine.amount || 0), 0),
  };
}
