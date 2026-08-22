"use client";

import { useState, useEffect } from "react";
import { X, Edit3, Check, Link2, AlertCircle } from "lucide-react";
import { Redirect } from "@/lib/db/schema";

interface EditMainBioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void;
  baseUrl: string;
  currentUser: string;
  links: Redirect[];
}

export function EditMainBioModal({
  isOpen,
  onClose,
  onUpdated,
  baseUrl,
  currentUser,
  links,
}: EditMainBioModalProps) {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const initialSelected = links
        .filter((l) => l.showOnProfile !== false && (!l.expiresAt || new Date(l.expiresAt).getTime() > Date.now()))
        .map((l) => l.id);
      setSelectedIds(initialSelected);
      setError(null);
    }
  }, [isOpen, links]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const toggleLinkId = (id: number) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((x) => x !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Update showOnProfile for each active link
      const activeLinks = links.filter((l) => !l.expiresAt || new Date(l.expiresAt).getTime() > Date.now());
      await Promise.all(
        activeLinks.map((l) => {
          const isSelected = selectedIds.includes(l.id);
          if (l.showOnProfile !== isSelected) {
            return fetch(`/api/redirects/${l.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ showOnProfile: isSelected }),
            });
          }
          return Promise.resolve();
        })
      );

      onUpdated();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update links");
    } finally {
      setLoading(false);
    }
  };

  const activeLinks = links.filter((l) => !l.expiresAt || new Date(l.expiresAt).getTime() > Date.now());
  const previewPath = `${baseUrl}/${currentUser}`;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150 cursor-pointer overflow-y-auto"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg rounded-3xl bg-white border border-neutral-200 p-7 sm:p-8 shadow-2xl cursor-default font-sans my-8"
      >
        <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-black text-white flex items-center justify-center font-bold">
              <Edit3 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-900">Edit Main Bio: /{currentUser}</h2>
              <p className="text-xs text-neutral-500">Choose which links appear on your main bio page</p>
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
            <label className="block text-xs font-semibold text-neutral-800 mb-2 flex items-center justify-between">
              <span>Select Links to Show ({selectedIds.length} of {activeLinks.length} visible)</span>
            </label>
            {activeLinks.length === 0 ? (
              <p className="text-xs text-neutral-400 p-4 rounded-2xl bg-neutral-50 border border-neutral-200 text-center">
                No active links found. Create links in your dashboard first.
              </p>
            ) : (
              <div className="space-y-1.5 max-h-56 overflow-y-auto p-2 rounded-2xl bg-neutral-50 border border-neutral-200">
                {activeLinks.map((link) => {
                  const isSelected = selectedIds.includes(link.id);
                  return (
                    <div
                      key={link.id}
                      onClick={() => toggleLinkId(link.id)}
                      className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-2 cursor-pointer transition select-none ${
                        isSelected
                          ? "bg-white border-black text-black font-semibold shadow-2xs"
                          : "bg-white/60 border-neutral-200 text-neutral-500"
                      }`}
                    >
                      <div className="min-w-0 flex items-center gap-2.5">
                        <div
                          className={`w-4 h-4 rounded-md border flex items-center justify-center ${
                            isSelected ? "bg-black border-black text-white" : "border-neutral-300 bg-white"
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <span className="font-mono truncate font-bold text-neutral-900">/{link.webname}</span>
                      </div>
                      <span className="text-[10px] text-neutral-400 font-mono truncate max-w-[160px]">
                        {link.destinationUrl}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200 text-xs font-mono">
            <span className="text-[10px] text-neutral-500 uppercase tracking-wider font-semibold font-sans block mb-0.5">
              Public Bio Link URL
            </span>
            <span className="text-neutral-900 font-bold">{previewPath}</span>
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
