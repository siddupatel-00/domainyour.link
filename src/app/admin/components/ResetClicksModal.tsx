"use client";

import { useState } from "react";
import { Redirect } from "@/lib/db/schema";
import { X, RotateCcw, AlertTriangle } from "lucide-react";

interface ResetClicksModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetRedirect: Redirect | null; // null means reset all links
  onConfirm: () => Promise<void>;
}

export function ResetClicksModal({
  isOpen,
  onClose,
  targetRedirect,
  onConfirm,
}: ResetClicksModalProps) {
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const isBulk = targetRedirect === null;
  const linkLabel = isBulk ? "All Links" : `/${targetRedirect.username}/${targetRedirect.webname}`;
  const currentClicks = isBulk ? "all link traffic" : `${targetRedirect.clickCount || 0} visits`;

  const handleReset = async () => {
    setLoading(true);
    try {
      await onConfirm();
      onClose();
    } catch (err) {
      console.error("Reset clicks error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150 font-sans">
      <div
        className="w-full max-w-md rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xl p-6 sm:p-7 space-y-5 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900/50 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                Reset Analytics to 0
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Clear click counts and traffic logs
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-neutral-400 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Target details box */}
        <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 space-y-1.5">
          <span className="text-[10px] uppercase font-semibold tracking-wider text-neutral-400 dark:text-neutral-500">
            {isBulk ? "Bulk Action" : "Target Link"}
          </span>
          <div className="font-mono font-bold text-sm text-neutral-900 dark:text-white break-all">
            {linkLabel}
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Current traffic: <span className="font-semibold text-neutral-700 dark:text-neutral-300 font-mono">{currentClicks}</span>
          </p>
        </div>

        {/* Warning text */}
        <div className="flex items-start gap-2.5 text-xs text-neutral-600 dark:text-neutral-400">
          <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            {isBulk
              ? "This will reset click counts to 0 for all your permanent links and sub-links. This action cannot be undone."
              : "This will reset the total click count back to 0 and erase historical visit timestamps for this specific link."}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-neutral-100 dark:border-neutral-800">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2.5 text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleReset}
            disabled={loading}
            className="px-5 py-2.5 text-xs font-semibold text-white bg-black dark:bg-white dark:text-black hover:bg-neutral-800 dark:hover:bg-neutral-200 rounded-xl transition shadow-sm inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>{loading ? "Resetting..." : "Reset to 0 Clicks"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
