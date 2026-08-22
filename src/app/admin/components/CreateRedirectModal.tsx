"use client";

import { useState, useEffect } from "react";
import { X, Link2, AlertCircle, CornerDownRight, Clock, ShieldCheck, Calendar } from "lucide-react";
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
  const [linkType, setLinkType] = useState<"permanent" | "temporary">("permanent");
  const [duration, setDuration] = useState<string>("24h");
  const [customDate, setCustomDate] = useState<string>("");
  const [customTime, setCustomTime] = useState<string>("18:00");
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

  // Set default custom date to tomorrow
  useEffect(() => {
    if (!customDate) {
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const isoDate = tomorrow.toISOString().slice(0, 10);
      setCustomDate(isoDate);
    }
  }, [customDate]);

  if (!isOpen) return null;

  const cleanWebname = sanitizeSlug(webname);
  const previewPath = `${baseUrl}/${currentUser}/${cleanWebname || "name"}`;

  // Get formatted preview text for expiration
  const getExpirationPreview = () => {
    if (linkType === "permanent") return "♾️ Permanent";
    if (duration === "custom") {
      if (!customDate) return "⏳ Custom date";
      const combined = new Date(`${customDate}T${customTime || "00:00"}`);
      if (isNaN(combined.getTime())) return "⏳ Custom date";
      return `⏳ Expires ${combined.toLocaleDateString([], { month: "short", day: "numeric" })} at ${combined.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    }
    return `⏳ Expires in ${duration}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!cleanWebname) {
      setError("Please enter a name (e.g. linkedin)");
      return;
    }
    if (!destinationUrl.trim()) {
      setError("Please enter the destination website URL");
      return;
    }

    let customTimestamp: Date | null = null;
    if (linkType === "temporary" && duration === "custom") {
      if (!customDate || !customTime) {
        setError("Please enter both the expiration date and time");
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
      const payload: {
        webname: string;
        destinationUrl: string;
        duration?: string;
        expiresAt?: string;
      } = {
        webname: cleanWebname,
        destinationUrl: destinationUrl.trim(),
      };

      if (linkType === "temporary") {
        if (duration === "custom" && customTimestamp) {
          payload.expiresAt = customTimestamp.toISOString();
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
        throw new Error(data.error || "Failed to create link");
      }

      setWebname("");
      setDestinationUrl("");
      setLinkType("permanent");
      setDuration("24h");
      onCreated();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const minDate = new Date().toISOString().slice(0, 10);

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
              <p className="text-xs text-neutral-500">Create a permanent or temporary expiring link</p>
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

        <form onSubmit={handleSubmit} className="mt-5 space-y-4 font-sans">
          {/* Link Type Selector: Permanent vs Temporary */}
          <div>
            <label className="block text-xs font-semibold text-neutral-800 mb-1.5">
              Link Type
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

              {/* Step 1: Date, Step 2: Time Side-by-Side */}
              {duration === "custom" && (
                <div className="pt-2.5 border-t border-neutral-200/80 space-y-2">
                  <span className="block text-[11px] font-semibold text-neutral-600">
                    Set Expiration Date & Time:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {/* 1. Date */}
                    <div>
                      <label className="block text-[10px] font-semibold text-neutral-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-neutral-700" />
                        1. Select Date
                      </label>
                      <input
                        type="date"
                        min={minDate}
                        value={customDate}
                        onChange={(e) => setCustomDate(e.target.value)}
                        required={duration === "custom"}
                        className="w-full px-3 py-2 text-xs font-medium bg-white border border-neutral-300 rounded-xl text-neutral-900 focus:outline-none focus:border-black focus:ring-1 focus:ring-black shadow-sm"
                      />
                    </div>

                    {/* 2. Time */}
                    <div>
                      <label className="block text-[10px] font-semibold text-neutral-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-neutral-700" />
                        2. Select Time
                      </label>
                      <input
                        type="time"
                        value={customTime}
                        onChange={(e) => setCustomTime(e.target.value)}
                        required={duration === "custom"}
                        className="w-full px-3 py-2 text-xs font-medium bg-white border border-neutral-300 rounded-xl text-neutral-900 focus:outline-none focus:border-black focus:ring-1 focus:ring-black shadow-sm"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-neutral-800 mb-1.5">
              Name
            </label>
            <input
              type="text"
              value={webname}
              onChange={(e) => setWebname(e.target.value)}
              placeholder="e.g. linkedin, promo, resume, pass"
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
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] text-neutral-500 uppercase tracking-wider font-semibold">
                Live Preview
              </span>
              <span className="text-[10px] font-mono text-neutral-600 font-medium">
                {getExpirationPreview()}
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
