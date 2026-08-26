"use client";

import { useState, useEffect } from "react";
import { LinkGroup, Redirect } from "@/lib/db/schema";
import {
  X,
  FolderPlus,
  FolderEdit,
  Trash2,
  Check,
  Search,
  Link2,
  GitFork,
  AlertCircle,
} from "lucide-react";

interface ManageGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupToEdit: LinkGroup | null;
  allRedirects: Redirect[];
  onSaveGroup: (groupData: { id?: number; name: string; color: string; linkIds: number[] }) => Promise<void>;
  onDeleteGroup?: (id: number) => Promise<void>;
}

const PRESET_COLORS = [
  "#000000",
  "#2563eb", // blue
  "#16a34a", // green
  "#9333ea", // purple
  "#ea580c", // orange
  "#dc2626", // red
  "#0891b2", // cyan
  "#4f46e5", // indigo
];

export function ManageGroupModal({
  isOpen,
  onClose,
  groupToEdit,
  allRedirects,
  onSaveGroup,
  onDeleteGroup,
}: ManageGroupModalProps) {
  const [name, setName] = useState("");
  const [color, setColor] = useState("#000000");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (groupToEdit) {
      setName(groupToEdit.name);
      setColor(groupToEdit.color || "#000000");
      try {
        const parsed = JSON.parse(groupToEdit.linkIds || "[]");
        setSelectedIds(Array.isArray(parsed) ? parsed : []);
      } catch {
        setSelectedIds([]);
      }
    } else {
      setName("");
      setColor("#000000");
      setSelectedIds([]);
    }
    setError(null);
    setSearchTerm("");
  }, [groupToEdit, isOpen]);

  if (!isOpen) return null;

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === allRedirects.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(allRedirects.map((r) => r.id));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please enter a group name");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await onSaveGroup({
        id: groupToEdit?.id,
        name: name.trim(),
        color,
        linkIds: selectedIds,
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save group");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!groupToEdit || !onDeleteGroup) return;
    if (!confirm(`Are you sure you want to delete the group "${groupToEdit.name}"? (Your links will NOT be deleted)`)) {
      return;
    }

    setLoading(true);
    try {
      await onDeleteGroup(groupToEdit.id);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete group");
    } finally {
      setLoading(false);
    }
  };

  const filteredLinks = allRedirects.filter((r) => {
    const s = searchTerm.toLowerCase();
    return (
      r.webname.toLowerCase().includes(s) ||
      r.destinationUrl.toLowerCase().includes(s)
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="w-full max-w-lg rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xl p-6 sm:p-7 space-y-5 animate-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 flex items-center justify-center text-black dark:text-white">
              {groupToEdit ? <FolderEdit className="w-5 h-5" /> : <FolderPlus className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                {groupToEdit ? "Edit Link Group" : "Create Link Group"}
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Organize your links into permanent folder boxes
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

        {error && (
          <div className="p-3 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* Group Name */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
              Group Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. GitHub Projects, Social Media, Work"
              autoFocus
              required
              className="w-full px-3.5 py-2 text-xs bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-xl text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:border-black dark:focus:border-white transition"
            />
          </div>

          {/* Badge Color Preset */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
              Box Accent Color
            </label>
            <div className="flex items-center gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  style={{ backgroundColor: c }}
                  className={`w-6 h-6 rounded-full border-2 transition cursor-pointer flex items-center justify-center ${
                    color === c ? "border-black dark:border-white scale-110 shadow-sm" : "border-transparent opacity-80 hover:opacity-100"
                  }`}
                >
                  {color === c && <Check className="w-3 h-3 text-white drop-shadow" />}
                </button>
              ))}
            </div>
          </div>

          {/* Links Selector */}
          <div className="flex-1 flex flex-col min-h-0 space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                Include Links ({selectedIds.length} selected)
              </label>
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-[11px] text-neutral-500 hover:text-black dark:text-neutral-400 dark:hover:text-white font-medium transition cursor-pointer"
              >
                {selectedIds.length === allRedirects.length ? "Deselect All" : "Select All"}
              </button>
            </div>

            {allRedirects.length > 4 && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Filter links to add..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:border-black dark:focus:border-white transition"
                />
              </div>
            )}

            {/* Links List with Checkboxes */}
            <div className="flex-1 overflow-y-auto space-y-1.5 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-2 max-h-48 bg-neutral-50/50 dark:bg-neutral-950/50">
              {filteredLinks.length === 0 ? (
                <div className="text-center py-6 text-xs text-neutral-400">
                  No links found
                </div>
              ) : (
                filteredLinks.map((r) => {
                  const isSelected = selectedIds.includes(r.id);
                  const isSublink = !!r.parentId;

                  return (
                    <div
                      key={r.id}
                      onClick={() => toggleSelect(r.id)}
                      className={`flex items-center justify-between p-2.5 rounded-xl border transition cursor-pointer text-xs ${
                        isSelected
                          ? "bg-white dark:bg-neutral-900 border-black dark:border-white shadow-sm"
                          : "bg-white dark:bg-neutral-900/60 border-neutral-200/80 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 opacity-75 hover:opacity-100"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        <div
                          className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                            isSelected
                              ? "bg-black dark:bg-white border-black dark:border-white text-white dark:text-black"
                              : "border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            {isSublink && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-500 font-sans inline-flex items-center gap-0.5">
                                <GitFork className="w-2.5 h-2.5" />
                                <span>sub</span>
                              </span>
                            )}
                            <span className="font-mono font-bold text-neutral-900 dark:text-white truncate">
                              /{r.username}/{r.webname}
                            </span>
                          </div>
                          <p className="text-[10px] text-neutral-400 truncate max-w-xs font-mono">
                            {r.destinationUrl}
                          </p>
                        </div>
                      </div>

                      <span className="text-[11px] font-mono text-neutral-500 flex-shrink-0">
                        {r.clickCount || 0} clicks
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-between pt-2">
            {groupToEdit && onDeleteGroup ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className="px-3 py-2 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Group</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !name.trim()}
                className="px-5 py-2 text-xs font-semibold text-white dark:text-black bg-black dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-200 rounded-xl transition shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {loading ? "Saving..." : groupToEdit ? "Save Changes" : "Create Group"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
