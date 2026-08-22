"use client";

import { useState, useEffect } from "react";
import { X, GitFork, AlertCircle, CornerDownRight, Clock, ShieldCheck, Calendar, Sparkles } from "lucide-react";
import { sanitizeSlug } from "@/lib/utils";
import { Redirect } from "@/lib/db/schema";

interface CreateSublinkModalProps {
  parentRedirect: Redirect | null;
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  baseUrl: string;
  currentUser?: string;
}

export function CreateSublinkModal({
  parentRedirect,
  isOpen,
  onClose,
  onCreated,
  baseUrl,
  currentUser = "siddu",
}: CreateSublinkModalProps) {
  const [webname, setWebname] = useState("");
  const [destinationUrl, setDestinationUrl] = useState("");
  const [linkType, setLinkType] = useState<"permanent" | "temporary">("permanent");
  const [duration, setDuration] = useState<string>("24h");
  const [customDateTime, setCustomDateTime] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (parentRedirect) {
      setDestinationUrl(parentRedirect.destinationUrl);
      setWebname("");
      setLinkType("permanent");
      setDuration("24h");
      setError(null);
    }
  }, [parentRedirect]);

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

  // Set default custom date-time
  useEffect(() => {
    if (!customDateTime) {
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const iso = tomorrow.toISOString().slice(0, 16);
      setCustomDateTime(iso);
    }
  }, [customDateTime]);

  if (!isOpen || !parentRedirect) return null;

  const cleanWebname = sanitizeSlug(webname);
  const previewPath = `${baseUrl}/${currentUser}/${cleanWebname || "sublink-name"}`;

  const applyPreset = (presetName: string, tempDuration?: string) => {
    const parentSlug = parentRedirect.webname;
    setWebname(`${parentSlug}-${presetName}`);
    if (tempDuration) {
      setLinkType("temporary");
      setDuration(tempDuration);
    } else {
      setLinkType("permanent");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!cleanWebname) {
      setError("Please enter a name for your sub-link (e.g. reddit, x, group24hr)");
      return;
    }
    if (!destinationUrl.trim()) {
      setError("Destination website URL is required");
      return;
    }

    if (linkType === "temporary" && duration === "custom") {
      if (!customDateTime) {
        setError("Please select an expiration date and time");
        return;
      }
      if (new Date(customDateTime).getTime() <= Date.now()) {
        setError("Expiration date and time must be in the future");
        return;
      }
    }

    setLoading(true);
    try {
      const payload: {
        webname: string;
        destinationUrl: string;
        duration?: string;
        expiresAt?: string;
        parentId: number;
      } = {
        webname: cleanWebname,
        destinationUrl: destinationUrl.trim(),
        parentId: parentRedirect.id,
      };

      if (linkType === "temporary") {
        if (duration === "custom") {
          payload.expiresAt = new Date(customDateTime).toISOString();
        } else {
          payload.duration = duration;
        }
      } else {
        payload.duration = "permanent";
      }

      const res = await fetch("/api/redirects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create sub-link");
      }

      onCreated();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const minDateTime = new Date().toISOString().slice(0, 16);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150 cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg rounded-3xl bg-white border border-neutral-200 p-7 sm:p-8 shadow-2xl cursor-default font-sans"
      >
        <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-black text-white flex items-center justify-center font-bold">
              <GitFork className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-900">
                Add Sub-link for /{parentRedirect.webname}
              </h2>
              <p className="text-xs text-neutral-500">
                Track clicks from Reddit, X, Instagram, or share temporary group links
              </p>
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
          {/* Quick Preset Ideas */}
          <div>
            <span className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-black" /> Quick Source / Campaign Presets:
            </span>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => applyPreset("reddit")}
                className="px-3 py-1.5 rounded-xl border border-neutral-200 hover:border-black bg-neutral-50 text-xs font-semibold text-neutral-800 transition"
              >
                Reddit
              </button>
              <button
                type="button"
                onClick={() => applyPreset("x")}
                className="px-3 py-1.5 rounded-xl border border-neutral-200 hover:border-black bg-neutral-50 text-xs font-semibold text-neutral-800 transition"
              >
                X (Twitter)
              </button>
              <button
                type="button"
                onClick={() => applyPreset("insta")}
                className="px-3 py-1.5 rounded-xl border border-neutral-200 hover:border-black bg-neutral-50 text-xs font-semibold text-neutral-800 transition"
              >
                Instagram
              </button>
              <button
                type="button"
                onClick={() => applyPreset("group", "24h")}
                className="px-3 py-1.5 rounded-xl border border-neutral-200 hover:border-black bg-neutral-50 text-xs font-semibold text-neutral-800 transition"
              >
                ⏳ Group (24h)
              </button>
              <button
                type="button"
                onClick={() => applyPreset("temp", "7d")}
                className="px-3 py-1.5 rounded-xl border border-neutral-200 hover:border-black bg-neutral-50 text-xs font-semibold text-neutral-800 transition"
              >
                ⏳ Temporary (7d)
              </button>
            </div>
          </div>

          {/* Sub-link Name */}
          <div>
            <label className="block text-xs font-semibold text-neutral-800 mb-1.5">
              Sub-link Name
            </label>
            <input
              type="text"
              value={webname}
              onChange={(e) => setWebname(e.target.value)}
              placeholder="e.g. linkedin-reddit, linkedin-x, share24hr"
              autoFocus
              required
              className="w-full px-3.5 py-2.5 text-xs bg-white border border-neutral-300 rounded-xl text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
            />
          </div>

          {/* Link Type Selector: Permanent vs Temporary */}
          <div>
            <label className="block text-xs font-semibold text-neutral-800 mb-1.5">
              Expiration
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setLinkType("permanent")}
                className={`p-3 rounded-xl border text-left transition flex items-center gap-2.5 ${
                  linkType === "permanent"
                    ? "border-black bg-neutral-50/80 ring-1 ring-black"
                    : "border-neutral-200 hover:border-neutral-300 bg-white"
                }`}
              >
                <ShieldCheck className="w-4 h-4 text-black flex-shrink-0" />
                <div>
                  <div className="text-xs font-bold text-neutral-900">Permanent</div>
                  <div className="text-[10px] text-neutral-500">Never expires</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setLinkType("temporary")}
                className={`p-3 rounded-xl border text-left transition flex items-center gap-2.5 ${
                  linkType === "temporary"
                    ? "border-black bg-neutral-50/80 ring-1 ring-black"
                    : "border-neutral-200 hover:border-neutral-300 bg-white"
                }`}
              >
                <Clock className="w-4 h-4 text-black flex-shrink-0" />
                <div>
                  <div className="text-xs font-bold text-neutral-900">Temporary</div>
                  <div className="text-[10px] text-neutral-500">Expires after time</div>
                </div>
              </button>
            </div>
          </div>

          {/* Temporary Duration Selector with Custom Button */}
          {linkType === "temporary" && (
            <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-3">
              <label className="block text-xs font-semibold text-neutral-800">
                Expires after:
              </label>
              <div className="grid grid-cols-5 gap-1.5">
                {[
                  { label: "1 Hour", val: "1h" },
                  { label: "24 Hours", val: "24h" },
                  { label: "7 Days", val: "7d" },
                  { label: "30 Days", val: "30d" },
                  { label: "Custom", val: "custom" },
                ].map((d) => (
                  <button
                    key={d.val}
                    type="button"
                    onClick={() => setDuration(d.val)}
                    className={`py-2 px-1 text-center rounded-xl text-xs font-semibold border transition ${
                      duration === d.val
                        ? "bg-black text-white border-black shadow-sm"
                        : "bg-white text-neutral-700 border-neutral-200 hover:border-neutral-400"
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>

              {/* Custom Date & Time Picker */}
              {duration === "custom" && (
                <div className="pt-2 border-t border-neutral-200/80 space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-neutral-700">
                    <span className="font-semibold flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-neutral-500" />
                      Set Exact Date & Time:
                    </span>
                  </div>
                  <input
                    type="datetime-local"
                    min={minDateTime}
                    value={customDateTime}
                    onChange={(e) => setCustomDateTime(e.target.value)}
                    required={duration === "custom"}
                    className="w-full px-3.5 py-2 text-xs font-medium bg-white border border-neutral-300 rounded-xl text-neutral-900 focus:outline-none focus:border-black focus:ring-1 focus:ring-black shadow-sm"
                  />
                </div>
              )}
            </div>
          )}

          {/* Destination URL */}
          <div>
            <label className="block text-xs font-semibold text-neutral-800 mb-1.5">
              Destination URL
            </label>
            <input
              type="text"
              value={destinationUrl}
              onChange={(e) => setDestinationUrl(e.target.value)}
              placeholder="https://linkedin.com/in/yourprofile"
              required
              className="w-full px-3.5 py-2.5 text-xs bg-white border border-neutral-300 rounded-xl text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-black focus:ring-1 focus:ring-black font-mono"
            />
          </div>

          {/* Live Preview */}
          <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 text-xs">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] text-neutral-500 uppercase tracking-wider font-semibold">
                Live Sub-link Preview
              </span>
              <span className="text-[10px] font-mono text-neutral-600 font-medium">
                {linkType === "temporary" ? `⏳ Temporary (${duration})` : "♾️ Permanent"}
              </span>
            </div>
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
              className="px-5 py-2 text-xs font-semibold text-white bg-black hover:bg-neutral-800 rounded-xl transition disabled:opacity-50 shadow-sm flex items-center gap-1.5"
            >
              <GitFork className="w-3.5 h-3.5" />
              <span>{loading ? "Creating..." : "Create Sub-link"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
