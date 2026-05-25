import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/coderank/auth';
import { getServiceClient } from '@/lib/coderank/supabaseServer';

export const dynamic = 'force-dynamic';

/**
 * Per-member detailed results for one assessment.
 * Returns: attempt status + each question's best submission + counts.
 */
export async function GET(request, { params }) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;

  const service = getServiceClient();

  const { data: assessment, error: aErr } = await service
    .from('cr_assessments')
    .select(`
      id, title, description, time_limit_minutes, max_submissions_per_question, published, publish_at, due_at, randomize_question_order, random_question_count, random_question_difficulties, random_question_categories,
      cr_assessment_questions ( question_id, ordinal, points, cr_questions(slug,title,difficulty,function_metadata,use_runtime_harness) ),
      cr_assignments ( id, assigned_to_type, assigned_to_value )
    `)
    .eq('id', params.id)
    .maybeSingle();
  if (aErr) return NextResponse.json({ error: aErr.message }, { status: 500 });
  if (!assessment) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { data: attempts, error: atErr } = await service
    .from('cr_attempts')
    .select('id, user_id, started_at, expires_at, submitted_at, status, question_order')
    .eq('assessment_id', params.id);
  if (atErr) return NextResponse.json({ error: atErr.message }, { status: 500 });
  const attemptRows = attempts || [];

  const { data: allProfiles, error: pErr } = await service
    .from('member_profiles')
    .select('user_id, name, email, pledge_class, member_status')
    .order('name');
  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 });

  const activeProfiles = (allProfiles || []).filter((p) => {
    const status = String(p.member_status || '').trim().toLowerCase();
    return p.user_id && status !== 'alumni' && status !== 'inactive';
  });
  const profilesById = new Map(activeProfiles.map((p) => [p.user_id, p]));
  const assignedUserIds = assignedUsersForAssessment(assessment, activeProfiles);
  for (const att of attemptRows) {
    if (att.user_id) assignedUserIds.add(att.user_id);
  }

  const attemptIds = attemptRows.map((a) => a.id);
  let submissions = [];
  if (attemptIds.length) {
    const { data: subs, error: sErr } = await service
      .from('cr_submissions')
      .select(`
        id, attempt_id, question_id, user_id, language,
        submitted_at, visible_tests_passed, visible_tests_total,
        hidden_tests_passed, hidden_tests_total, total_passed, total_tests,
        score, runtime_ms, memory_kb, status, code, test_results, error_output
      `)
      .in('attempt_id', attemptIds)
      .order('submitted_at', { ascending: false });
    if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 });
    submissions = subs || [];
  }

  const submittedQuestionIds = [...new Set(submissions.map((s) => s.question_id).filter(Boolean))];
  if (submittedQuestionIds.length) {
    const { data: tests, error: tErr } = await service
      .from('cr_test_cases')
      .select('id, question_id, stdin, expected_stdout, is_hidden, ordinal')
      .in('question_id', submittedQuestionIds);
    if (tErr) return NextResponse.json({ error: tErr.message }, { status: 500 });
    submissions = hydrateAdminTestResults(submissions, tests || []);
  }

  let monitoringEvents = [];
  if (attemptIds.length) {
    const { data: events, error: mErr } = await service
      .from('cr_monitoring_events')
      .select('id, attempt_id, user_id, event_type, created_at, metadata')
      .in('attempt_id', attemptIds)
      .order('created_at', { ascending: false });
    if (mErr) return NextResponse.json({ error: mErr.message }, { status: 500 });
    monitoringEvents = events || [];
  }

  const questionsById = new Map((assessment.cr_assessment_questions || []).map((q) => [q.question_id, q]));

  const attemptsByUser = new Map(attemptRows.map((att) => [att.user_id, att]));
  const rows = [...assignedUserIds].map((userId) => {
    const att = attemptsByUser.get(userId);
    if (!att) {
      const attemptQuestions = assessment.cr_assessment_questions || [];
      const possible = attemptQuestions.reduce((s, q) => s + (q.points || 0), 0);
      return {
        attempt_id: null,
        user_id: userId,
        profile: profilesById.get(userId) || null,
        started_at: null,
        expires_at: null,
        submitted_at: null,
        status: 'not_started',
        question_order: attemptQuestions.map((q) => q.question_id),
        time_taken_seconds: null,
        total_score: 0,
        possible_score: possible,
        questions_completed: 0,
        questions_total: attemptQuestions.length,
        monitoring: { left_count: 0, events: [] },
        per_question: {},
      };
    }

    const subs = submissions.filter((s) => s.attempt_id === att.id);
    const monitor = monitoringEvents
      .filter((e) => e.attempt_id === att.id)
      .filter((e) => e.event_type === 'left_tab' || e.event_type === 'returned_to_tab');
    const leftCount = monitor.filter((e) => e.event_type === 'left_tab').length;
    const byQuestion = {};
    for (const s of subs) {
      const cur = byQuestion[s.question_id];
      // Track best (highest score) and the count of attempts for this question
      if (!cur || s.score > cur.best.score) {
        byQuestion[s.question_id] = {
          best: s,
          count: (cur?.count ?? 0) + 1,
        };
      } else {
        byQuestion[s.question_id].count += 1;
      }
    }

    const attemptQuestions = Array.isArray(att.question_order) && att.question_order.length
      ? att.question_order.map((qid) => questionsById.get(qid)).filter(Boolean)
      : (assessment.cr_assessment_questions || []);
    const attemptQuestionIds = new Set(attemptQuestions.map((q) => q.question_id));
    const totalScore = Object.entries(byQuestion).reduce((sum, [qid, x]) => attemptQuestionIds.has(qid) ? sum + (x.best?.score || 0) : sum, 0);
    const possible = attemptQuestions.reduce((s, q) => s + (q.points || 0), 0);
    const completedCount = Object.entries(byQuestion).filter(([qid, x]) => attemptQuestionIds.has(qid) && x.best?.status === 'passed').length;

    return {
      attempt_id: att.id,
      user_id: att.user_id,
      profile: profilesById.get(att.user_id) || null,
      started_at: att.started_at,
      expires_at: att.expires_at,
      submitted_at: att.submitted_at,
      status: att.status,
      question_order: attemptQuestions.map((q) => q.question_id),
      time_taken_seconds: att.submitted_at
        ? Math.max(0, Math.floor((new Date(att.submitted_at) - new Date(att.started_at)) / 1000))
        : null,
      total_score: totalScore,
      possible_score: possible,
      questions_completed: completedCount,
      questions_total: attemptQuestions.length,
      monitoring: {
        left_count: leftCount,
        events: monitor,
      },
      per_question: Object.fromEntries(
        Object.entries(byQuestion).map(([qid, v]) => [qid, {
          attempts_used: v.count,
          best_submission: v.best,
        }]),
      ),
    };
  }).sort((a, b) => {
    const an = a.profile?.name || a.user_id;
    const bn = b.profile?.name || b.user_id;
    return String(an).localeCompare(String(bn));
  });

  return NextResponse.json({ assessment, results: rows });
}

function assignedUsersForAssessment(assessment, profiles) {
  const assignments = assessment.cr_assignments || [];
  const out = new Set();
  if (assignments.some((a) => a.assigned_to_type === 'all') || assignments.length === 0) {
    for (const profile of profiles) out.add(profile.user_id);
    return out;
  }
  const classes = new Set(assignments
    .filter((a) => a.assigned_to_type === 'pledge_class')
    .map((a) => a.assigned_to_value)
    .filter(Boolean));
  const users = assignments
    .filter((a) => a.assigned_to_type === 'user')
    .map((a) => a.assigned_to_value)
    .filter(Boolean);
  for (const profile of profiles) {
    if (classes.has(profile.pledge_class)) out.add(profile.user_id);
  }
  for (const userId of users) out.add(userId);
  return out;
}

function hydrateAdminTestResults(submissions, tests) {
  const byId = new Map(tests.map((t) => [t.id, t]));
  const byQuestionOrdinal = new Map(
    tests.map((t) => [`${t.question_id}:${Boolean(t.is_hidden)}:${t.ordinal}`, t]),
  );

  return submissions.map((submission) => ({
    ...submission,
    test_results: (submission.test_results || []).map((result) => {
      const test = byId.get(result.id) ||
        byQuestionOrdinal.get(`${submission.question_id}:${Boolean(result.is_hidden)}:${result.ordinal}`);
      if (!test) return result;
      return {
        ...result,
        stdin: test.stdin,
        expected: test.expected_stdout,
      };
    }),
  }));
}
