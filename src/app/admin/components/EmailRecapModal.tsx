"use client";

import { useState, useEffect } from "react";
import {
  X,
  Mail,
  CheckCircle2,
  AlertCircle,
  Send,
  Sparkles,
} from "lucide-react";

interface EmailRecapModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: string;
}

export function EmailRecapModal({
  isOpen,
  onClose,
  currentUser,
}: EmailRecapModalProps) {
  const [weeklyRecap, setWeeklyRecap] = useState(false);
  const [monthlyRecap, setMonthlyRecap] = useState(false);
  const [email, setEmail] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testSending, setTestSending] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setMessage(null);
    const fetchSettings = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/user/settings", {
          cache: "no-store",
          headers: { "Cache-Control": "no-cache" },
        });
        if (res.ok) {
          const data = await res.json();
          setWeeklyRecap(!!data.weeklyRecap);
          setMonthlyRecap(!!data.monthlyRecap);
          setEmail(data.email || "");
        }
      } catch (err) {
        console.error("Failed to load user settings:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleToggle = async (type: "weekly" | "monthly") => {
    const nextWeekly = type === "weekly" ? !weeklyRecap : weeklyRecap;
    const nextMonthly = type === "monthly" ? !monthlyRecap : monthlyRecap;

    setWeeklyRecap(nextWeekly);
    setMonthlyRecap(nextMonthly);
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/user/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weeklyRecap: nextWeekly,
          monthlyRecap: nextMonthly,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update preference");
      setMessage({ text: data.message || "Preferences updated", type: "success" });
    } catch (err: unknown) {
      setMessage({ text: err instanceof Error ? err.message : "Failed to update", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleSendTest = async () => {
    setTestSending(true);
    setMessage(null);
    try {
      const res = await fetch("/api/user/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sendTest: true,
          recapPreference: monthlyRecap && !weeklyRecap ? "monthly" : "weekly",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send test recap");
      setMessage({ text: data.message || "Test email dispatched successfully!", type: "success" });
    } catch (err: unknown) {
      setMessage({ text: err instanceof Error ? err.message : "Failed to send test email", type: "error" });
    } finally {
      setTestSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150 font-sans">
      <div
        className="w-full max-w-[420px] rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xl p-6 sm:p-7 space-y-6 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h2 className="text-lg font-bold tracking-tight text-neutral-900 dark:text-white">
              Email Digest
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {email ? (
                <>
                  Delivering to <span className="font-mono text-neutral-700 dark:text-neutral-300 font-medium">{email}</span>
                </>
              ) : (
                "Automated analytics sent to your inbox"
              )}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-xl text-neutral-400 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Status Message */}
        {message && (
          <div
            className={`p-3 rounded-2xl text-xs flex items-center gap-2.5 transition-all ${
              message.type === "success"
                ? "bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white"
                : "bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300"
            }`}
          >
            {message.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
            )}
            <span className="font-medium">{message.text}</span>
          </div>
        )}

        {/* Toggle List Rows */}
        <div className="divide-y divide-neutral-100 dark:divide-neutral-800/80 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/50">
          {/* Row 1: Weekly */}
          <div
            onClick={() => !saving && handleToggle("weekly")}
            className="p-4 flex items-center justify-between gap-4 cursor-pointer hover:bg-neutral-100/50 dark:hover:bg-neutral-800/30 transition first:rounded-t-2xl select-none"
          >
            <div className="space-y-0.5 min-w-0 flex-1">
              <div className="text-xs font-semibold text-neutral-900 dark:text-white flex items-center gap-1.5">
                <span>Weekly Recap</span>
              </div>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                Every Monday • 7-day traffic & top links
              </p>
            </div>

            {/* iOS style toggle switch */}
            <div
              className={`w-11 h-6 flex items-center rounded-full p-0.5 transition-colors duration-200 ease-in-out ${
                weeklyRecap
                  ? "bg-black dark:bg-white"
                  : "bg-neutral-200 dark:bg-neutral-700"
              }`}
            >
              <div
                className={`bg-white dark:bg-black w-5 h-5 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                  weeklyRecap ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </div>
          </div>

          {/* Row 2: Monthly */}
          <div
            onClick={() => !saving && handleToggle("monthly")}
            className="p-4 flex items-center justify-between gap-4 cursor-pointer hover:bg-neutral-100/50 dark:hover:bg-neutral-800/30 transition last:rounded-b-2xl select-none"
          >
            <div className="space-y-0.5 min-w-0 flex-1">
              <div className="text-xs font-semibold text-neutral-900 dark:text-white flex items-center gap-1.5">
                <span>Monthly Digest</span>
              </div>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                1st of each month • Complete 30-day report
              </p>
            </div>

            {/* iOS style toggle switch */}
            <div
              className={`w-11 h-6 flex items-center rounded-full p-0.5 transition-colors duration-200 ease-in-out ${
                monthlyRecap
                  ? "bg-black dark:bg-white"
                  : "bg-neutral-200 dark:bg-neutral-700"
              }`}
            >
              <div
                className={`bg-white dark:bg-black w-5 h-5 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                  monthlyRecap ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-1">
          <button
            type="button"
            onClick={handleSendTest}
            disabled={testSending || loading}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:text-black dark:hover:text-white bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 border border-neutral-200 dark:border-neutral-700 transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
          >
            <Send className={`w-3 h-3 ${testSending ? "animate-spin" : ""}`} />
            <span>{testSending ? "Sending..." : "Send Test"}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold text-white dark:text-black bg-black dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-200 rounded-xl transition shadow-sm cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
