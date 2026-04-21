'use client';

import AuthGate from "@/components/authgate";
import { useState, useEffect, useRef, useCallback } from "react";
import { supabase, supabaseBucket } from "@/lib/supabase";
import { FolderOpen, FileText, File, Home, ChevronRight, ExternalLink, Loader2, Upload, FolderPlus, MoreVertical, Trash2 } from "lucide-react";

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

function getPathSegments(path) {
  if (!path) return [];
  return path.split("/").filter(Boolean);
}

function getFileIcon(name) {
  const ext = name.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return FileText;
  return File;
}

async function deleteFolderRecursive(path) {
  const { data, error } = await supabase.storage.from(supabaseBucket).list(path, {
    limit: 1000,
    sortBy: { column: "name", order: "asc" },
  });

  if (error) throw error;

  const files = (data || []).filter((item) => item.id !== null);
  const folders = (data || []).filter((item) => item.id === null);

  if (files.length > 0) {
    const filePaths = files.map((item) => (path ? `${path}/${item.name}` : item.name));
    const { error: removeError } = await supabase.storage.from(supabaseBucket).remove(filePaths);
    if (removeError) throw removeError;
  }

  await Promise.all(
    folders.map((folder) => deleteFolderRecursive(path ? `${path}/${folder.name}` : folder.name))
  );
}

export default function StudyToolsPage() {
  const [currentPath, setCurrentPath] = useState("");
  const [folders, setFolders] = useState([]);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const fileInputRef = useRef(null);

  const loadCurrentPath = useCallback(() => {
    setLoading(true);
    setError(null);
    supabase.storage
      .from(supabaseBucket)
      .list(currentPath || undefined, {
        limit: 1000,
        sortBy: { column: "name", order: "asc" },
      })
      .then(async ({ data, error }) => {
        if (error) throw error;

        const folders = (data || [])
          .filter((item) => item.id === null)
          .map((item) => ({
            ...item,
            fullPath: currentPath ? `${currentPath}/${item.name}` : item.name,
          }));
        const fileItems = (data || []).filter((item) => item.id !== null);

        setFolders(folders);

        const fileEntries = await Promise.all(
          fileItems.map(async (item) => {
            const fullPath = currentPath ? `${currentPath}/${item.name}` : item.name;
            const { data: signedUrlData, error: signedUrlError } = await supabase.storage
              .from(supabaseBucket)
              .createSignedUrl(fullPath, 60 * 60);

            if (signedUrlError) throw signedUrlError;

            return {
              name: item.name,
              url: signedUrlData.signedUrl,
              fullPath,
            };
          })
        );

        setFiles(fileEntries);
      })
      .catch((err) => setError(err?.message || "Failed to load"))
      .finally(() => setLoading(false));
  }, [currentPath]);

  useEffect(() => {
    loadCurrentPath();
  }, [loadCurrentPath]);

  async function handleUpload(filesToUpload) {
    if (!filesToUpload?.length) return;
    setUploading(true);
    setError(null);
    try {
      for (const file of filesToUpload) {
        const path = currentPath ? `${currentPath}/${file.name}` : file.name;
        const { error: uploadError } = await supabase.storage.from(supabaseBucket).upload(path, file, {
          upsert: true,
        });

        if (uploadError) throw uploadError;
      }
      await loadCurrentPath();
    } catch (err) {
      setError(err?.message || "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleCreateFolder() {
    const name = prompt("Folder name:");
    if (!name?.trim()) return;
    const trimmed = name.trim().replace(/[/\\]/g, "");
    if (!trimmed) return;
    setCreatingFolder(true);
    setError(null);
    try {
      const folderPath = currentPath ? `${currentPath}/${trimmed}/.keep` : `${trimmed}/.keep`;
      const { error: uploadError } = await supabase.storage.from(supabaseBucket).upload(
        folderPath,
        new Blob(["."], { type: "text/plain" }),
        { upsert: true }
      );

      if (uploadError) throw uploadError;
      await loadCurrentPath();
    } catch (err) {
      setError(err?.message || "Failed to create folder");
    } finally {
      setCreatingFolder(false);
    }
  }

  async function handleDeleteFile(fullPath) {
    if (!confirm("Delete this file? This cannot be undone.")) return;
    setOpenMenuId(null);
    setDeletingId(fullPath);
    setError(null);
    try {
      const { error: removeError } = await supabase.storage.from(supabaseBucket).remove([fullPath]);
      if (removeError) throw removeError;
      await loadCurrentPath();
    } catch (err) {
      setError(err?.message || "Failed to delete file");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleDeleteFolder(fullPath) {
    if (!confirm("Delete this folder and everything inside it? This cannot be undone.")) return;
    setOpenMenuId(null);
    setDeletingId(fullPath);
    setError(null);
    try {
      await deleteFolderRecursive(fullPath);
      await loadCurrentPath();
    } catch (err) {
      setError(err?.message || "Failed to delete folder");
    } finally {
      setDeletingId(null);
    }
  }

  const parentPath = getParentPath(currentPath);
  const pathSegments = getPathSegments(currentPath);

  return (
    <AuthGate>
      <div className="max-w-4xl mx-auto px-6 pt-28 pb-10">
        <h1 className="text-3xl font-bold mb-2">Study Materials</h1>
        <p className="opacity-80 mb-8 text-sm">
          Browse folders and open or download files. All materials are stored securely in Supabase Storage.
        </p>

        <div className="rounded-2xl border border-white/15 bg-white/[0.07] backdrop-blur-sm overflow-hidden shadow-xl">
          {/* Breadcrumb */}
          <div className="px-5 py-4 border-b border-white/10 flex flex-wrap items-center gap-1.5 text-sm">
            <button
              type="button"
              onClick={() => setCurrentPath("")}
              className="flex items-center gap-1.5 text-white/80 hover:text-white transition-colors"
            >
              <Home className="w-4 h-4" />
              <span>Study Materials</span>
            </button>
            {pathSegments.map((segment, i) => {
              const pathUpToHere = pathSegments.slice(0, i + 1).join("/");
              return (
                <span key={pathUpToHere} className="flex items-center gap-1.5">
                  <ChevronRight className="w-4 h-4 text-white/50" />
                  <button
                    type="button"
                    onClick={() => setCurrentPath(pathUpToHere)}
                    className="text-white/80 hover:text-white transition-colors"
                  >
                    {segment}
                  </button>
                </span>
              );
            })}
          </div>

          <div className="p-5 min-h-[280px]">
            {loading && (
              <div className="flex flex-col items-center justify-center py-16 gap-4">
                <Loader2 className="w-10 h-10 text-white/60 animate-spin" />
                <p className="text-white/70 text-sm">Loading…</p>
              </div>
            )}
            {error && (
              <div className="py-8 text-center">
                <p className="text-red-400">{error}</p>
              </div>
            )}

            {!loading && !error && (
              <div className="space-y-6">
                {/* Upload / New folder toolbar */}
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      const files = e.target.files;
                      if (files?.length) handleUpload(Array.from(files));
                    }}
                  />
                  <button
                    type="button"
                    disabled={uploading}
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-sm font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none"
                  >
                    {uploading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    {uploading ? "Uploading…" : "Upload file"}
                  </button>
                  <button
                    type="button"
                    disabled={creatingFolder}
                    onClick={handleCreateFolder}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-sm font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none"
                  >
                    {creatingFolder ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <FolderPlus className="w-4 h-4" />
                    )}
                    {creatingFolder ? "Creating…" : "New folder"}
                  </button>
                </div>
                {folders.length > 0 && (
                  <div>
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-white/60 mb-3">Folders</h2>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {folders.map((folderRef) => {
                        const folderPath = folderRef.fullPath;
                        const isMenuOpen = openMenuId === folderPath;
                        const isDeleting = deletingId === folderPath;
                        return (
                          <div
                            key={folderPath}
                            className="group flex items-center gap-2 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/12 border border-white/5 hover:border-white/15 transition-all duration-200"
                          >
                            <button
                              type="button"
                              onClick={() => setCurrentPath(folderPath)}
                              className="flex items-center gap-3 flex-1 min-w-0 text-left"
                            >
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/10 group-hover:bg-white/15 transition-colors">
                                <FolderOpen className="w-5 h-5 text-amber-400/90" />
                              </div>
                              <span className="font-medium truncate flex-1">{getFolderName(folderPath)}</span>
                              <ChevronRight className="w-5 h-5 text-white/40 group-hover:text-white/70 shrink-0" />
                            </button>
                            <div className="relative shrink-0">
                              <button
                                type="button"
                                disabled={!!deletingId}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenMenuId(isMenuOpen ? null : folderPath);
                                }}
                                className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
                                aria-label="Options"
                              >
                                {isDeleting ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <MoreVertical className="w-4 h-4" />
                                )}
                              </button>
                              {isMenuOpen && (
                                <>
                                  <div
                                    className="fixed inset-0 z-10"
                                    aria-hidden
                                    onClick={() => setOpenMenuId(null)}
                                  />
                                  <div className="absolute right-0 top-full mt-1 z-20 min-w-[120px] py-1 rounded-lg bg-white/10 border border-white/15 shadow-xl backdrop-blur-sm">
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteFolder(folderPath)}
                                      className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-red-400 hover:bg-white/10 rounded"
                                    >
                                      <Trash2 className="w-4 h-4 shrink-0" />
                                      Delete folder
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {files.length > 0 && (
                  <div>
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-white/60 mb-3">Files</h2>
                    <div className="space-y-2">
                      {files.map((file) => {
                        const Icon = getFileIcon(file.name);
                        const isMenuOpen = openMenuId === file.fullPath;
                        const isDeleting = deletingId === file.fullPath;
                        return (
                          <div
                            key={file.fullPath}
                            className="group flex items-center gap-2 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/12 border border-white/5 hover:border-white/15 transition-all duration-200"
                          >
                            <a
                              href={file.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-3 flex-1 min-w-0 text-left"
                            >
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/10 group-hover:bg-white/15 transition-colors">
                                <Icon className="w-5 h-5 text-sky-400/90" />
                              </div>
                              <span className="font-medium truncate flex-1">{file.name}</span>
                              <ExternalLink className="w-4 h-4 text-white/40 group-hover:text-white/70 shrink-0" />
                            </a>
                            <div className="relative shrink-0">
                              <button
                                type="button"
                                disabled={!!deletingId}
                                onClick={(e) => {
                                  e.preventDefault();
                                  setOpenMenuId(isMenuOpen ? null : file.fullPath);
                                }}
                                className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
                                aria-label="Options"
                              >
                                {isDeleting ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <MoreVertical className="w-4 h-4" />
                                )}
                              </button>
                              {isMenuOpen && (
                                <>
                                  <div
                                    className="fixed inset-0 z-10"
                                    aria-hidden
                                    onClick={() => setOpenMenuId(null)}
                                  />
                                  <div className="absolute right-0 top-full mt-1 z-20 min-w-[120px] py-1 rounded-lg bg-white/10 border border-white/15 shadow-xl backdrop-blur-sm">
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteFile(file.fullPath)}
                                      className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-red-400 hover:bg-white/10 rounded"
                                    >
                                      <Trash2 className="w-4 h-4 shrink-0" />
                                      Delete file
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {folders.length === 0 && files.length === 0 && (
                  <div className="py-16 text-center">
                    <FolderOpen className="w-12 h-12 mx-auto text-white/30 mb-3" />
                    <p className="text-white/60">This folder is empty.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </AuthGate>
  );
}