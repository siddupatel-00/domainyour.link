"use client";

import { useState, useEffect } from "react";
import { Redirect } from "@/lib/db/schema";
import { X, Sparkles, AlertCircle, Check } from "lucide-react";

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
  const [selectedLinkIds, setSelectedLinkIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const visibleIds = links
        .filter((l) => l.showOnProfile !== false)
        .map((l) => l.id);
      setSelectedLinkIds(visibleIds);
      setError(null);
    }
  }, [isOpen, links]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const fullUrl = `${baseUrl}/${currentUser}`;

  const toggleLinkSelection = (id: number) => {
    setSelectedLinkIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedLinkIds.length === links.length) {
      setSelectedLinkIds([]);
    } else {
      setSelectedLinkIds(links.map((l) => l.id));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const updatePromises = links.map((link) => {
        const shouldShow = selectedLinkIds.includes(link.id);
        const currentlyShow = link.showOnProfile !== false;

        if (shouldShow !== currentlyShow) {
          return fetch(`/api/redirects/${link.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ showOnProfile: shouldShow }),
          });
        }
        return Promise.resolve();
      });

      await Promise.all(updatePromises);
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 dark:bg-black/70 backdrop-blur-sm animate-in fade-in duration-150 cursor-pointer overflow-y-auto"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-7 sm:p-8 shadow-2xl cursor-default font-sans my-8"
      >
        <div className="flex items-center justify-between pb-4 border-b border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-black dark:bg-white text-white dark:text-black flex items-center justify-center font-bold">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-900 dark:text-white">Edit Main Bio Links</h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">Choose which links appear on /{currentUser}</p>
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
          <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800 text-xs space-y-1">
            <span className="text-[10px] text-neutral-500 dark:text-neutral-400 uppercase tracking-wider font-semibold block">
              Main Profile URL
            </span>
            <div className="font-mono font-bold text-neutral-900 dark:text-white truncate">{fullUrl}</div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                Select Links to Show
              </label>
              {links.length > 0 && (
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white transition cursor-pointer"
                >
                  {selectedLinkIds.length === links.length ? "Deselect all" : "Select all"}
                </button>
              )}
            </div>

            {links.length === 0 ? (
              <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 text-center text-xs text-neutral-500 dark:text-neutral-400">
                No links available. Create links in Active Links tab first!
              </div>
            ) : (
              <div className="max-h-56 overflow-y-auto space-y-1.5 p-2 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950">
                {links.map((link) => {
                  const isSelected = selectedLinkIds.includes(link.id);
                  return (
                    <div
                      key={link.id}
                      onClick={() => toggleLinkSelection(link.id)}
                      className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition ${
                        isSelected
                          ? "bg-white dark:bg-neutral-900 border-neutral-300 dark:border-neutral-700 shadow-2xs"
                          : "bg-transparent border-transparent opacity-60 hover:opacity-100"
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <span className="font-mono font-bold text-xs text-neutral-900 dark:text-white block truncate">
                          /{currentUser}/{link.webname}
                        </span>
                        <span className="text-[10px] text-neutral-500 dark:text-neutral-400 truncate block font-mono">
                          {link.destinationUrl}
                        </span>
                      </div>

                      <div
                        className={`w-5 h-5 rounded-lg flex items-center justify-center border transition flex-shrink-0 ${
                          isSelected
                            ? "bg-black dark:bg-white text-white dark:text-black border-black dark:border-white"
                            : "border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-neutral-100 dark:border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white border border-neutral-200 dark:border-neutral-800 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-800 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-semibold text-white dark:text-black bg-black dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-200 rounded-xl transition disabled:opacity-50 shadow-sm cursor-pointer"
            >
              {loading ? "Saving..." : "Save Links"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
