"use client";

import { useState, useEffect } from "react";
import { LinkGroup } from "@/lib/db/schema";
import {
  X,
  Share2,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Clock,
  Calendar,
  Eye,
  EyeOff,
  AlertCircle,
} from "lucide-react";

interface ShareGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: LinkGroup | null;
  baseUrl: string;
  onSaveShareSettings: (
    groupId: number,
    data: {
      isShared: boolean;
      shareCode?: string;
      duration?: string;
      expiresAt?: string | null;
    }
  ) => Promise<void>;
}

export function ShareGroupModal({
  isOpen,
  onClose,
  group,
  baseUrl,
  onSaveShareSettings,
}: ShareGroupModalProps) {
  const [isShared, setIsShared] = useState(true);
  const [shareCode, setShareCode] = useState("");
  const [linkType, setLinkType] = useState<"permanent" | "temporary">("permanent");
  const [duration, setDuration] = useState<string>("24h");
  const [customDate, setCustomDate] = useState<string>("");
  const [customTime, setCustomTime] = useState<string>("18:00");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateRandomCode = () => {
    const chars = "abcdefghjkmnpqrstuvwxyz23456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  useEffect(() => {
    if (group) {
      setIsShared(group.isShared !== false);
      setShareCode(group.shareCode || generateRandomCode());
      if (group.expiresAt) {
        setLinkType("temporary");
        const d = new Date(group.expiresAt);
        setCustomDate(d.toISOString().slice(0, 10));
        setCustomTime(d.toTimeString().slice(0, 5));
        setDuration("custom");
      } else {
        setLinkType("permanent");
        setDuration("24h");
      }
    }
    setCopied(false);
    setError(null);
  }, [group, isOpen]);

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

  if (!isOpen || !group) return null;

  const fullShareUrl = `${baseUrl}/g/${shareCode}`;
  const minDate = new Date().toISOString().slice(0, 10);

  const handleCopy = () => {
    navigator.clipboard.writeText(fullShareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    let customTimestamp: Date | null = null;
    if (isShared && linkType === "temporary" && duration === "custom") {
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
      const payload: {
        isShared: boolean;
        shareCode?: string;
        duration?: string;
        expiresAt?: string | null;
      } = {
        isShared,
        shareCode: shareCode.trim().toLowerCase(),
      };

      if (!isShared || linkType === "permanent") {
        payload.duration = "permanent";
        payload.expiresAt = null;
      } else if (duration === "custom" && customTimestamp) {
        payload.expiresAt = customTimestamp.toISOString();
      } else {
        payload.duration = duration;
      }

      await onSaveShareSettings(group.id, payload);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update sharing settings");
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
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold"
              style={{ backgroundColor: group.color || "#000000" }}
            >
              <Share2 className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                <span>Share Group:</span>
                <span className="text-black dark:text-white underline decoration-neutral-300 dark:decoration-neutral-700">
                  {group.name}
                </span>
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Share this link collection
              </p>
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
          {/* 1. Sharing Switch (On / Off) */}
          <div className="p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-950/60 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  isShared
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "bg-neutral-200 dark:bg-neutral-800 text-neutral-500"
                }`}
              >
                {isShared ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </div>
              <div>
                <div className="text-xs font-bold text-neutral-900 dark:text-white">
                  {isShared ? "Public Sharing is Active" : "Sharing is Turned Off"}
                </div>
                <div className="text-[11px] text-neutral-500 dark:text-neutral-400">
                  {isShared
                    ? "Anyone with this link can view links in this group"
                    : "The share link is disabled and private"}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsShared(!isShared)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                isShared ? "bg-black dark:bg-white" : "bg-neutral-300 dark:bg-neutral-700"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white dark:bg-black transition-transform ${
                  isShared ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {/* 2. Share Link Box */}
          {isShared && (
            <div className="space-y-1.5 animate-in fade-in duration-200">
              <label className="block text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                Share Link
              </label>

              <div className="flex items-center gap-2 p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-100/70 dark:bg-neutral-950 font-mono text-xs text-neutral-900 dark:text-white">
                <span className="truncate flex-1 font-medium">{fullShareUrl}</span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="p-1.5 rounded-lg bg-black dark:bg-white text-white dark:text-black hover:bg-neutral-800 dark:hover:bg-neutral-200 transition cursor-pointer flex items-center gap-1 text-[11px] font-sans font-bold flex-shrink-0"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
                <a
                  href={`/g/${shareCode}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:text-black dark:hover:text-white hover:bg-neutral-200/50 dark:hover:bg-neutral-800 transition cursor-pointer flex-shrink-0"
                  title="Preview public group page"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          )}

          {/* 3. Expiration Mode (Permanent vs Temporary) */}
          {isShared && (
            <div className="space-y-3 pt-1 animate-in fade-in duration-200">
              <label className="block text-xs font-semibold text-neutral-800 dark:text-neutral-200">
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
                    <div className="text-[10px] text-neutral-500 dark:text-neutral-400">Never expires</div>
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

              {/* Temporary duration presets or custom date */}
              {linkType === "temporary" && (
                <div className="space-y-3 p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/50">
                  <div className="grid grid-cols-5 gap-1.5">
                    {[
                      { id: "1h", label: "1 Hour" },
                      { id: "24h", label: "24 Hours" },
                      { id: "7d", label: "7 Days" },
                      { id: "30d", label: "30 Days" },
                      { id: "custom", label: "Custom" },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setDuration(opt.id)}
                        className={`py-1.5 px-2 text-[11px] font-semibold rounded-lg border transition cursor-pointer ${
                          duration === opt.id
                            ? "bg-black dark:bg-white text-white dark:text-black border-black dark:border-white"
                            : "bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  {duration === "custom" && (
                    <div className="grid grid-cols-2 gap-2 pt-1 animate-in fade-in duration-150">
                      <div>
                        <label className="block text-[10px] font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                          Date
                        </label>
                        <div className="relative">
                          <input
                            type="date"
                            min={minDate}
                            value={customDate}
                            onChange={(e) => setCustomDate(e.target.value)}
                            required
                            className="w-full px-3 py-2 text-xs bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white focus:outline-none focus:border-black dark:focus:border-white"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                          Time
                        </label>
                        <input
                          type="time"
                          value={customTime}
                          onChange={(e) => setCustomTime(e.target.value)}
                          required
                          className="w-full px-3 py-2 text-xs bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white focus:outline-none focus:border-black dark:focus:border-white"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 text-xs font-bold text-white dark:text-black bg-black dark:bg-white rounded-xl hover:bg-neutral-800 dark:hover:bg-neutral-200 transition shadow-sm cursor-pointer disabled:opacity-50"
            >
              {loading ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
