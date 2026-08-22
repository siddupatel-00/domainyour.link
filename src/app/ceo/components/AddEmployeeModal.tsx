"use client";

import { useState, useEffect } from "react";
import { X, UserPlus, AlertCircle, Shield, Check } from "lucide-react";

interface AddEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const availableRoles = [
  { id: "Support Moderator", desc: "User tickets & support" },
  { id: "Link Manager", desc: "Inspect & moderate links" },
  { id: "Lead Analyst", desc: "View all worldwide metrics" },
  { id: "Operations Admin", desc: "Full administrative operations" },
];

export function AddEmployeeModal({
  isOpen,
  onClose,
  onCreated,
}: AddEmployeeModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("Support Moderator");
  const [permissions, setPermissions] = useState<string[]>([
    "view_links",
    "manage_support",
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setName("");
      setEmail("");
      setRole("Support Moderator");
      setPermissions(["view_links", "manage_support"]);
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
          role: role.trim(),
          permissions,
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
        className="relative w-full max-w-lg rounded-3xl bg-neutral-900 border border-neutral-800 p-7 sm:p-8 shadow-2xl cursor-default font-sans my-8 text-white"
      >
        <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white text-black flex items-center justify-center font-bold">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Add Team Member</h2>
              <p className="text-xs text-neutral-400">Grant authorized access to an employee</p>
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

          {/* Clean Segmented Role Selector */}
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
              Assign Role
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {availableRoles.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setRole(r.id)}
                  className={`p-3 rounded-xl border text-left transition flex items-start justify-between cursor-pointer ${
                    role === r.id
                      ? "border-white bg-neutral-800 ring-1 ring-white"
                      : "border-neutral-800 bg-neutral-950 hover:border-neutral-700"
                  }`}
                >
                  <div>
                    <div className="text-xs font-bold text-white">{r.id}</div>
                    <div className="text-[10px] text-neutral-400 mt-0.5">{r.desc}</div>
                  </div>
                  {role === r.id && (
                    <div className="w-4 h-4 rounded-full bg-white text-black flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Permissions Checklist */}
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1.5 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-neutral-400" />
              <span>Permissions & Capabilities</span>
            </label>
            <div className="space-y-1.5 p-3 rounded-2xl bg-neutral-950 border border-neutral-800 text-xs">
              {[
                { key: "view_links", label: "View worldwide links & traffic analytics" },
                { key: "manage_support", label: "Handle support & user requests" },
                { key: "manage_redirects", label: "Inspect & moderate active redirects" },
              ].map((p) => {
                const isSelected = permissions.includes(p.key);
                return (
                  <div
                    key={p.key}
                    onClick={() => togglePermission(p.key)}
                    className="flex items-center gap-2.5 cursor-pointer py-1 select-none hover:text-white transition text-neutral-300"
                  >
                    <div
                      className={`w-4 h-4 rounded-md border flex items-center justify-center transition flex-shrink-0 ${
                        isSelected
                          ? "bg-white border-white text-black"
                          : "border-neutral-700 bg-neutral-900"
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <span className="font-medium text-xs">{p.label}</span>
                  </div>
                );
              })}
            </div>
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
