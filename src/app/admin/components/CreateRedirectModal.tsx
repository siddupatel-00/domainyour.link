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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg rounded-3xl bg-white border border-neutral-200 p-7 sm:p-8 shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-black text-white flex items-center justify-center font-bold">
              <Link2 className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-900">Create Permanent Link</h2>
              <p className="text-xs text-neutral-500">Set a permanent URL with dynamic destination</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-black hover:bg-neutral-100 transition"
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-neutral-800">
                  Username
                </label>
                <span className="text-[10px] font-mono text-neutral-500 flex items-center gap-1">
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
                className={`w-full px-3.5 py-2.5 text-xs bg-white border rounded-xl text-neutral-900 placeholder-neutral-400 focus:outline-none transition ${
                  isUsernameFocused || username ? "border-black ring-1 ring-black" : "border-neutral-300"
                }`}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-800 mb-1.5">
                Webname / Slug
              </label>
              <input
                type="text"
                value={webname}
                onChange={(e) => setWebname(e.target.value)}
                placeholder="linkedin"
                required
                className="w-full px-3.5 py-2.5 text-xs bg-white border border-neutral-300 rounded-xl text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
              />
            </div>
          </div>

          {/* Prominent warning notice that username cannot be changed */}
          <div className="p-3 rounded-xl border border-neutral-200 bg-neutral-50 flex items-start gap-2.5 text-xs text-neutral-700">
            <AlertTriangle className="w-4 h-4 text-black flex-shrink-0 mt-0.5" />
            <div className="text-xs leading-relaxed">
              <span className="font-semibold text-neutral-900">Username is permanent: </span>
              Once created, <code className="bg-white border border-neutral-200 px-1.5 py-0.5 rounded font-mono text-[11px] text-neutral-900">/{cleanUsername || "username"}</code> cannot be renamed. Only destination URLs can be updated later.
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-800 mb-1.5">
              Destination URL
            </label>
            <input
              type="text"
              value={destinationUrl}
              onChange={(e) => setDestinationUrl(e.target.value)}
              placeholder="https://linkedin.com/in/currentusername"
              required
              className="w-full px-3.5 py-2.5 text-xs bg-white border border-neutral-300 rounded-xl text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
            />
          </div>

          {/* Live Preview */}
          <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 font-mono text-xs">
            <span className="text-[10px] text-neutral-500 uppercase tracking-wider block mb-1.5 font-semibold">
              Live Preview
            </span>
            <div className="text-neutral-900 font-semibold truncate">{previewPath}</div>
            <div className="flex items-center gap-1.5 text-neutral-600 mt-1 truncate">
              <CornerDownRight className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0" />
              <span className="truncate">{destinationUrl.trim() || "(destination URL)"}</span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-neutral-100">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-neutral-500">Status:</span>
              <select
                value={redirectCode}
                onChange={(e) => setRedirectCode(Number(e.target.value))}
                className="bg-white border border-neutral-300 text-xs text-neutral-900 rounded-lg px-2.5 py-1 focus:outline-none focus:border-black font-mono"
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
                className="px-4 py-2 text-xs font-medium text-neutral-600 hover:text-black border border-neutral-200 rounded-xl hover:bg-neutral-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-xs font-semibold text-white bg-black hover:bg-neutral-800 rounded-xl transition disabled:opacity-50 shadow-sm"
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
