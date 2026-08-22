"use client";

import { useState } from "react";
import { X, Sparkles, AlertCircle, ArrowRight } from "lucide-react";
import { sanitizeSlug } from "@/lib/utils";

interface CreateRedirectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  baseUrl: string;
}

export function CreateRedirectModal({
  isOpen,
  onClose,
  onCreated,
  baseUrl,
}: CreateRedirectModalProps) {
  const [username, setUsername] = useState("");
  const [webname, setWebname] = useState("");
  const [destinationUrl, setDestinationUrl] = useState("");
  const [redirectCode, setRedirectCode] = useState<number>(307);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const cleanUsername = sanitizeSlug(username);
  const cleanWebname = sanitizeSlug(webname);
  const previewPath = `${baseUrl}/${cleanUsername || ":username"}/${cleanWebname || ":webname"}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!cleanUsername) {
      setError("Please enter a valid username (letters, numbers, hyphens)");
      return;
    }
    if (!cleanWebname) {
      setError("Please enter a valid webname / slug (e.g. linkedin, github)");
      return;
    }
    if (!destinationUrl.trim()) {
      setError("Please enter a destination URL");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/redirects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: cleanUsername,
          webname: cleanWebname,
          destinationUrl: destinationUrl.trim(),
          redirectCode,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create permanent link");
      }

      // Reset state and close
      setUsername("");
      setWebname("");
      setDestinationUrl("");
      setRedirectCode(307);
      onCreated();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Create Permanent Link</h2>
              <p className="text-xs text-slate-400">Create a permanent URL that you can point anywhere</p>
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
          <div className="mt-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-start gap-2 text-rose-300 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Username / Namespace
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. siddu"
                required
                className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Webname / Slug
              </label>
              <input
                type="text"
                value={webname}
                onChange={(e) => setWebname(e.target.value)}
                placeholder="e.g. linkedin"
                required
                className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Destination URL
            </label>
            <input
              type="text"
              value={destinationUrl}
              onChange={(e) => setDestinationUrl(e.target.value)}
              placeholder="https://linkedin.com/in/yourcurrentprofile"
              required
              className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              You can change this destination anytime later without altering your public link.
            </p>
          </div>

          {/* Live Preview */}
          <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800/80">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              Live Preview
            </span>
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="text-indigo-400 truncate">{previewPath}</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
              <span className="text-emerald-400 truncate">
                {destinationUrl.trim() || "(destination URL)"}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-800">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">HTTP Status:</span>
              <select
                value={redirectCode}
                onChange={(e) => setRedirectCode(Number(e.target.value))}
                className="bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded px-2 py-1 focus:outline-none focus:border-indigo-500"
              >
                <option value={307}>307 (Temporary - Recommended)</option>
                <option value={308}>308 (Permanent)</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition shadow-lg shadow-indigo-500/20 disabled:opacity-50"
              >
                {loading ? "Creating..." : "Create Link"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
