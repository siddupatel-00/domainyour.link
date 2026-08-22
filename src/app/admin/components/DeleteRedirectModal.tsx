"use client";

import { useState, useEffect } from "react";
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

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

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
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150 cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md rounded-3xl bg-white border border-neutral-200 p-7 shadow-2xl cursor-default"
      >
        <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-neutral-100 border border-neutral-200 text-neutral-900 flex items-center justify-center font-bold">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-900">Delete Link</h2>
              <p className="text-xs text-neutral-500">Confirm link deletion</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-black hover:bg-neutral-100 transition"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3.5 rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-800 text-xs">
            {error}
          </div>
        )}

        <div className="mt-5 space-y-3.5">
          <p className="text-xs text-neutral-600 leading-relaxed">
            Are you sure you want to delete this link? Anyone visiting it will see a link not found page.
          </p>
          <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200 text-xs font-mono">
            <div className="text-neutral-900 font-bold">{publicLink}</div>
            <div className="text-neutral-500 truncate text-[11px] mt-1">↳ {redirect.destinationUrl}</div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 mt-6 pt-4 border-t border-neutral-100">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-xs font-medium text-neutral-600 hover:text-black border border-neutral-200 rounded-xl hover:bg-neutral-50 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={loading}
            className="px-4 py-2 text-xs font-semibold text-white bg-black hover:bg-neutral-800 rounded-xl transition disabled:opacity-50 shadow-sm"
          >
            {loading ? "Deleting..." : "Delete Link"}
          </button>
        </div>
      </div>
    </div>
  );
}
