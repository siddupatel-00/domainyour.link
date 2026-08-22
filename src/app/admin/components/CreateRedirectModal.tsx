"use client";

import { useState } from "react";
import { X, Link2, AlertCircle, CornerDownRight, AlertTriangle, Lock } from "lucide-react";
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
  const [isUsernameFocused, setIsUsernameFocused] = useState(false);

  if (!isOpen) return null;

  const cleanUsername = sanitizeSlug(username);
  const cleanWebname = sanitizeSlug(webname);
  const previewPath = `${baseUrl}/${cleanUsername || ":username"}/${cleanWebname || ":webname"}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!cleanUsername) {
      setError("Please enter a valid username");
      return;
    }
    if (!cleanWebname) {
      setError("Please enter a valid webname / slug");
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl bg-neutral-950 border border-neutral-800 p-6 sm:p-7 shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white text-black flex items-center justify-center font-bold">
              <Link2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Create Permanent Link</h2>
              <p className="text-[11px] text-neutral-400">Add a permanent URL with dynamic destination</p>
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
          <div className="mt-4 p-3 rounded-lg border border-neutral-700 bg-neutral-900 text-white text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-neutral-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-mono uppercase text-neutral-300 font-medium">
                  Username
                </label>
                <span className="text-[10px] font-mono text-neutral-400 flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5" /> Permanent
                </span>
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onFocus={() => setIsUsernameFocused(true)}
                onBlur={() => setIsUsernameFocused(false)}
                placeholder="siddu"
                required
                className={`w-full px-3 py-2 text-xs bg-black border rounded-lg text-white placeholder-neutral-600 focus:outline-none transition ${
                  isUsernameFocused || username ? "border-white" : "border-neutral-800"
                }`}
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono uppercase text-neutral-300 mb-1 font-medium">
                Webname / Slug
              </label>
              <input
                type="text"
                value={webname}
                onChange={(e) => setWebname(e.target.value)}
                placeholder="linkedin"
                required
                className="w-full px-3 py-2 text-xs bg-black border border-neutral-800 rounded-lg text-white placeholder-neutral-600 focus:outline-none focus:border-white"
              />
            </div>
          </div>

          {/* Prominent warning notice that username cannot be changed */}
          <div className="p-2.5 rounded-lg border border-neutral-800 bg-black flex items-start gap-2.5 text-xs text-neutral-300">
            <AlertTriangle className="w-4 h-4 text-white flex-shrink-0 mt-0.5" />
            <div className="text-[11px] leading-relaxed">
              <span className="text-white font-medium">Username is permanent: </span>
              Once created, <code className="text-white bg-neutral-900 px-1 py-0.5 rounded font-mono">/{cleanUsername || "username"}</code> cannot be renamed. Only destination URLs can be edited later.
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-mono uppercase text-neutral-300 mb-1 font-medium">
              Destination URL
            </label>
            <input
              type="text"
              value={destinationUrl}
              onChange={(e) => setDestinationUrl(e.target.value)}
              placeholder="https://linkedin.com/in/currentusername"
              required
              className="w-full px-3 py-2 text-xs bg-black border border-neutral-800 rounded-lg text-white placeholder-neutral-600 focus:outline-none focus:border-white"
            />
          </div>

          {/* Live Preview */}
          <div className="p-3.5 rounded-lg bg-black border border-neutral-900 font-mono text-[11px]">
            <span className="text-[10px] text-neutral-500 uppercase tracking-wider block mb-1.5">
              Live Preview
            </span>
            <div className="text-white truncate font-medium">{previewPath}</div>
            <div className="flex items-center gap-1.5 text-neutral-400 mt-1 truncate">
              <CornerDownRight className="w-3.5 h-3.5 text-neutral-600 flex-shrink-0" />
              <span className="truncate">{destinationUrl.trim() || "(destination URL)"}</span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-neutral-800">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-neutral-400">Code:</span>
              <select
                value={redirectCode}
                onChange={(e) => setRedirectCode(Number(e.target.value))}
                className="bg-black border border-neutral-800 text-xs text-white rounded px-2 py-1 focus:outline-none focus:border-white font-mono"
              >
                <option value={307}>307 (Temporary)</option>
                <option value={308}>308 (Permanent)</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-3 py-1.5 text-xs text-neutral-400 hover:text-white border border-neutral-800 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-1.5 text-xs font-semibold text-black bg-white hover:bg-neutral-200 rounded-lg transition disabled:opacity-50"
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
