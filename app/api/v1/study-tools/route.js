import { NextResponse } from "next/server";
import { apiError, auditApiRequest, requireMemberApiKey } from "@/lib/applications/apiAuth";

const BUCKET = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET;

export async function GET(request) {
  const auth = await requireMemberApiKey(request, "applications:read", "study_tools.use");
  if (auth.error) return auth.error;
  if (!BUCKET) return apiError("Study tools storage is not configured.", 500);
  const path = (new URL(request.url).searchParams.get("path") || "").replace(/^\/+|\/+$/g, "");
  if (path.split("/").some((part) => part === "..")) return apiError("path is invalid.");

  const storage = auth.service.storage.from(BUCKET);
  const { data, error } = await storage.list(path || undefined, {
    limit: 1000,
    sortBy: { column: "name", order: "asc" },
  });
  if (error) return apiError("Unable to list study files.", 500);
  const fullPath = (name) => (path ? `${path}/${name}` : name);
  // Storage reports folders as entries without an id.
  const folders = (data || []).filter((item) => item.id === null)
    .map((item) => ({ name: item.name, path: fullPath(item.name) }));
  const files = await Promise.all(
    (data || []).filter((item) => item.id !== null).map(async (item) => {
      const { data: signed } = await storage.createSignedUrl(fullPath(item.name), 60 * 60);
      return { name: item.name, path: fullPath(item.name), url: signed?.signedUrl || null };
    }),
  );
  await auditApiRequest(auth.service, auth.key, "study_tools.list", "success");
  return NextResponse.json({ data: { path, folders, files, url_expires_in_seconds: 3600 } });
}
