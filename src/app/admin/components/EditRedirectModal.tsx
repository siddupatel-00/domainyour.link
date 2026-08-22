"use client";

import { useState, useEffect } from "react";
import { X, Edit3, AlertCircle } from "lucide-react";
import { Redirect } from "@/lib/db/schema";

interface EditRedirectModalProps {
  redirect: Redirect | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void;
  baseUrl: string;
}

export function EditRedirectModal({
  redirect,
  isOpen,
  onClose,
  onUpdated,
  baseUrl,
}: EditRedirectModalProps) {
  const [destinationUrl, setDestinationUrl] = useState("");
  const [redirectCode, setRedirectCode] = useState<number>(307);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (redirect) {
      setDestinationUrl(redirect.destinationUrl);
      setRedirectCode(redirect.redirectCode || 307);
      setError(null);
    }
  }, [redirect]);

  if (!isOpen || !redirect) return null;

  const publicLink = `${baseUrl}/${redirect.username}/${redirect.webname}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!destinationUrl.trim()) {
      setError("Destination URL cannot be empty");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/redirects/${redirect.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destinationUrl: destinationUrl.trim(),
          redirectCode,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update destination");
      }

      onUpdated();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-xl bg-neutral-950 border border-neutral-800 p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-white text-black flex items-center justify-center font-bold">
              <Edit3 className="w-3.5 h-3.5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Update Destination</h2>
              <p className="text-[11px] text-neutral-400">Change redirect destination</p>
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

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
          <div className="p-3 rounded-lg bg-black border border-neutral-900 text-xs font-mono">
            <span className="text-[10px] text-neutral-500 uppercase tracking-wider block mb-1">Permanent Public URL</span>
            <span className="text-white font-medium">{publicLink}</span>
          </div>

          <div>
            <label className="block text-[11px] font-mono uppercase text-neutral-400 mb-1">
              New Destination URL
            </label>
            <input
              type="text"
              value={destinationUrl}
              onChange={(e) => setDestinationUrl(e.target.value)}
              placeholder="https://newdestination.com"
              required
              className="w-full px-3 py-1.5 text-xs bg-black border border-neutral-800 rounded-lg text-white placeholder-neutral-600 focus:outline-none focus:border-white"
            />
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
                className="px-3.5 py-1.5 text-xs font-semibold text-black bg-white hover:bg-neutral-200 rounded-lg transition disabled:opacity-50"
              >
                {loading ? "Updating..." : "Save Changes"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
