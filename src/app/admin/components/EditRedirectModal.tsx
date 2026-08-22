"use client";

import { useState, useEffect } from "react";
import { X, Edit3, AlertCircle, Clock, ShieldCheck, Calendar } from "lucide-react";
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
  const [linkType, setLinkType] = useState<"permanent" | "temporary">("permanent");
  const [duration, setDuration] = useState<string>("24h");
  const [customDate, setCustomDate] = useState<string>("");
  const [customTime, setCustomTime] = useState<string>("18:00");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (redirect) {
      setDestinationUrl(redirect.destinationUrl);
      if (redirect.expiresAt) {
        setLinkType("temporary");
        setDuration("custom");
        const date = new Date(redirect.expiresAt);
        const isoDate = date.toISOString().slice(0, 10);
        const hours = String(date.getHours()).padStart(2, "0");
        const mins = String(date.getMinutes()).padStart(2, "0");
        setCustomDate(isoDate);
        setCustomTime(`${hours}:${mins}`);
      } else {
        setLinkType("permanent");
        setDuration("24h");
        const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
        setCustomDate(tomorrow.toISOString().slice(0, 10));
      }
      setError(null);
    }
  }, [redirect]);

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
  const isExpired = redirect.expiresAt && new Date(redirect.expiresAt).getTime() <= Date.now();
  const minDate = new Date().toISOString().slice(0, 10);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!destinationUrl.trim()) {
      setError("Destination website URL cannot be empty");
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
        destinationUrl: string;
        duration?: string;
        expiresAt?: string | null;
      } = {
        destinationUrl: destinationUrl.trim(),
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150 cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg rounded-3xl bg-white border border-neutral-200 p-7 sm:p-8 shadow-2xl cursor-default font-sans"
      >
        <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-black text-white flex items-center justify-center font-bold">
              <Edit3 className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-900">
                {isExpired ? "Reactivate / Edit Link" : "Edit Link"}
              </h2>
              <p className="text-xs text-neutral-500">Update destination or link expiration</p>
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
          <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 text-xs font-mono">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-neutral-500 uppercase tracking-wider font-semibold">
                Your Link
              </span>
              {isExpired ? (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-200 text-neutral-800 font-semibold font-sans">
                  ⏳ Expired
                </span>
              ) : (
                <span className="text-[10px] text-neutral-500 font-sans">
                  {redirect.expiresAt ? "Temporary" : "Permanent"}
                </span>
              )}
            </div>
            <span className="text-neutral-900 font-bold">{publicLink}</span>
          </div>

          {/* Link Type Toggle */}
          <div>
            <label className="block text-xs font-semibold text-neutral-800 mb-1.5">
              Expiration Setting
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
                  <div className="text-xs font-bold text-neutral-900">Make Permanent</div>
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
                  <div className="text-xs font-bold text-neutral-900">
                    {isExpired ? "Reactivate (Temporary)" : "Temporary"}
                  </div>
                  <div className="text-[10px] text-neutral-500">Set new duration</div>
                </div>
              </button>
            </div>
          </div>

          {/* Duration Selector with Custom Button */}
          {linkType === "temporary" && (
            <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-3">
              <label className="block text-xs font-semibold text-neutral-800">
                Extend / Set Duration:
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
              Where should this link go?
            </label>
            <input
              type="text"
              value={destinationUrl}
              onChange={(e) => setDestinationUrl(e.target.value)}
              placeholder="https://newdestination.com"
              required
              className="w-full px-3.5 py-2.5 text-xs bg-white border border-neutral-300 rounded-xl text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
            />
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
              {loading ? "Updating..." : isExpired ? "Reactivate Link" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
