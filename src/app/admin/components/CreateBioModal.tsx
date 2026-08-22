"use client";

import { useState, useEffect } from "react";
import { X, Sparkles, AlertCircle, Clock, ShieldCheck, Calendar, Check, Link2 } from "lucide-react";
import { sanitizeSlug } from "@/lib/utils";
import { Redirect } from "@/lib/db/schema";

interface CreateBioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  baseUrl: string;
  currentUser: string;
  links: Redirect[];
}

export function CreateBioModal({
  isOpen,
  onClose,
  onCreated,
  baseUrl,
  currentUser,
  links,
}: CreateBioModalProps) {
  const [bioname, setBioname] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedLinkIds, setSelectedLinkIds] = useState<number[]>([]);
  const [linkType, setLinkType] = useState<"permanent" | "temporary">("permanent");
  const [duration, setDuration] = useState<string>("24h");
  const [customDate, setCustomDate] = useState<string>("");
  const [customTime, setCustomTime] = useState<string>("18:00");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Default select all active links
  useEffect(() => {
    if (isOpen) {
      setBioname("");
      setTitle("");
      setDescription("");
      const activeIds = links.filter((l) => !l.expiresAt || new Date(l.expiresAt).getTime() > Date.now()).map((l) => l.id);
      setSelectedLinkIds(activeIds);
      setLinkType("permanent");
      setDuration("24h");
      setError(null);
    }
  }, [isOpen, links]);

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
      setCustomDate(tomorrow.toISOString().slice(0, 10));
    }
  }, [customDate]);

  if (!isOpen) return null;

  const cleanBioname = sanitizeSlug(bioname);
  const previewPath = `${baseUrl}/${currentUser}/b/${cleanBioname || "name"}`;
  const minDate = new Date().toISOString().slice(0, 10);

  const toggleLinkId = (id: number) => {
    if (selectedLinkIds.includes(id)) {
      setSelectedLinkIds(selectedLinkIds.filter((x) => x !== id));
    } else {
      setSelectedLinkIds([...selectedLinkIds, id]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!cleanBioname) {
      setError("Please enter a bio name (e.g. work, socials, hackathon)");
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
        bioname: string;
        title?: string;
        description?: string;
        linkIds: number[];
        duration?: string;
        expiresAt?: string;
      } = {
        bioname: cleanBioname,
        title: title.trim() || cleanBioname,
        description: description.trim() || undefined,
        linkIds: selectedLinkIds,
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

      const res = await fetch("/api/bios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create bio page");
      }

      onCreated();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const activeLinks = links.filter((l) => !l.expiresAt || new Date(l.expiresAt).getTime() > Date.now());

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150 cursor-pointer overflow-y-auto"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg rounded-3xl bg-white border border-neutral-200 p-7 sm:p-8 shadow-2xl cursor-default font-sans my-8 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-black text-white flex items-center justify-center font-bold">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-900">Create Bio Page</h2>
              <p className="text-xs text-neutral-500">Add a permanent or temporary sub-bio with selected links</p>
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
          {/* Bio Name */}
          <div>
            <label className="block text-xs font-semibold text-neutral-800 mb-1.5">
              Bio Name
            </label>
            <input
              type="text"
              value={bioname}
              onChange={(e) => setBioname(e.target.value)}
              placeholder="e.g. work, socials, hackathon, recruiter"
              autoFocus
              required
              className="w-full px-3.5 py-2.5 text-xs bg-white border border-neutral-300 rounded-xl text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
            />
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-neutral-800 mb-1.5">
              Title / Heading (Optional)
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. My Portfolio & Tech Projects"
              className="w-full px-3.5 py-2.5 text-xs bg-white border border-neutral-300 rounded-xl text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-neutral-800 mb-1.5">
              Description (Optional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Frontend developer, open source creator"
              className="w-full px-3.5 py-2.5 text-xs bg-white border border-neutral-300 rounded-xl text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
            />
          </div>

          {/* Link Type Selector: Permanent vs Temporary */}
          <div>
            <label className="block text-xs font-semibold text-neutral-800 mb-1.5">
              Bio Expiration
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
                  <div className="text-xs font-bold text-neutral-900">Permanent Bio</div>
                  <div className="text-[10px] text-neutral-500">Always active</div>
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
                  <div className="text-xs font-bold text-neutral-900">Temporary Bio</div>
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

              {/* Step 1: Date, Step 2: Time */}
              {duration === "custom" && (
                <div className="pt-2.5 border-t border-neutral-200/80 space-y-2">
                  <span className="block text-[11px] font-semibold text-neutral-600">
                    Set Expiration Date & Time:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
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

          {/* Select Links to Include */}
          <div>
            <label className="block text-xs font-semibold text-neutral-800 mb-1.5 flex items-center justify-between">
              <span>Include Links in this Bio ({selectedLinkIds.length} selected)</span>
            </label>
            {activeLinks.length === 0 ? (
              <p className="text-xs text-neutral-400 p-3 rounded-xl bg-neutral-50 border border-neutral-200">
                No active links found. Create links in your dashboard first.
              </p>
            ) : (
              <div className="space-y-1.5 max-h-40 overflow-y-auto p-2 rounded-2xl bg-neutral-50 border border-neutral-200">
                {activeLinks.map((link) => {
                  const isSelected = selectedLinkIds.includes(link.id);
                  return (
                    <div
                      key={link.id}
                      onClick={() => toggleLinkId(link.id)}
                      className={`p-2.5 rounded-xl border text-xs flex items-center justify-between gap-2 cursor-pointer transition select-none ${
                        isSelected
                          ? "bg-white border-black text-black font-semibold shadow-2xs"
                          : "bg-white/60 border-neutral-200 text-neutral-500"
                      }`}
                    >
                      <div className="min-w-0 flex items-center gap-2">
                        <div
                          className={`w-4 h-4 rounded-md border flex items-center justify-center ${
                            isSelected ? "bg-black border-black text-white" : "border-neutral-300 bg-white"
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <span className="font-mono truncate">/{link.webname}</span>
                      </div>
                      <span className="text-[10px] text-neutral-400 font-mono truncate max-w-[140px]">
                        {link.destinationUrl}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Preview */}
          <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200 text-xs">
            <span className="text-[10px] text-neutral-500 uppercase tracking-wider font-semibold block mb-1">
              Public Bio Link URL
            </span>
            <div className="font-mono font-bold text-neutral-900 truncate">{previewPath}</div>
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
              <Sparkles className="w-3.5 h-3.5" />
              <span>{loading ? "Creating..." : "Create Bio Page"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
