import { NextResponse } from "next/server";
import { requireApplicationApiKey } from "@/lib/applications/apiAuth";

export async function GET(request) {
  const auth = await requireApplicationApiKey(request, "applications:read");
  if (auth.error) return auth.error;
  return NextResponse.json({
    data: {
      member: { id: auth.profile.id, name: auth.profile.name },
      key: { name: auth.key.name, scopes: auth.key.scopes },
    },
  });
}
