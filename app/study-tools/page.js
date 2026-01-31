'use client';

import AuthGate from "@/components/authgate";
import { useState, useEffect } from "react";
import { app } from "@/lib/firebase";
import { getStorage, ref, listAll, getDownloadURL } from "firebase/storage";

const storage = getStorage(app, "gs://ktp-website-2903e.firebasestorage.app");

function getParentPath(path) {
  if (!path) return "";
  const parts = path.split("/").filter(Boolean);
  parts.pop();
  return parts.join("/");
}

function getFolderName(fullPath) {
  const parts = fullPath.split("/").filter(Boolean);
  return parts[parts.length - 1] || fullPath;
}

export default function StudyToolsPage() {
  const [currentPath, setCurrentPath] = useState("");
  const [folders, setFolders] = useState([]);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const storageRef = ref(storage, currentPath || undefined);

    listAll(storageRef)
      .then((result) => {
        setFolders(result.prefixes);
        return Promise.all(
          result.items.map((itemRef) =>
            getDownloadURL(itemRef).then((url) => ({
              name: itemRef.name,
              url,
            }))
          )
        );
      })
      .then(setFiles)
      .catch((err) => setError(err?.message || "Failed to load"))
      .finally(() => setLoading(false));
  }, [currentPath]);

  const parentPath = getParentPath(currentPath);
  const showBack = currentPath.length > 0;

  return (
    <AuthGate>
      <div className="max-w-6xl mx-auto px-6 pt-28 pb-10">
        <h1 className="text-3xl font-bold mb-4">Study Materials</h1>
        <p className="opacity-80 mb-6">
          Study materials are stored in Firebase Storage. Open folders or use the links below to open or download files.
        </p>

        <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden p-6">
          {showBack && (
            <button
              type="button"
              onClick={() => setCurrentPath(parentPath)}
              className="mb-4 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-left"
            >
              ← Back
            </button>
          )}

          {loading && <p className="opacity-80">Loading…</p>}
          {error && <p className="text-red-400 mb-4">{error}</p>}

          {!loading && !error && (
            <div className="space-y-2">
              {folders.map((folderRef) => (
                <button
                  key={folderRef.fullPath}
                  type="button"
                  onClick={() => setCurrentPath(folderRef.fullPath)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-white/5 hover:bg-white/10 text-left"
                >
                  <span className="text-xl">📁</span>
                  <span>{getFolderName(folderRef.fullPath)}</span>
                </button>
              ))}
              {files.map((file) => (
                <a
                  key={file.url}
                  href={file.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-white/5 hover:bg-white/10 text-left"
                >
                  <span className="text-xl">📄</span>
                  <span>{file.name}</span>
                </a>
              ))}
              {folders.length === 0 && files.length === 0 && (
                <p className="opacity-80">This folder is empty.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </AuthGate>
  );
}