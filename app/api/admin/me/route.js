import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/coderank/auth";

export async function GET(request) {
  const auth = await requirePermission(request, "admin.portal");
  if (auth.error) return auth.error;
  return NextResponse.json({ profile: auth.profile });
}
