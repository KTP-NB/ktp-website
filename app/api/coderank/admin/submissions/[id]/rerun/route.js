import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/coderank/auth';
import { getServiceClient } from '@/lib/coderank/supabaseServer';
import { gradeSubmission } from '@/lib/coderank/grading';

export const dynamic = 'force-dynamic';

export async function POST(request, { params }) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;

  const service = getServiceClient();
  const { data: submission, error } = await service
    .from('cr_submissions')
    .select('id, question_id, language, code')
    .eq('id', params.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!submission) return NextResponse.json({ error: 'Submission not found' }, { status: 404 });

  const { data: tests, error: tErr } = await service
    .from('cr_test_cases')
    .select('id, stdin, expected_stdout, is_hidden, ordinal')
    .eq('question_id', submission.question_id)
    .order('ordinal');

  if (tErr) return NextResponse.json({ error: tErr.message }, { status: 500 });
  const report = await gradeSubmission({
    language: submission.language,
    code: submission.code,
    tests: tests || [],
    revealHidden: true,
  });

  return NextResponse.json({ report });
}
