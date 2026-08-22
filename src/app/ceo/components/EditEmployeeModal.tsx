"use client";

import { useState, useEffect } from "react";
import { X, Edit2, AlertCircle, Shield, Check } from "lucide-react";
import { Employee } from "@/lib/db/schema";

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
  const [role, setRole] = useState("Support Moderator");
  const [status, setStatus] = useState("active");
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (employee && isOpen) {
      setRole(employee.role || "Support Moderator");
      setStatus(employee.status || "active");
      try {
        const parsed = JSON.parse(employee.permissions);
        setPermissions(Array.isArray(parsed) ? parsed : ["view_links", "manage_support"]);
      } catch {
        setPermissions(["view_links", "manage_support"]);
      }
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

  const togglePermission = (key: string) => {
    if (permissions.includes(key)) {
      setPermissions(permissions.filter((p) => p !== key));
    } else {
      setPermissions([...permissions, key]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`/api/ceo/employees/${employee.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: role.trim(),
          status: status.trim(),
          permissions,
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150 cursor-pointer overflow-y-auto"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md rounded-3xl bg-white border border-neutral-200 p-7 sm:p-8 shadow-2xl cursor-default font-sans my-8"
      >
        <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-black text-white flex items-center justify-center font-bold">
              <Edit2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-900">Edit Access: {employee.name}</h2>
              <p className="text-xs text-neutral-500 font-mono">{employee.email}</p>
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
          <div>
            <label className="block text-xs font-semibold text-neutral-800 mb-1.5">
              Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs bg-white border border-neutral-300 rounded-xl text-neutral-900 focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
            >
              <option value="Support Moderator">Support Moderator</option>
              <option value="Link Manager">Link Manager</option>
              <option value="Lead Analyst">Lead Analyst</option>
              <option value="Operations Admin">Operations Admin</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-800 mb-1.5">
              Account Status
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setStatus("active")}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold transition ${
                  status === "active"
                    ? "bg-black text-white border-black"
                    : "bg-white text-neutral-600 border-neutral-200 hover:border-neutral-300"
                }`}
              >
                Active
              </button>
              <button
                type="button"
                onClick={() => setStatus("suspended")}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold transition ${
                  status === "suspended"
                    ? "bg-neutral-800 text-white border-neutral-800"
                    : "bg-white text-neutral-600 border-neutral-200 hover:border-neutral-300"
                }`}
              >
                Suspended
              </button>
            </div>
          </div>

          {/* Permissions Checklist */}
          <div>
            <label className="block text-xs font-semibold text-neutral-800 mb-1.5 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-neutral-600" />
              <span>Assigned Permissions</span>
            </label>
            <div className="space-y-1.5 p-3 rounded-2xl bg-neutral-50 border border-neutral-200 text-xs">
              {[
                { key: "view_links", label: "View platform links & traffic analytics" },
                { key: "manage_support", label: "Handle support & user ticket requests" },
                { key: "manage_redirects", label: "Inspect & moderate active redirects" },
              ].map((p) => {
                const isSelected = permissions.includes(p.key);
                return (
                  <div
                    key={p.key}
                    onClick={() => togglePermission(p.key)}
                    className="flex items-center gap-2.5 cursor-pointer py-1 select-none"
                  >
                    <div
                      className={`w-4 h-4 rounded-md border flex items-center justify-center transition ${
                        isSelected
                          ? "bg-black border-black text-white"
                          : "border-neutral-300 bg-white"
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <span className="text-neutral-700 font-medium">{p.label}</span>
                  </div>
                );
              })}
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
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
