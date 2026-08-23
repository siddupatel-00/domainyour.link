"use client";

import { useState, useEffect } from "react";
import { Employee } from "@/lib/db/schema";
import { X, Edit2, AlertCircle, Eye, Check } from "lucide-react";

interface EditEmployeeModalProps {
  employee: Employee | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void;
}

export function EditEmployeeModal({
  employee,
  isOpen,
  onClose,
  onUpdated,
}: EditEmployeeModalProps) {
  const [role, setRole] = useState("Insights Viewer");
  const [status, setStatus] = useState<"active" | "suspended">("active");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (employee && isOpen) {
      setRole(employee.role || "Insights Viewer");
      setStatus(employee.status as "active" | "suspended");
      setError(null);
    }
  }, [employee, isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !employee) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`/api/ceo/employees/${employee.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: role.trim() || "Insights Viewer",
          status,
          permissions: ["view_insights"],
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update employee");
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-150 cursor-pointer overflow-y-auto"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-7 sm:p-8 shadow-2xl cursor-default font-sans my-8 text-neutral-900 dark:text-white"
      >
        <div className="flex items-center justify-between pb-4 border-b border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-black dark:bg-white text-white dark:text-black flex items-center justify-center font-bold">
              <Edit2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-900 dark:text-white">Edit Employee Access</h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">{employee.name || employee.email} ({employee.email})</p>
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
          <div className="mt-4 p-3.5 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600 dark:text-red-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Status Switcher */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
              Account Status
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setStatus("active")}
                className={`p-3 rounded-xl border text-left transition flex items-center justify-between cursor-pointer ${
                  status === "active"
                    ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 ring-1 ring-emerald-500"
                    : "border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 hover:border-neutral-300 dark:hover:border-neutral-700"
                }`}
              >
                <div>
                  <div className="text-xs font-bold text-neutral-900 dark:text-white">Active</div>
                  <div className="text-[10px] text-neutral-500 dark:text-neutral-400">Can view insights</div>
                </div>
                {status === "active" && (
                  <div className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center flex-shrink-0">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </div>
                )}
              </button>

              <button
                type="button"
                onClick={() => setStatus("suspended")}
                className={`p-3 rounded-xl border text-left transition flex items-center justify-between cursor-pointer ${
                  status === "suspended"
                    ? "border-red-500 bg-red-50 dark:bg-red-950/40 ring-1 ring-red-500"
                    : "border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 hover:border-neutral-300 dark:hover:border-neutral-700"
                }`}
              >
                <div>
                  <div className="text-xs font-bold text-neutral-900 dark:text-white">Suspended</div>
                  <div className="text-[10px] text-neutral-500 dark:text-neutral-400">Access paused</div>
                </div>
                {status === "suspended" && (
                  <div className="w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center flex-shrink-0">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </div>
                )}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
              Role Title
            </label>
            <input
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="e.g. Insights Viewer"
              className="w-full px-3.5 py-2.5 text-xs bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-xl text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:border-black dark:focus:border-white transition font-medium"
            />
          </div>

          {/* Access Scope Notice */}
          <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-xs space-y-2">
            <span className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400" />
              <span>What this employee can see:</span>
            </span>
            <ul className="space-y-1 text-[11px] text-neutral-500 dark:text-neutral-400 pl-4 list-disc">
              <li>How many people used the app (total count)</li>
              <li>Total links created & expired/deleted counts</li>
              <li>Worldwide clicks & traffic timeframe insights</li>
              <li className="text-emerald-600 dark:text-emerald-400 font-medium">No creator names or private user accounts</li>
            </ul>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-neutral-100 dark:border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-medium text-neutral-600 hover:text-black dark:text-neutral-400 dark:hover:text-white border border-neutral-200 dark:border-neutral-800 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-800 transition cursor-pointer"
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
