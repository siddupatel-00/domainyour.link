"use client";

import { useState, useRef, useEffect } from "react";
import { Redirect } from "@/lib/db/schema";
import {
  Copy,
  Check,
  Edit2,
  Trash2,
  Search,
  ExternalLink,
  MoreVertical,
  Link2,
  Clock,
  ArrowRight,
  Sparkles,
  GitFork,
  Eye,
  EyeOff,
  MousePointerClick,
} from "lucide-react";

interface RedirectTableProps {
  redirects: Redirect[];
  baseUrl: string;
  onEdit: (redirect: Redirect) => void;
  onDelete: (redirect: Redirect) => void;
  onCreateOpen: () => void;
  onCreateSublink?: (parentRedirect: Redirect) => void;
  onToggleProfileVisibility?: (redirect: Redirect, nextVal: boolean) => void;
  onExpireLink?: (redirect: Redirect) => void;
  isExpiredView?: boolean;
}

export function RedirectTable({
  redirects,
  baseUrl,
  onEdit,
  onDelete,
  onCreateOpen,
  onCreateSublink,
  onToggleProfileVisibility,
  onExpireLink,
  isExpiredView = false,
}: RedirectTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Close dropdown on click outside or scroll/resize
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
        setMenuPos(null);
      }
    };
    const handleClose = () => {
      setOpenMenuId(null);
      setMenuPos(null);
    };

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("scroll", handleClose, true);
    window.addEventListener("resize", handleClose);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleClose, true);
      window.removeEventListener("resize", handleClose);
    };
  }, []);

  const handleCopy = (id: number, path: string) => {
    const fullUrl = `${baseUrl}${path}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredRedirects = redirects.filter((r) => {
    const search = searchTerm.toLowerCase();
    return (
      r.webname.toLowerCase().includes(search) ||
      r.destinationUrl.toLowerCase().includes(search) ||
      r.username.toLowerCase().includes(search)
    );
  });

  const formatExpiredDate = (date: Date | string | null | undefined) => {
    if (!date) return "Expired";
    const d = new Date(date);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getExpirationBadge = (redirect: Redirect) => {
    if (!redirect.expiresAt) {
      return (
        <span className="text-[11px] text-neutral-500 dark:text-neutral-400 font-medium font-sans whitespace-nowrap">
          Permanent
        </span>
      );
    }

    const expiresTime = new Date(redirect.expiresAt).getTime();
    const now = Date.now();
    const diff = expiresTime - now;

    if (diff <= 0) {
      return (
        <span className="text-[10px] px-2 py-0.5 rounded-md bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 font-semibold font-sans whitespace-nowrap">
          Expired
        </span>
      );
    }

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return (
        <span className="text-[10px] px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-medium font-sans whitespace-nowrap">
          ⏳ {days}d left
        </span>
      );
    }

    if (hours > 0) {
      return (
        <span className="text-[10px] px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-medium font-sans whitespace-nowrap">
          ⏳ {hours}h left
        </span>
      );
    }

    const mins = Math.max(1, Math.floor(diff / (1000 * 60)));
    return (
      <span className="text-[10px] px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-medium font-sans whitespace-nowrap">
        ⏳ {mins}m left
      </span>
    );
  };

  // Empty state
  if (redirects.length === 0) {
    return (
      <div className="text-center py-24 rounded-3xl border border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50">
        <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 flex items-center justify-center text-black dark:text-white shadow-sm">
          <Link2 className="w-6 h-6 stroke-[2]" />
        </div>
        <h3 className="text-base font-bold text-neutral-900 dark:text-white">
          {isExpiredView ? "No expired links" : "No links yet"}
        </h3>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-xs mx-auto mt-1 mb-5">
          {isExpiredView
            ? "When a link expires, it will appear here with click counts and expiration date."
            : "Create your first permanent link and share it anywhere."}
        </p>
        {!isExpiredView && (
          <button
            onClick={onCreateOpen}
            className="px-5 py-2.5 text-xs font-semibold text-white dark:text-black bg-black dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-200 rounded-xl transition shadow-sm cursor-pointer"
          >
            Create First Link
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4 font-sans">
      {/* Search Bar */}
      {redirects.length > 2 && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search links..."
            className="w-full pl-10 pr-4 py-2 text-xs bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:border-black dark:focus:border-white transition"
          />
        </div>
      )}

      {/* Table Container with Horizontal Scroll Support */}
      <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[640px]">
          <thead>
            <tr className="border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-900/80 text-[11px] uppercase tracking-wider text-neutral-400 dark:text-neutral-500 font-semibold whitespace-nowrap">
              <th className="py-3.5 px-5">Your Link</th>
              {isExpiredView ? (
                <>
                  <th className="py-3.5 px-5">When Expired</th>
                  <th className="py-3.5 px-5">Destination</th>
                  <th className="py-3.5 px-5 text-center">Clicks After Expiry</th>
                </>
              ) : (
                <>
                  <th className="py-3.5 px-5">Type / Expiry</th>
                  <th className="py-3.5 px-5">Goes To</th>
                  <th className="py-3.5 px-5 text-center">Clicks</th>
                </>
              )}
              <th className="py-3.5 px-5 text-right w-16"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 text-xs">
            {filteredRedirects.map((r) => {
              const path = `/${r.username}/${r.webname}`;
              const isCopied = copiedId === r.id;
              const isMenuOpen = openMenuId === r.id;
              const isSublink = !!r.parentId;
              const isShownOnProfile = r.showOnProfile !== false;

              return (
                <tr
                  key={r.id}
                  className="hover:bg-neutral-50/60 dark:hover:bg-neutral-800/40 transition duration-150 relative"
                >
                  {/* Link Column */}
                  <td className="py-4 px-5 font-mono font-medium whitespace-nowrap">
                    <div className="flex items-center gap-2 flex-nowrap">
                      {isSublink && (
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 font-sans font-medium inline-flex items-center gap-1 flex-shrink-0 whitespace-nowrap border border-neutral-200/60 dark:border-neutral-700/60">
                          <GitFork className="w-3 h-3 text-neutral-500 flex-shrink-0" />
                          <span>sub-link</span>
                        </span>
                      )}
                      <span className="text-neutral-900 dark:text-white font-bold tracking-tight whitespace-nowrap">
                        {path}
                      </span>
                      <button
                        onClick={() => handleCopy(r.id, path)}
                        title="Copy link"
                        className="p-1 rounded-lg text-neutral-400 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer flex-shrink-0"
                      >
                        {isCopied ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>

                      {/* Profile visibility indicator */}
                      {!isExpiredView && (
                        <span
                          title={isShownOnProfile ? "Visible on your public profile page" : "Hidden from your public profile page"}
                          className={`text-[10px] px-2 py-0.5 rounded-full font-sans font-medium inline-flex items-center gap-1 flex-shrink-0 whitespace-nowrap ${
                            isShownOnProfile
                              ? "bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200/60 dark:border-neutral-700/60"
                              : "bg-neutral-50 dark:bg-neutral-900 text-neutral-400 dark:text-neutral-600 border border-neutral-200/40 dark:border-neutral-800/40"
                          }`}
                        >
                          {isShownOnProfile ? (
                            <>
                              <Eye className="w-2.5 h-2.5 text-neutral-500 dark:text-neutral-400 flex-shrink-0" />
                              <span>in bio</span>
                            </>
                          ) : (
                            <>
                              <EyeOff className="w-2.5 h-2.5 text-neutral-400 dark:text-neutral-600 flex-shrink-0" />
                              <span>hidden</span>
                            </>
                          )}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Expired View Columns vs Active View Columns */}
                  {isExpiredView ? (
                    <>
                      {/* When Expired */}
                      <td className="py-4 px-5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-neutral-800 dark:text-neutral-200 text-xs font-medium">
                          <Clock className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0" />
                          <span>{formatExpiredDate(r.expiresAt)}</span>
                        </div>
                      </td>

                      {/* Destination */}
                      <td className="py-4 px-5 max-w-xs truncate whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-neutral-500 dark:text-neutral-400">
                          <ArrowRight className="w-3 h-3 text-neutral-400 flex-shrink-0" />
                          <span className="truncate font-mono text-[11px]">{r.destinationUrl}</span>
                        </div>
                      </td>

                      {/* Clicks After Expiry */}
                      <td className="py-4 px-5 text-center font-mono whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white text-xs font-bold shadow-sm">
                          <MousePointerClick className="w-3.5 h-3.5 text-black dark:text-white" />
                          <span>{r.expiredClickCount || 0} clicked after expiry</span>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      {/* Expiration Status Badge */}
                      <td className="py-4 px-5 whitespace-nowrap">
                        {getExpirationBadge(r)}
                      </td>

                      {/* Destination */}
                      <td className="py-4 px-5 max-w-xs md:max-w-md whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-neutral-600 dark:text-neutral-400 max-w-xs sm:max-w-sm truncate">
                          <ArrowRight className="w-3 h-3 text-neutral-400 flex-shrink-0" />
                          <a
                            href={r.destinationUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="truncate text-neutral-600 dark:text-neutral-300 hover:text-black dark:hover:text-white transition text-xs font-mono"
                            title={r.destinationUrl}
                          >
                            {r.destinationUrl}
                          </a>
                        </div>
                      </td>

                      {/* Clicks */}
                      <td className="py-4 px-5 text-center font-mono font-semibold text-neutral-900 dark:text-white whitespace-nowrap">
                        {r.clickCount || 0}
                      </td>
                    </>
                  )}

                  {/* 3 Dots Menu Button */}
                  <td className="py-4 px-5 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (openMenuId === r.id) {
                          setOpenMenuId(null);
                          setMenuPos(null);
                        } else {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const dropdownHeight = 260;
                          const dropdownWidth = 212;
                          const fitsBelow = rect.bottom + dropdownHeight <= window.innerHeight - 12;

                          setMenuPos({
                            top: fitsBelow ? rect.bottom + 6 : Math.max(12, rect.top - dropdownHeight - 6),
                            left: Math.max(12, Math.min(window.innerWidth - dropdownWidth - 12, rect.right - dropdownWidth)),
                          });
                          setOpenMenuId(r.id);
                        }
                      }}
                      className="p-1.5 rounded-lg text-neutral-400 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
                      title="More options"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>

                    {/* Unclipped Fixed 3-Dots Dropdown Menu */}
                    {isMenuOpen && menuPos && (
                      <div
                        ref={menuRef}
                        style={{
                          position: "fixed",
                          top: `${menuPos.top}px`,
                          left: `${menuPos.left}px`,
                          zIndex: 9999,
                        }}
                        className="w-52 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-1.5 shadow-2xl animate-in fade-in zoom-in-95 duration-150 text-left"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* Add Sublink option */}
                        {onCreateSublink && !isExpiredView && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setOpenMenuId(null);
                                setMenuPos(null);
                                onCreateSublink(r);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-black dark:text-white hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded-xl transition text-left cursor-pointer"
                            >
                              <GitFork className="w-3.5 h-3.5 text-black dark:text-white" />
                              <span>Add Sub-link</span>
                            </button>
                            <div className="h-px bg-neutral-100 dark:bg-neutral-800 my-1" />
                          </>
                        )}

                        {/* Toggle Bio Visibility */}
                        {onToggleProfileVisibility && !isExpiredView && (
                          <button
                            type="button"
                            onClick={() => {
                              setOpenMenuId(null);
                              setMenuPos(null);
                              onToggleProfileVisibility(r, !isShownOnProfile);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded-xl transition text-left cursor-pointer"
                          >
                            {isShownOnProfile ? (
                              <>
                                <EyeOff className="w-3.5 h-3.5 text-neutral-500" />
                                <span>Hide from Bio Page</span>
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-3.5 h-3.5 text-neutral-500" />
                                <span>Show on Bio Page</span>
                              </>
                            )}
                          </button>
                        )}

                        {/* Edit Destination */}
                        <button
                          type="button"
                          onClick={() => {
                            setOpenMenuId(null);
                            setMenuPos(null);
                            onEdit(r);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded-xl transition text-left cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-neutral-500" />
                          <span>Edit Destination</span>
                        </button>

                        {/* Expire Link now */}
                        {onExpireLink && !isExpiredView && (
                          <button
                            type="button"
                            onClick={() => {
                              setOpenMenuId(null);
                              setMenuPos(null);
                              onExpireLink(r);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-xl transition text-left cursor-pointer"
                          >
                            <Clock className="w-3.5 h-3.5 text-amber-500" />
                            <span>Expire Link Now</span>
                          </button>
                        )}

                        {/* Test Link in New Tab */}
                        <a
                          href={path}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => {
                            setOpenMenuId(null);
                            setMenuPos(null);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded-xl transition text-left cursor-pointer"
                        >
                          <ExternalLink className="w-3.5 h-3.5 text-neutral-500" />
                          <span>Visit Link</span>
                        </a>

                        <div className="h-px bg-neutral-100 dark:bg-neutral-800 my-1" />

                        {/* Delete Link */}
                        <button
                          type="button"
                          onClick={() => {
                            setOpenMenuId(null);
                            setMenuPos(null);
                            onDelete(r);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition text-left cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete Link</span>
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
