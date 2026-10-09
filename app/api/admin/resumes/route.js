import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/coderank/auth";
import { getServiceClient } from "@/lib/coderank/supabaseServer";

export async function GET(request) {
  const auth = await requirePermission(request, "resumes.manage");
  if (auth.error) return auth.error;
  const service = getServiceClient();
  const [members, resumes] = await Promise.all([
    service
      .from("member_profiles")
      .select("id,name,position,pledge_class,member_status,graduation_year,major")
      .order("name"),
    service.from("member_resumes").select("member_id,url"),
  ]);
  const error = members.error || resumes.error;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const resumeByMember = new Map((resumes.data || []).map((row) => [row.member_id, row.url]));
  return NextResponse.json({
    members: (members.data || []).map((member) => ({
      ...member,
      resume_url: resumeByMember.get(member.id) || null,
    })),
  });
}
