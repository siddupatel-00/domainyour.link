"use client";

import { useState, useEffect } from "react";
import { X, Link2, AlertCircle, CornerDownRight } from "lucide-react";
import { sanitizeSlug } from "@/lib/utils";

interface CreateRedirectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  baseUrl: string;
  currentUser?: string;
}

export function CreateRedirectModal({
  isOpen,
  onClose,
  onCreated,
  baseUrl,
  currentUser = "siddu",
}: CreateRedirectModalProps) {
  const [webname, setWebname] = useState("");
  const [destinationUrl, setDestinationUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const cleanWebname = sanitizeSlug(webname);
  const previewPath = `${baseUrl}/${currentUser}/${cleanWebname || "link-name"}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!cleanWebname) {
      setError("Please enter a link name (e.g. linkedin)");
      return;
    }
    if (!destinationUrl.trim()) {
      setError("Please enter the destination website URL");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/redirects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          webname: cleanWebname,
          destinationUrl: destinationUrl.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create link");
      }

      setWebname("");
      setDestinationUrl("");
      onCreated();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
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
        className="relative w-full max-w-lg rounded-3xl bg-white border border-neutral-200 p-7 sm:p-8 shadow-2xl cursor-default"
      >
        <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-black text-white flex items-center justify-center font-bold">
              <Link2 className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-900">Create New Link</h2>
              <p className="text-xs text-neutral-500">Create a permanent link you can share anywhere</p>
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
          <div className="mt-4 p-3.5 rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-800 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-neutral-700" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-800 mb-1.5">
              Link Name
            </label>
            <input
              type="text"
              value={webname}
              onChange={(e) => setWebname(e.target.value)}
              placeholder="e.g. linkedin, github, portfolio, myapp"
              autoFocus
              required
              className="w-full px-3.5 py-2.5 text-xs bg-white border border-neutral-300 rounded-xl text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-800 mb-1.5">
              Where should this link go?
            </label>
            <input
              type="text"
              value={destinationUrl}
              onChange={(e) => setDestinationUrl(e.target.value)}
              placeholder="https://linkedin.com/in/yourprofile"
              required
              className="w-full px-3.5 py-2.5 text-xs bg-white border border-neutral-300 rounded-xl text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
            />
          </div>

          {/* Live Preview */}
          <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 text-xs">
            <span className="text-[10px] text-neutral-500 uppercase tracking-wider block mb-1.5 font-semibold">
              Live Preview
            </span>
            <div className="text-neutral-900 font-semibold font-mono truncate">{previewPath}</div>
            <div className="flex items-center gap-1.5 text-neutral-600 mt-1 truncate">
              <CornerDownRight className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0" />
              <span className="truncate">{destinationUrl.trim() || "(destination website)"}</span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-neutral-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-medium text-neutral-600 hover:text-black border border-neutral-200 rounded-xl hover:bg-neutral-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-semibold text-white bg-black hover:bg-neutral-800 rounded-xl transition disabled:opacity-50 shadow-sm"
            >
              {loading ? "Creating..." : "Create Link"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
