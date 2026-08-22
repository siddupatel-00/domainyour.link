"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Redirect, Bio } from "@/lib/db/schema";
import {
  ExternalLink,
  Copy,
  Check,
  Edit2,
  Trash2,
  Plus,
  Sparkles,
  Link2,
  MoreVertical,
} from "lucide-react";
import { CreateBioModal } from "./CreateBioModal";
import { EditBioModal } from "./EditBioModal";
import { EditMainBioModal } from "./EditMainBioModal";

interface BioPageViewProps {
  redirects: Redirect[];
  baseUrl: string;
  currentUser: string;
  onRefreshData?: () => void;
}

export function BioPageView({
  redirects,
  baseUrl,
  currentUser,
  onRefreshData,
}: BioPageViewProps) {
  const [bios, setBios] = useState<Bio[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<number | string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<number | string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditMainOpen, setIsEditMainOpen] = useState(false);
  const [editingBio, setEditingBio] = useState<Bio | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchBios = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/bios?t=${Date.now()}`, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });
      if (res.ok) {
        const data = await res.json();
        setBios(data.bios || []);
      }
    } catch {
      setBios([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBios();
  }, [fetchBios]);

  const handleCopy = (id: number | string, urlPath: string) => {
    const fullUrl = `${baseUrl}${urlPath}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedId(id);
    setOpenMenuId(null);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDeleteBio = async (id: number) => {
    if (!confirm("Are you sure you want to delete this bio page?")) return;
    try {
      const res = await fetch(`/api/bios/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchBios();
      }
    } catch (err) {
      console.error("Delete bio error:", err);
    }
  };

  const getExpirationBadge = (expiresAt?: Date | string | null) => {
    if (!expiresAt) {
      return (
        <span className="text-[10px] text-neutral-400 font-sans font-normal">
          Permanent
        </span>
      );
    }

    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) {
      return (
        <span className="text-[10px] px-2 py-0.5 rounded-md bg-neutral-200 text-neutral-800 font-semibold font-sans">
          Expired
        </span>
      );
    }

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return (
        <span className="text-[10px] px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-700 font-medium font-sans">
          ⏳ {days}d left
        </span>
      );
    }

    if (hours > 0) {
      return (
        <span className="text-[10px] px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-700 font-medium font-sans">
          ⏳ {hours}h left
        </span>
      );
    }

    const mins = Math.max(1, Math.floor(diff / (1000 * 60)));
    return (
      <span className="text-[10px] px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-700 font-medium font-sans">
        ⏳ {mins}m left
      </span>
    );
  };

  const mainBioVisibleLinksCount = redirects.filter(
    (r) => r.showOnProfile !== false && (!r.expiresAt || new Date(r.expiresAt).getTime() > Date.now())
  ).length;

  return (
    <div className="space-y-6 font-sans animate-in fade-in duration-200">
      {/* Top Banner with Create Bio Button */}
      <div className="p-6 rounded-3xl border border-neutral-200 bg-neutral-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-black text-white flex items-center justify-center font-bold text-lg shadow-md flex-shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-neutral-900">Bio Pages & Sub-Bios</h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              Create multiple permanent or temporary bio pages with customized link selections
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-white bg-black hover:bg-neutral-800 rounded-xl transition shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Bio</span>
        </button>
      </div>

      {/* Bios Table */}
      <div className="rounded-3xl border border-neutral-200 bg-white shadow-sm overflow-visible">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-neutral-100 bg-neutral-50/70 text-[11px] uppercase tracking-wider text-neutral-400 font-semibold">
              <th className="py-3.5 px-5">Bio Page</th>
              <th className="py-3.5 px-5">Type / Expiry</th>
              <th className="py-3.5 px-5">Included Links</th>
              <th className="py-3.5 px-5 text-right w-16"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 text-xs">
            {/* Default Main Bio Row */}
            <tr className="hover:bg-neutral-50/60 transition duration-150 relative">
              <td className="py-4 px-5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-black text-white font-sans font-semibold">
                    Main Bio
                  </span>
                  <span className="font-mono font-bold text-neutral-900">/{currentUser}</span>
                  <button
                    onClick={() => handleCopy("main", `/${currentUser}`)}
                    title="Copy link"
                    className="p-1 rounded-lg text-neutral-400 hover:text-black hover:bg-neutral-100 transition"
                  >
                    {copiedId === "main" ? (
                      <Check className="w-3.5 h-3.5 text-black" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
                <p className="text-[11px] text-neutral-500 mt-0.5">Your main profile page</p>
              </td>

              <td className="py-4 px-5">
                <span className="text-[10px] text-neutral-400 font-sans font-normal">Permanent</span>
              </td>

              <td className="py-4 px-5">
                <span className="font-mono text-neutral-700 font-medium">
                  {mainBioVisibleLinksCount} links selected
                </span>
              </td>

              {/* 3-Dots Settings Menu for Main Bio */}
              <td className="py-4 px-5 text-right relative">
                <div className="inline-block text-left" ref={openMenuId === "main" ? menuRef : null}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenMenuId(openMenuId === "main" ? null : "main");
                    }}
                    className="p-1.5 rounded-lg text-neutral-400 hover:text-black hover:bg-neutral-100 transition"
                    title="More options"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>

                  {openMenuId === "main" && (
                    <div className="absolute right-4 top-12 z-50 w-48 rounded-2xl bg-white border border-neutral-200 p-1.5 shadow-xl animate-in fade-in zoom-in-95 duration-150 text-left">
                      <button
                        type="button"
                        onClick={() => {
                          setOpenMenuId(null);
                          setIsEditMainOpen(true);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-neutral-700 hover:text-black hover:bg-neutral-50 rounded-xl transition text-left"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-neutral-500" />
                        <span>Edit links to show</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleCopy("main", `/${currentUser}`)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-neutral-700 hover:text-black hover:bg-neutral-50 rounded-xl transition text-left"
                      >
                        <Copy className="w-3.5 h-3.5 text-neutral-500" />
                        <span>Copy bio link</span>
                      </button>

                      <a
                        href={`/${currentUser}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setOpenMenuId(null)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-neutral-700 hover:text-black hover:bg-neutral-50 rounded-xl transition text-left"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-neutral-500" />
                        <span>Open page</span>
                      </a>
                    </div>
                  )}
                </div>
              </td>
            </tr>

            {/* Custom Created Bios & Sub-Bios */}
            {bios.map((b) => {
              const path = `/${currentUser}/b/${b.bioname}`;
              const isCopied = copiedId === b.id;
              const isMenuOpen = openMenuId === b.id;

              let count = 0;
              try {
                const parsed = JSON.parse(b.linkIds);
                count = Array.isArray(parsed) ? parsed.length : 0;
              } catch {}

              return (
                <tr
                  key={b.id}
                  className="hover:bg-neutral-50/60 transition duration-150 relative"
                >
                  <td className="py-4 px-5">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-200 text-neutral-800 font-sans font-medium">
                        Sub-Bio
                      </span>
                      <span className="font-mono font-bold text-neutral-900">{path}</span>
                      <button
                        onClick={() => handleCopy(b.id, path)}
                        title="Copy link"
                        className="p-1 rounded-lg text-neutral-400 hover:text-black hover:bg-neutral-100 transition"
                      >
                        {isCopied ? (
                          <Check className="w-3.5 h-3.5 text-black" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                    {b.title && (
                      <p className="text-[11px] text-neutral-500 mt-0.5">{b.title}</p>
                    )}
                  </td>

                  <td className="py-4 px-5">
                    {getExpirationBadge(b.expiresAt)}
                  </td>

                  <td className="py-4 px-5">
                    <span className="font-mono text-neutral-700 font-medium">
                      {count} links selected
                    </span>
                  </td>

                  <td className="py-4 px-5 text-right relative">
                    <div className="inline-block text-left" ref={isMenuOpen ? menuRef : null}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(isMenuOpen ? null : b.id);
                        }}
                        className="p-1.5 rounded-lg text-neutral-400 hover:text-black hover:bg-neutral-100 transition"
                        title="More options"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {/* 3-Dots Dropdown Menu */}
                      {isMenuOpen && (
                        <div className="absolute right-4 top-12 z-50 w-48 rounded-2xl bg-white border border-neutral-200 p-1.5 shadow-xl animate-in fade-in zoom-in-95 duration-150 text-left">
                          <button
                            type="button"
                            onClick={() => {
                              setOpenMenuId(null);
                              setEditingBio(b);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-neutral-700 hover:text-black hover:bg-neutral-50 rounded-xl transition text-left"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-neutral-500" />
                            <span>Edit links & duration</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleCopy(b.id, path)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-neutral-700 hover:text-black hover:bg-neutral-50 rounded-xl transition text-left"
                          >
                            <Copy className="w-3.5 h-3.5 text-neutral-500" />
                            <span>Copy bio link</span>
                          </button>

                          <a
                            href={path}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => setOpenMenuId(null)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-neutral-700 hover:text-black hover:bg-neutral-50 rounded-xl transition text-left"
                          >
                            <ExternalLink className="w-3.5 h-3.5 text-neutral-500" />
                            <span>Open page</span>
                          </a>

                          <div className="h-px bg-neutral-100 my-1" />

                          <button
                            type="button"
                            onClick={() => {
                              setOpenMenuId(null);
                              handleDeleteBio(b.id);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-neutral-700 hover:text-black hover:bg-neutral-50 rounded-xl transition text-left"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-neutral-500" />
                            <span>Delete bio</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modals */}
      <CreateBioModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={() => {
          fetchBios();
          if (onRefreshData) onRefreshData();
        }}
        baseUrl={baseUrl}
        currentUser={currentUser}
        links={redirects}
      />

      <EditMainBioModal
        isOpen={isEditMainOpen}
        onClose={() => setIsEditMainOpen(false)}
        onUpdated={() => {
          if (onRefreshData) onRefreshData();
        }}
        baseUrl={baseUrl}
        currentUser={currentUser}
        links={redirects}
      />

      <EditBioModal
        bio={editingBio}
        isOpen={!!editingBio}
        onClose={() => setEditingBio(null)}
        onUpdated={() => {
          fetchBios();
          if (onRefreshData) onRefreshData();
        }}
        baseUrl={baseUrl}
        currentUser={currentUser}
        links={redirects}
      />
    </div>
  );
}
