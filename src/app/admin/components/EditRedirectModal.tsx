"use client";

import { useState, useEffect } from "react";
import { Redirect } from "@/lib/db/schema";
import { X, Edit2, AlertCircle, Clock, ShieldCheck, Calendar } from "lucide-react";
import { isValidUrl } from "@/lib/utils";

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
  const [linkName, setLinkName] = useState("");
  const [destinationUrl, setDestinationUrl] = useState("");
  const [linkType, setLinkType] = useState<"permanent" | "temporary">("permanent");
  const [duration, setDuration] = useState<string>("24h");
  const [customDate, setCustomDate] = useState<string>("");
  const [customTime, setCustomTime] = useState<string>("18:00");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (redirect && isOpen) {
      setLinkName(redirect.title || redirect.webname || "");
      setDestinationUrl(redirect.destinationUrl);
      const isExp = redirect.expiresAt && new Date(redirect.expiresAt).getTime() <= Date.now();
      if (redirect.expiresAt && !isExp) {
        setLinkType("temporary");
        setDuration("24h");
      } else {
        setLinkType("permanent");
      }
      setError(null);
    }
  }, [redirect, isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!customDate) {
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      setCustomDate(tomorrow.toISOString().slice(0, 10));
    }
  }, [customDate]);

  if (!isOpen || !redirect) return null;

  const minDate = new Date().toISOString().slice(0, 10);
  const fullUrl = redirect.code ? `${baseUrl}/u/${redirect.code}` : `${baseUrl}/${redirect.username}/${redirect.webname}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedName = linkName.trim();
    if (!trimmedName) {
      setError("Please enter a link name (e.g. github-project, portfolio, resume)");
      return;
    }

    if (!destinationUrl.trim()) {
      setError("Please enter a destination URL");
      return;
    }

    let finalUrl = destinationUrl.trim();
    if (!finalUrl.startsWith("http://") && !finalUrl.startsWith("https://")) {
      finalUrl = `https://${finalUrl}`;
    }

    if (!isValidUrl(finalUrl)) {
      setError("Please enter a valid destination URL (e.g. https://...)");
      return;
    }

    let customTimestamp: Date | null = null;
    if (linkType === "temporary" && duration === "custom") {
      if (!customDate || !customTime) {
        setError("Please enter both expiration date and time");
        return;
      }
      customTimestamp = new Date(`${customDate}T${customTime}`);
      if (isNaN(customTimestamp.getTime()) || customTimestamp.getTime() <= Date.now()) {
        setError("Expiration date and time must be in the future");
        return;
      }
    }

    setLoading(true);
    try {
      const payload: { title: string; destinationUrl: string; duration?: string; expiresAt?: string | null } = {
        title: trimmedName,
        destinationUrl: finalUrl,
      };

      if (linkType === "temporary") {
        if (duration === "custom" && customTimestamp) {
          payload.expiresAt = customTimestamp.toISOString();
        } else {
          payload.duration = duration;
        }
      } else {
        payload.expiresAt = null;
      }

      const res = await fetch(`/api/redirects/${redirect.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update link");
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
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 dark:bg-black/70 backdrop-blur-sm animate-in fade-in duration-150 cursor-pointer overflow-y-auto"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-7 sm:p-8 shadow-2xl cursor-default font-sans my-8"
      >
        <div className="flex items-center justify-between pb-4 border-b border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-black dark:bg-white text-white dark:text-black flex items-center justify-center font-bold">
              <Edit2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-900 dark:text-white">Edit Link</h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">Update link name or destination URL</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/60 text-neutral-800 dark:text-neutral-200 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-neutral-700 dark:text-neutral-300" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800 text-xs space-y-1">
            <span className="text-[10px] text-neutral-500 dark:text-neutral-400 uppercase tracking-wider font-semibold block">
              Permanent Short Link
            </span>
            <div className="font-mono font-bold text-neutral-900 dark:text-white truncate">{fullUrl}</div>
          </div>

          {/* 1. Link Name (Project name) */}
          <div>
            <label className="block text-xs font-semibold text-neutral-800 dark:text-neutral-200 mb-1.5">
              Link Name
            </label>
            <input
              type="text"
              value={linkName}
              onChange={(e) => setLinkName(e.target.value)}
              placeholder="e.g. github-project, portfolio, resume"
              required
              className="w-full px-3.5 py-2.5 text-xs bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-600 focus:outline-none focus:border-black dark:focus:border-white focus:ring-1 focus:ring-black dark:focus:ring-white transition font-medium"
            />
          </div>

          {/* 2. Destination URL */}
          <div>
            <label className="block text-xs font-semibold text-neutral-800 dark:text-neutral-200 mb-1.5">
              Destination URL
            </label>
            <input
              type="text"
              value={destinationUrl}
              onChange={(e) => setDestinationUrl(e.target.value)}
              placeholder="https://github.com/username/projectlink"
              required
              className="w-full px-3.5 py-2.5 text-xs bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-600 focus:outline-none focus:border-black dark:focus:border-white focus:ring-1 focus:ring-black dark:focus:ring-white transition font-mono font-medium"
            />
          </div>

          {/* 3. Expiration Mode */}
          <div>
            <label className="block text-xs font-semibold text-neutral-800 dark:text-neutral-200 mb-1.5">
              Expiration Mode
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setLinkType("permanent")}
                className={`p-3 rounded-xl border text-left transition flex items-center gap-2.5 cursor-pointer ${
                  linkType === "permanent"
                    ? "border-black dark:border-white bg-neutral-50/80 dark:bg-neutral-800 ring-1 ring-black dark:ring-white"
                    : "border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 bg-white dark:bg-neutral-950"
                }`}
              >
                <ShieldCheck className="w-4 h-4 text-black dark:text-white flex-shrink-0" />
                <div>
                  <div className="text-xs font-bold text-neutral-900 dark:text-white">Permanent</div>
                  <div className="text-[10px] text-neutral-500 dark:text-neutral-400">Keep active forever</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setLinkType("temporary")}
                className={`p-3 rounded-xl border text-left transition flex items-center gap-2.5 cursor-pointer ${
                  linkType === "temporary"
                    ? "border-black dark:border-white bg-neutral-50/80 dark:bg-neutral-800 ring-1 ring-black dark:ring-white"
                    : "border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 bg-white dark:bg-neutral-950"
                }`}
              >
                <Clock className="w-4 h-4 text-black dark:text-white flex-shrink-0" />
                <div>
                  <div className="text-xs font-bold text-neutral-900 dark:text-white">Temporary</div>
                  <div className="text-[10px] text-neutral-500 dark:text-neutral-400">Expires after time</div>
                </div>
              </button>
            </div>

            {linkType === "temporary" && (
              <div className="mt-3 p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/40 space-y-3 animate-in fade-in duration-150">
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                    How long should this link stay active?
                  </label>
                  <div className="grid grid-cols-5 gap-1.5">
                    {[
                      { label: "1 Hour", val: "1h" },
                      { label: "24 Hours", val: "24h" },
                      { label: "7 Days", val: "7d" },
                      { label: "30 Days", val: "30d" },
                      { label: "Custom", val: "custom" },
                    ].map((opt) => (
                      <button
                        key={opt.val}
                        type="button"
                        onClick={() => setDuration(opt.val)}
                        className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                          duration === opt.val
                            ? "bg-black dark:bg-white text-white dark:text-black shadow-sm"
                            : "bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {duration === "custom" && (
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-neutral-200/60 dark:border-neutral-700/60 animate-in fade-in duration-150">
                    <div>
                      <label className="block text-[10px] font-medium text-neutral-500 dark:text-neutral-400 mb-1 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>Date</span>
                      </label>
                      <input
                        type="date"
                        min={minDate}
                        value={customDate}
                        onChange={(e) => setCustomDate(e.target.value)}
                        required={duration === "custom"}
                        className="w-full px-3 py-2 text-xs font-medium bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white focus:outline-none focus:border-black dark:focus:border-white shadow-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-neutral-500 dark:text-neutral-400 mb-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>Time</span>
                      </label>
                      <input
                        type="time"
                        value={customTime}
                        onChange={(e) => setCustomTime(e.target.value)}
                        required={duration === "custom"}
                        className="w-full px-3 py-2 text-xs font-medium bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white focus:outline-none focus:border-black dark:focus:border-white shadow-sm"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-neutral-100 dark:border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white border border-neutral-200 dark:border-neutral-800 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-800 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-semibold text-white dark:text-black bg-black dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-200 rounded-xl transition disabled:opacity-50 shadow-sm cursor-pointer"
            >
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
