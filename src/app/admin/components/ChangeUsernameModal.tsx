"use client";

import { useState, useEffect, useRef } from "react";
import { X, UserCheck, AlertCircle, Check, Loader2, Sparkles } from "lucide-react";
import { sanitizeSlug } from "@/lib/utils";

interface ChangeUsernameModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUsername: string;
  onUsernameChanged: (newUsername: string) => void;
}

export function ChangeUsernameModal({
  isOpen,
  onClose,
  currentUsername,
  onUsernameChanged,
}: ChangeUsernameModalProps) {
  const [newUsername, setNewUsername] = useState("");
  const [status, setStatus] = useState<"idle" | "checking" | "available" | "taken" | "reserved" | "same" | "invalid">("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isOpen) {
      setNewUsername("");
      setStatus("idle");
      setStatusMessage("");
      setError(null);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const cleanInput = sanitizeSlug(newUsername);

  // Live real-time username availability check
  useEffect(() => {
    if (!isOpen) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!cleanInput) {
      setStatus("idle");
      setStatusMessage("");
      return;
    }

    if (cleanInput.toLowerCase() === currentUsername.toLowerCase()) {
      setStatus("same");
      setStatusMessage("This is your current username");
      return;
    }

    if (cleanInput.length < 3) {
      setStatus("invalid");
      setStatusMessage("Must be at least 3 characters");
      return;
    }

    setStatus("checking");
    setStatusMessage("Checking availability...");

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/auth/check-username?username=${encodeURIComponent(cleanInput)}&t=${Date.now()}`);
        const data = await res.json();

        if (data.available) {
          setStatus("available");
          setStatusMessage(`@${cleanInput} is available!`);
        } else {
          if (data.error?.toLowerCase().includes("reserved") || data.message?.toLowerCase().includes("reserved")) {
            setStatus("reserved");
            setStatusMessage("This username is reserved");
          } else {
            setStatus("taken");
            setStatusMessage("Username already taken");
          }
        }
      } catch {
        setStatus("idle");
      }
    }, 280);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [cleanInput, currentUsername, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cleanInput || cleanInput.length < 3) {
      setError("Username must be at least 3 characters");
      return;
    }

    if (status === "taken" || status === "reserved" || status === "invalid" || status === "same") {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/user/username", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newUsername: cleanInput }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update username");
      }

      onUsernameChanged(cleanInput);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to change username");
    } finally {
      setLoading(false);
    }
  };

  const isSaveDisabled =
    loading ||
    !cleanInput ||
    cleanInput.length < 3 ||
    status === "checking" ||
    status === "taken" ||
    status === "reserved" ||
    status === "same";

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150 cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-6 sm:p-7 shadow-2xl cursor-default font-sans space-y-4 animate-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-black dark:bg-white text-white dark:text-black flex items-center justify-center font-bold shadow-xs">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-900 dark:text-white">Change Username</h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">Current handle: @{currentUsername}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-800 dark:text-neutral-200 mb-1.5">
              New Username
            </label>
            <div className="flex items-center rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-3.5 py-2.5 focus-within:border-black dark:focus-within:border-white focus-within:ring-1 focus-within:ring-black dark:focus-within:ring-white transition">
              <span className="text-xs text-neutral-400 font-mono select-none">@</span>
              <input
                type="text"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="newusername"
                autoFocus
                required
                className="w-full text-xs bg-transparent text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-600 focus:outline-none ml-1 font-mono font-medium"
              />
              {status === "checking" && <Loader2 className="w-3.5 h-3.5 animate-spin text-neutral-400" />}
              {status === "available" && <Check className="w-3.5 h-3.5 text-emerald-500 font-bold" />}
              {(status === "taken" || status === "reserved" || status === "invalid") && (
                <X className="w-3.5 h-3.5 text-red-500" />
              )}
            </div>

            {/* Live status badge */}
            {statusMessage && (
              <p
                className={`text-[11px] mt-1.5 font-medium ${
                  status === "available"
                    ? "text-emerald-600 dark:text-emerald-400"
                    : status === "checking"
                    ? "text-neutral-400"
                    : "text-red-500 dark:text-red-400"
                }`}
              >
                {statusMessage}
              </p>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-black dark:hover:text-white rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaveDisabled}
              className="px-5 py-2 text-xs font-semibold text-white dark:text-black bg-black dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-200 rounded-xl transition disabled:opacity-50 shadow-sm cursor-pointer inline-flex items-center gap-1.5"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{loading ? "Updating..." : "Save Username"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
