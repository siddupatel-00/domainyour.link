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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm rounded-xl bg-neutral-950 border border-neutral-800 p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-neutral-900 border border-neutral-700 text-white flex items-center justify-center font-bold">
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Delete Redirect</h2>
              <p className="text-[11px] text-neutral-400">Confirm permanent deletion</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-lg border border-neutral-700 bg-neutral-900 text-white text-xs">
            {error}
          </div>
        )}

        <div className="mt-4 space-y-3">
          <p className="text-xs text-neutral-300">
            Are you sure you want to delete this permanent link?
          </p>
          <div className="p-2.5 rounded-lg bg-black border border-neutral-900 text-xs font-mono">
            <div className="text-white font-semibold">{publicLink}</div>
            <div className="text-neutral-500 truncate text-[11px] mt-0.5">↳ {redirect.destinationUrl}</div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 mt-6 pt-3 border-t border-neutral-800">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-3 py-1.5 text-xs text-neutral-400 hover:text-white border border-neutral-800 rounded-lg transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={loading}
            className="px-3.5 py-1.5 text-xs font-semibold text-black bg-white hover:bg-neutral-200 rounded-lg transition disabled:opacity-50"
          >
            {loading ? "Deleting..." : "Delete Link"}
          </button>
        </div>
      </div>
    </div>
  );
}
