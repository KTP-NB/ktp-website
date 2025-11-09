// FILE: app/study-tools/page.js

'use client';

import AuthGate from "@/components/authgate";
import { useMemo } from "react";

const DRIVE_FOLDER_ID = "19wSKWXX5wsK8nu_6ULQK9Hfb16BX4keo";

function useDriveEmbedUrl(id) {
  return useMemo(
    () => `https://drive.google.com/embeddedfolderview?id=${id}#grid`,
    [id]
  );
}

export default function StudyToolsPage() {
  const embedUrl = useDriveEmbedUrl(DRIVE_FOLDER_ID);

  return (
    <AuthGate>
      <div className="max-w-6xl mx-auto px-6 pt-28 pb-10">
        <h1 className="text-3xl font-bold mb-4">Study Materials</h1>
        <p className="opacity-80 mb-6">
          Embedded from Google Drive. Access is controlled by Drive sharing.
        </p>

        <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
          <div className="h-[75vh]">
            <iframe
              title="Study Materials Drive"
              src={embedUrl}
              className="w-full h-full"
              loading="lazy"
            />
          </div>
        </div>
      </div>
    </AuthGate>
  );
}