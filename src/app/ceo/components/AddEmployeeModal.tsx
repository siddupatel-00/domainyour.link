"use client";

import { useState, useEffect } from "react";
import { X, UserPlus, AlertCircle, Eye, ShieldCheck, Check } from "lucide-react";

interface AddEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function AddEmployeeModal({
  isOpen,
  onClose,
  onCreated,
}: AddEmployeeModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("Insights Viewer");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setName("");
      setEmail("");
      setRole("Insights Viewer");
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

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !email.trim()) {
      setError("Please fill in both name and work email");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/ceo/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          role: role.trim() || "Insights Viewer",
          permissions: ["view_insights"],
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to add employee");
      }

      onCreated();
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-150 cursor-pointer overflow-y-auto"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md rounded-3xl bg-neutral-900 border border-neutral-800 p-7 sm:p-8 shadow-2xl cursor-default font-sans my-8 text-white"
      >
        <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white text-black flex items-center justify-center font-bold">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Add Team Member</h2>
              <p className="text-xs text-neutral-400">Grant insights view access to an employee</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3.5 rounded-xl border border-red-900/50 bg-red-950/30 text-red-300 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
              Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Alex Vance"
              autoFocus
              required
              className="w-full px-3.5 py-2.5 text-xs bg-neutral-950 border border-neutral-800 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:border-white transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
              Work Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. alex@company.com"
              required
              className="w-full px-3.5 py-2.5 text-xs bg-neutral-950 border border-neutral-800 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:border-white transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
              Role Title
            </label>
            <input
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="e.g. Insights Viewer"
              className="w-full px-3.5 py-2.5 text-xs bg-neutral-950 border border-neutral-800 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:border-white transition font-medium"
            />
          </div>

          {/* Access Scope Notice */}
          <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 text-xs space-y-2">
            <span className="text-[11px] font-semibold text-neutral-300 flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-neutral-400" />
              <span>What this employee can see:</span>
            </span>
            <ul className="space-y-1 text-[11px] text-neutral-400 pl-4 list-disc">
              <li>How many people used the app (total count)</li>
              <li>Total links created & expired/deleted counts</li>
              <li>Worldwide clicks & traffic timeframe insights</li>
              <li className="text-emerald-400 font-medium">No creator names or private user accounts</li>
            </ul>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-medium text-neutral-400 hover:text-white border border-neutral-800 rounded-xl hover:bg-neutral-800 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-semibold text-black bg-white hover:bg-neutral-200 rounded-xl transition disabled:opacity-50 shadow-sm cursor-pointer"
            >
              {loading ? "Adding..." : "Add Employee"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
