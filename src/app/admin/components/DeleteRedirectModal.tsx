"use client";

import { useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { Redirect } from "@/lib/db/schema";

interface DeleteRedirectModalProps {
  redirect: Redirect | null;
  isOpen: boolean;
  onClose: () => void;
  onDeleted: () => void;
  baseUrl: string;
}

export function DeleteRedirectModal({
  redirect,
  isOpen,
  onClose,
  onDeleted,
  baseUrl,
}: DeleteRedirectModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !redirect) return null;

  const publicLink = `${baseUrl}/${redirect.username}/${redirect.webname}`;

  const handleDelete = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/redirects/${redirect.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete redirect");
      }
      onDeleted();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Delete Redirect</h2>
              <p className="text-xs text-slate-400">This action cannot be undone</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm">
            {error}
          </div>
        )}

        <div className="mt-4 space-y-3">
          <p className="text-sm text-slate-300">
            Are you sure you want to delete this permanent link?
          </p>
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono">
            <div className="text-indigo-400 font-semibold mb-1">{publicLink}</div>
            <div className="text-slate-500 truncate">↳ {redirect.destinationUrl}</div>
          </div>
          <p className="text-xs text-rose-400/90">
            Anyone visiting this URL in the future will receive a 404 Not Found error.
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 mt-6 pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={loading}
            className="px-4 py-2 text-xs font-medium text-white bg-rose-600 hover:bg-rose-500 rounded-lg transition shadow-lg shadow-rose-600/20 disabled:opacity-50"
          >
            {loading ? "Deleting..." : "Delete Permanently"}
          </button>
        </div>
      </div>
    </div>
  );
}
