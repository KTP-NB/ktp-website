import { NextResponse } from "next/server";
import { apiError, auditApiRequest, requireMemberApiKey } from "@/lib/applications/apiAuth";

export async function GET(request) {
  const auth = await requireMemberApiKey(request, "applications:read", "resumes.use");
  if (auth.error) return auth.error;
  const [resume, notes] = await Promise.all([
    auth.service.from("member_resumes").select("url,storage_path")
      .eq("member_id", auth.profile.id).maybeSingle(),
    auth.service.from("member_resume_notes").select("notes,updated_at")
      .eq("profile_id", auth.profile.id).maybeSingle(),
  ]);
  if (resume.error || notes.error) return apiError("Unable to load resume.", 500);
  await auditApiRequest(auth.service, auth.key, "resume.read", "success");
  return NextResponse.json({
    data: {
      resume_url: resume.data?.url || null,
      feedback: notes.data?.notes || null,
      feedback_updated_at: notes.data?.updated_at || null,
    },
  });
}
