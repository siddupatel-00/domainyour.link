"use client";

import { useState, useRef, useEffect, Fragment } from "react";
import { Redirect, LinkGroup } from "@/lib/db/schema";
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
  ChevronRight,
  ChevronDown,
  RotateCcw,
  ChevronsUpDown,
  FolderPlus,
  Settings2,
  Share2,
  Plus,
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
  onResetClicks?: (redirect: Redirect) => void;
  onOpenImportFromAllLinks?: () => void;
  isExpiredView?: boolean;
  selectedGroup?: LinkGroup | null;
  onOpenEditGroup?: (group: LinkGroup) => void;
  onOpenShareGroup?: (group: LinkGroup) => void;
  onDeleteGroup?: (id: number) => Promise<void> | void;
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
  onResetClicks,
  onOpenImportFromAllLinks,
  isExpiredView = false,
  selectedGroup,
  onOpenEditGroup,
  onOpenShareGroup,
  onDeleteGroup,
}: RedirectTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const [hoveredUrl, setHoveredUrl] = useState<{ url: string; top: number; left: number } | null>(null);
  const [expandedParentIds, setExpandedParentIds] = useState<number[]>([]);
  const [isGroupMenuOpen, setIsGroupMenuOpen] = useState(false);
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const groupMenuRef = useRef<HTMLDivElement | null>(null);
  const addMenuRef = useRef<HTMLDivElement | null>(null);

  // Close dropdown and tooltip on click outside or scroll/resize
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
        setMenuPos(null);
      }
      if (groupMenuRef.current && !groupMenuRef.current.contains(event.target as Node)) {
        setIsGroupMenuOpen(false);
      }
      if (addMenuRef.current && !addMenuRef.current.contains(event.target as Node)) {
        setIsAddMenuOpen(false);
      }
    };
    const handleClose = () => {
      setOpenMenuId(null);
      setMenuPos(null);
      setHoveredUrl(null);
      setIsGroupMenuOpen(false);
      setIsAddMenuOpen(false);
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
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(fullUrl).catch(() => {
          fallbackCopy(fullUrl);
        });
      } else {
        fallbackCopy(fullUrl);
      }
    } catch {
      fallbackCopy(fullUrl);
    }
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const fallbackCopy = (text: string) => {
    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.opacity = "0";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
    } catch {}
  };

  const filteredRedirects = redirects.filter((r) => {
    const search = searchTerm.toLowerCase();
    return (
      (r.title && r.title.toLowerCase().includes(search)) ||
      r.webname.toLowerCase().includes(search) ||
      r.destinationUrl.toLowerCase().includes(search) ||
      r.username.toLowerCase().includes(search)
    );
  });

  // Group sub-links under their parents
  const childrenMap = new Map<number, Redirect[]>();
  const parentLinks: Redirect[] = [];
  const orphanSublinks: Redirect[] = [];

  const allRedirectIds = new Set(redirects.map((r) => r.id));

  filteredRedirects.forEach((r) => {
    if (r.parentId && allRedirectIds.has(r.parentId)) {
      const existing = childrenMap.get(r.parentId) || [];
      existing.push(r);
      childrenMap.set(r.parentId, existing);
    } else if (r.parentId && !allRedirectIds.has(r.parentId)) {
      orphanSublinks.push(r);
    } else {
      parentLinks.push(r);
    }
  });

  const totalParentsWithChildren = parentLinks.filter((p) => (childrenMap.get(p.id) || []).length > 0).length;

  const toggleExpand = (parentId: number) => {
    setExpandedParentIds((prev) =>
      prev.includes(parentId) ? prev.filter((id) => id !== parentId) : [...prev, parentId]
    );
  };

  const toggleExpandAll = () => {
    const allParentIdsWithChildren = parentLinks
      .filter((p) => (childrenMap.get(p.id) || []).length > 0)
      .map((p) => p.id);

    if (expandedParentIds.length >= allParentIdsWithChildren.length) {
      setExpandedParentIds([]);
    } else {
      setExpandedParentIds(allParentIdsWithChildren);
    }
  };

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

  // Helper to render individual row
  const renderRow = (r: Redirect, isChild = false) => {
    const path = isChild ? `/${r.username}/${r.webname}` : `/${r.webname}`;
    const displayName = r.title || r.webname;
    const isCopied = copiedId === r.id;
    const isMenuOpen = openMenuId === r.id;
    const children = childrenMap.get(r.id) || [];
    const hasChildren = children.length > 0;
    const isExpanded = expandedParentIds.includes(r.id);
    const isShownOnProfile = r.showOnProfile !== false;

    return (
      <tr
        key={r.id}
        className={`transition duration-150 relative ${
          isChild
            ? "bg-neutral-50/40 dark:bg-neutral-950/40 hover:bg-neutral-100/60 dark:hover:bg-neutral-800/50"
            : "hover:bg-neutral-50/60 dark:hover:bg-neutral-800/40"
        }`}
      >
        {/* Link Column */}
        <td className={`py-3.5 px-4 sm:px-5 font-mono font-medium overflow-hidden ${isChild ? "pl-10" : ""}`}>
          <div className="flex items-center gap-1.5 min-w-0 max-w-full">
            {/* Parent expand / collapse arrow toggle */}
            {!isChild && hasChildren ? (
              <button
                type="button"
                onClick={() => toggleExpand(r.id)}
                title={isExpanded ? "Collapse sub-links" : "Expand sub-links"}
                className="w-5 h-5 -ml-1 rounded-md flex items-center justify-center text-neutral-500 hover:text-black dark:hover:text-white hover:bg-neutral-200/60 dark:hover:bg-neutral-800 transition cursor-pointer flex-shrink-0"
              >
                {isExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5 stroke-[2.5]" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
                )}
              </button>
            ) : !isChild ? (
              <div className="w-2.5 flex-shrink-0" />
            ) : (
              <span className="text-neutral-400 dark:text-neutral-600 font-sans text-xs flex-shrink-0 -ml-1">
                └─
              </span>
            )}

            {/* Sublink badge */}
            {isChild && (
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 font-sans font-medium inline-flex items-center gap-0.5 flex-shrink-0 border border-neutral-200/60 dark:border-neutral-700/60">
                <GitFork className="w-2.5 h-2.5 text-neutral-500" />
                <span>sub</span>
              </span>
            )}

            {/* Link Name / Project Name with truncation and tooltip */}
            <span
              className="text-neutral-900 dark:text-white font-bold tracking-tight truncate min-w-0 flex-1 block"
              title={`${displayName} (${path})`}
            >
              {displayName}
            </span>

            {/* Sub-links count badge on parent */}
            {!isChild && hasChildren && (
              <button
                type="button"
                onClick={() => toggleExpand(r.id)}
                className="text-[9px] px-1.5 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 border border-neutral-200/60 dark:border-neutral-700/60 font-sans font-medium inline-flex items-center gap-0.5 flex-shrink-0 transition cursor-pointer"
              >
                <GitFork className="w-2.5 h-2.5 text-neutral-500" />
                <span>{children.length}</span>
              </button>
            )}

            {/* Profile visibility indicator */}
            {!isExpiredView && (
              <span
                title={isShownOnProfile ? "Visible on your public bio profile page" : "Hidden from your public bio profile page"}
                className={`text-[9px] px-1.5 py-0.2 rounded-full font-sans font-medium inline-flex items-center gap-0.5 flex-shrink-0 ${
                  isShownOnProfile
                    ? "bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200/60 dark:border-neutral-700/60"
                    : "bg-neutral-50 dark:bg-neutral-900 text-neutral-400 dark:text-neutral-600 border border-neutral-200/40 dark:border-neutral-800/40"
                }`}
              >
                {isShownOnProfile ? (
                  <>
                    <Eye className="w-2.5 h-2.5 text-neutral-500 dark:text-neutral-400 flex-shrink-0" />
                    <span>bio</span>
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

        {/* Expired View vs Active View Columns */}
        {isExpiredView ? (
          <>
            <td className="py-3.5 px-3 sm:px-4 whitespace-nowrap overflow-hidden">
              <div className="flex items-center gap-1.5 text-neutral-800 dark:text-neutral-200 text-xs font-medium truncate">
                <Clock className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0" />
                <span className="truncate">{formatExpiredDate(r.expiresAt)}</span>
              </div>
            </td>

            <td className="py-3.5 px-3 sm:px-4 overflow-hidden">
              <div
                onMouseEnter={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const tooltipWidth = 380;
                  const tooltipHeight = 100;
                  const fitsBelow = rect.bottom + tooltipHeight <= window.innerHeight - 16;
                  setHoveredUrl({
                    url: r.destinationUrl,
                    top: fitsBelow ? rect.bottom + 6 : Math.max(16, rect.top - tooltipHeight - 6),
                    left: Math.max(16, Math.min(window.innerWidth - tooltipWidth - 16, rect.left)),
                  });
                }}
                onMouseLeave={() => setHoveredUrl(null)}
                className="flex items-center gap-1.5 min-w-0 max-w-full cursor-pointer"
              >
                <ArrowRight className="w-3 h-3 text-neutral-400 flex-shrink-0" />
                <span className="truncate font-mono text-xs text-neutral-600 dark:text-neutral-400 block min-w-0 flex-1">
                  {r.destinationUrl}
                </span>
              </div>
            </td>

            <td className="py-3.5 px-2 sm:px-3 text-center font-mono whitespace-nowrap">
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white text-xs font-bold shadow-sm">
                <MousePointerClick className="w-3 h-3 text-black dark:text-white" />
                <span>{r.expiredClickCount || 0}</span>
              </div>
            </td>
          </>
        ) : (
          <>
            {/* Expiration Status Badge */}
            <td className="py-3.5 px-3 sm:px-4 whitespace-nowrap overflow-hidden">
              {getExpirationBadge(r)}
            </td>

            {/* Destination with Truncation and Fixed Floating Tooltip */}
            <td className="py-3.5 px-3 sm:px-4 overflow-hidden">
              <div
                onMouseEnter={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const tooltipWidth = 380;
                  const tooltipHeight = 100;
                  const fitsBelow = rect.bottom + tooltipHeight <= window.innerHeight - 16;
                  setHoveredUrl({
                    url: r.destinationUrl,
                    top: fitsBelow ? rect.bottom + 6 : Math.max(16, rect.top - tooltipHeight - 6),
                    left: Math.max(16, Math.min(window.innerWidth - tooltipWidth - 16, rect.left)),
                  });
                }}
                onMouseLeave={() => setHoveredUrl(null)}
                className="flex items-center gap-1.5 min-w-0 max-w-full cursor-pointer"
              >
                <ArrowRight className="w-3 h-3 text-neutral-400 flex-shrink-0" />
                <a
                  href={r.destinationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="truncate text-neutral-600 dark:text-neutral-300 hover:text-black dark:hover:text-white transition text-xs font-mono block min-w-0 flex-1"
                >
                  {r.destinationUrl}
                </a>
              </div>
            </td>

            {/* Clicks */}
            <td className="py-3.5 px-2 sm:px-3 text-center font-mono font-bold text-neutral-900 dark:text-white whitespace-nowrap">
              {r.clickCount || 0}
            </td>
          </>
        )}

        {/* Copy Button Column in between Clicks and Action */}
        <td className="py-3.5 px-2 sm:px-3 text-center whitespace-nowrap">
          <button
            type="button"
            onClick={() => handleCopy(r.id, path)}
            title="Copy link"
            className="p-1.5 rounded-lg text-neutral-400 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer inline-flex items-center justify-center"
          >
            {isCopied ? (
              <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
        </td>

        {/* 3-Dots Action Menu Column */}
        <td className="py-3.5 px-4 sm:px-6 text-right whitespace-nowrap">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (openMenuId === r.id) {
                setOpenMenuId(null);
                setMenuPos(null);
              } else {
                const rect = e.currentTarget.getBoundingClientRect();
                const dropdownHeight = 290;
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

              {/* Edit Link */}
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
                <span>Edit</span>
              </button>

              {/* Reset Analytics to 0 */}
              {onResetClicks && !isExpiredView && (
                <button
                  type="button"
                  onClick={() => {
                    setOpenMenuId(null);
                    setMenuPos(null);
                    onResetClicks(r);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded-xl transition text-left cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-neutral-500" />
                  <span>Reset Clicks to 0</span>
                </button>
              )}

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
  };

  // Empty state
  if (redirects.length === 0) {
    return (
      <div className="text-center py-24 rounded-3xl border border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50 font-sans">
        <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 flex items-center justify-center text-black dark:text-white shadow-sm">
          <Link2 className="w-6 h-6 stroke-[2]" />
        </div>
        <h3 className="text-base font-bold text-neutral-900 dark:text-white">
          {isExpiredView
            ? "No expired links"
            : onOpenImportFromAllLinks
            ? "No links in this group box"
            : "No links yet"}
        </h3>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-xs mx-auto mt-1 mb-5">
          {isExpiredView
            ? "When a link expires, it will appear here with click counts and expiration date."
            : onOpenImportFromAllLinks
            ? "Import existing links from your account or create a new link for this group."
            : "Create your first permanent link and share it anywhere."}
        </p>
        {!isExpiredView && (
          <div className="flex flex-wrap items-center justify-center gap-3">
            {onOpenImportFromAllLinks && (
              <button
                type="button"
                onClick={onOpenImportFromAllLinks}
                className="px-4 py-2.5 text-xs font-semibold text-neutral-900 dark:text-white bg-white dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 border border-neutral-200 dark:border-neutral-700 rounded-xl transition shadow-sm cursor-pointer inline-flex items-center gap-1.5"
              >
                <FolderPlus className="w-3.5 h-3.5" />
                <span>Import from links</span>
              </button>
            )}
            <button
              onClick={onCreateOpen}
              className="px-5 py-2.5 text-xs font-semibold text-white dark:text-black bg-black dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-200 rounded-xl transition shadow-sm cursor-pointer"
            >
              {selectedGroup ? `Add Link to ${selectedGroup.name}` : "Create First Link"}
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4 font-sans">
      {/* Top Search Bar & Expand/Collapse Controls */}
      <div className="flex items-center justify-between gap-3">
        {redirects.length > 2 ? (
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search links..."
              className="w-full pl-10 pr-4 py-2 text-xs bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:border-black dark:focus:border-white transition"
            />
          </div>
        ) : (
          <div />
        )}

        <div className="flex items-center gap-2">
          {totalParentsWithChildren > 0 && (
            <button
              type="button"
              onClick={toggleExpandAll}
              className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 transition cursor-pointer"
            >
              <ChevronsUpDown className="w-3.5 h-3.5" />
              <span>
                {expandedParentIds.length >= totalParentsWithChildren ? "Collapse All Sub-links" : "Expand All Sub-links"}
              </span>
            </button>
          )}

          {/* 2. + Button: Add new link or import from all links */}
          {selectedGroup && (
            <div className="relative" ref={addMenuRef}>
              <button
                type="button"
                onClick={() => {
                  setIsAddMenuOpen(!isAddMenuOpen);
                  setIsGroupMenuOpen(false);
                }}
                className="p-1.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white transition cursor-pointer flex items-center justify-center shadow-sm"
                title="Add new link or import from all links"
              >
                <Plus className="w-4 h-4" />
              </button>

              {isAddMenuOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-48 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xl py-1.5 z-30 animate-in fade-in duration-100 font-sans">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddMenuOpen(false);
                      onCreateOpen();
                    }}
                    className="w-full px-3.5 py-2 text-left text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center gap-2.5 transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-neutral-500" />
                    <span>Create New Link</span>
                  </button>
                  {onOpenImportFromAllLinks && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddMenuOpen(false);
                        onOpenImportFromAllLinks();
                      }}
                      className="w-full px-3.5 py-2 text-left text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center gap-2.5 transition cursor-pointer"
                    >
                      <FolderPlus className="w-3.5 h-3.5 text-neutral-500" />
                      <span>Import from All Links</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 3. 3-Dots Button: Edit group name, share link, delete group */}
          {selectedGroup && (
            <div className="relative" ref={groupMenuRef}>
              <button
                type="button"
                onClick={() => {
                  setIsGroupMenuOpen(!isGroupMenuOpen);
                  setIsAddMenuOpen(false);
                }}
                className="p-1.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white transition cursor-pointer flex items-center justify-center shadow-sm"
                title="Group options"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {isGroupMenuOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-44 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xl py-1.5 z-30 animate-in fade-in duration-100 font-sans">
                  {onOpenEditGroup && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsGroupMenuOpen(false);
                        onOpenEditGroup(selectedGroup);
                      }}
                      className="w-full px-3.5 py-2 text-left text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center gap-2.5 transition cursor-pointer"
                    >
                      <Settings2 className="w-3.5 h-3.5 text-neutral-500" />
                      <span>Edit Group</span>
                    </button>
                  )}
                  {onOpenShareGroup && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsGroupMenuOpen(false);
                        onOpenShareGroup(selectedGroup);
                      }}
                      className="w-full px-3.5 py-2 text-left text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center gap-2.5 transition cursor-pointer"
                    >
                      <Share2 className="w-3.5 h-3.5 text-neutral-500" />
                      <span>Share Link</span>
                    </button>
                  )}
                  {onDeleteGroup && (
                    <>
                      <div className="my-1 border-t border-neutral-100 dark:border-neutral-800" />
                      <button
                        type="button"
                        onClick={() => {
                          setIsGroupMenuOpen(false);
                          if (
                            window.confirm(
                              `Are you sure you want to delete "${selectedGroup.name}"? Your links will not be deleted.`
                            )
                          ) {
                            onDeleteGroup(selectedGroup.id!);
                          }
                        }}
                        className="w-full px-3.5 py-2 text-left text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center gap-2.5 transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete Group</span>
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Table Container with Fixed Layout and Strict Column Proportions */}
      <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse table-fixed">
          <thead>
            <tr className="border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-900/80 text-[11px] uppercase tracking-wider text-neutral-400 dark:text-neutral-500 font-semibold whitespace-nowrap">
              <th className="py-3.5 px-4 sm:px-5 w-[31%]">Name</th>
              {isExpiredView ? (
                <>
                  <th className="py-3.5 px-3 sm:px-4 w-[15%]">When Expired</th>
                  <th className="py-3.5 px-3 sm:px-4 w-[30%]">Destination</th>
                  <th className="py-3.5 px-2 sm:px-3 text-center w-[7%]">Clicks</th>
                </>
              ) : (
                <>
                  <th className="py-3.5 px-3 sm:px-4 w-[15%]">Type / Expiry</th>
                  <th className="py-3.5 px-3 sm:px-4 w-[30%]">Goes To</th>
                  <th className="py-3.5 px-2 sm:px-3 text-center w-[7%]">Clicks</th>
                </>
              )}
              <th className="py-3.5 px-2 sm:px-3 text-center w-[6%]">Copy</th>
              <th className="py-3.5 px-4 sm:px-6 text-right w-[11%]">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 text-xs">
            {parentLinks.map((parent) => {
              const children = childrenMap.get(parent.id) || [];
              const isExpanded = expandedParentIds.includes(parent.id);

              return (
                <Fragment key={parent.id}>
                  {renderRow(parent, false)}
                  {isExpanded && children.map((child) => renderRow(child, true))}
                </Fragment>
              );
            })}

            {/* Standalone/Orphan Sub-links (if parent is not in current view) */}
            {orphanSublinks.map((orphan) => renderRow(orphan, true))}
          </tbody>
        </table>
      </div>

      {/* Floating Unclipped Destination Card */}
      {hoveredUrl && (
        <div
          style={{
            position: "fixed",
            top: `${hoveredUrl.top}px`,
            left: `${hoveredUrl.left}px`,
            zIndex: 9999,
            maxWidth: "420px",
          }}
          className="w-80 sm:w-96 rounded-2xl bg-neutral-950 dark:bg-neutral-900 text-white border border-neutral-800 shadow-2xl p-3.5 space-y-1.5 animate-in fade-in zoom-in-95 duration-100 pointer-events-none font-sans"
        >
          <div className="flex items-center gap-1.5 text-[10px] text-neutral-400 font-semibold uppercase tracking-wider">
            <ExternalLink className="w-3 h-3 text-neutral-400" />
            <span>Full Destination URL</span>
          </div>
          <p className="font-mono text-xs text-neutral-100 break-all leading-relaxed bg-neutral-900 dark:bg-neutral-950 p-2.5 rounded-xl border border-neutral-800/80">
            {hoveredUrl.url}
          </p>
        </div>
      )}
    </div>
  );
}
