"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Redirect } from "@/lib/db/schema";
import {
  ExternalLink,
  ArrowRight,
  BarChart2,
  MoreVertical,
  Edit2,
  Trash2,
  Copy,
  Check,
  GitFork,
  Calendar,
  RotateCcw,
  Mail,
} from "lucide-react";

interface AnalyticsViewProps {
  redirects: Redirect[];
  baseUrl: string;
  onEdit?: (redirect: Redirect) => void;
  onDelete?: (redirect: Redirect) => void;
  onCreateSublink?: (parentRedirect: Redirect) => void;
  onResetClicks?: (redirect: Redirect) => void;
  onResetAllAnalytics?: () => void;
}

export function AnalyticsView({
  redirects: initialRedirects,
  baseUrl,
  onEdit,
  onDelete,
  onCreateSublink,
  onResetClicks,
  onResetAllAnalytics,
}: AnalyticsViewProps) {
  const [timeframe, setTimeframe] = useState<string>("7d");
  const [customStart, setCustomStart] = useState<string>("");
  const [customEnd, setCustomEnd] = useState<string>("");
  const [filteredRedirects, setFilteredRedirects] = useState<Redirect[]>(initialRedirects);
  const [loading, setLoading] = useState(false);

  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
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

  // Set default custom dates (start 7 days ago, end today)
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    setCustomEnd(today);
    setCustomStart(lastWeek);
  }, []);

  // Fetch real-time fresh timeframe data from backend
  const fetchTimeframeData = useCallback(async () => {
    try {
      setLoading(true);
      let url = `/api/redirects?timeframe=${timeframe}&t=${Date.now()}`;
      if (timeframe === "custom" && customStart && customEnd) {
        url += `&startDate=${customStart}&endDate=${customEnd}`;
      }

      const res = await fetch(url, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });
      if (res.ok) {
        const data = await res.json();
        setFilteredRedirects(data.redirects || initialRedirects);
      }
    } catch {
      setFilteredRedirects(initialRedirects);
    } finally {
      setLoading(false);
    }
  }, [timeframe, customStart, customEnd, initialRedirects]);

  useEffect(() => {
    fetchTimeframeData();
  }, [fetchTimeframeData]);

  const handleCopy = (id: number, path: string) => {
    const fullUrl = `${baseUrl}${path}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const totalClicks = filteredRedirects.reduce((acc, curr) => acc + (curr.clickCount || 0), 0);

  // Sort by clicks descending
  const sortedRedirects = [...filteredRedirects].sort(
    (a, b) => (b.clickCount || 0) - (a.clickCount || 0)
  );

  const topLink = sortedRedirects[0];
  const activeLinksCount = filteredRedirects.filter(
    (r) => !r.expiresAt || new Date(r.expiresAt).getTime() > Date.now()
  ).length;

  const timeframeOptions = [
    { value: "24h", label: "24h" },
    { value: "7d", label: "7 Days" },
    { value: "14d", label: "14 Days" },
    { value: "this_month", label: "This Month" },
    { value: "last_month", label: "Last Month" },
    { value: "all", label: "All Time" },
    { value: "custom", label: "Custom" },
  ];

  return (
    <div className="space-y-6 font-sans">
      {/* Top Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Metric 1: Total Clicks in Timeframe */}
        <div className="p-5 rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm space-y-1">
          <p className="text-[11px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
            Total Visits
          </p>
          <div className="text-3xl font-extrabold text-neutral-900 dark:text-white font-mono tracking-tight">
            {totalClicks}
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            {timeframe === "all" ? "All-time worldwide clicks" : `Total clicks in selected timeframe`}
          </p>
        </div>

        {/* Metric 2: Active Permanent Links */}
        <div className="p-5 rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm space-y-1">
          <p className="text-[11px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
            Active Links
          </p>
          <div className="text-3xl font-extrabold text-neutral-900 dark:text-white font-mono tracking-tight">
            {activeLinksCount}
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Currently active & routing
          </p>
        </div>

        {/* Metric 3: Top Performer */}
        <div className="p-5 rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm space-y-1 min-w-0">
          <p className="text-[11px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
            Top Performer
          </p>
          {topLink && (topLink.clickCount || 0) > 0 ? (
            <div className="min-w-0">
              <div className="text-lg font-bold font-mono text-neutral-900 dark:text-white truncate">
                {topLink.code ? `/u/${topLink.code}` : `/${topLink.username}/${topLink.webname}`}
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 font-mono">
                {topLink.clickCount} clicks ({totalClicks > 0 ? Math.round(((topLink.clickCount || 0) / totalClicks) * 100) : 0}%)
              </p>
            </div>
          ) : (
            <div className="text-sm font-medium text-neutral-400 dark:text-neutral-500 py-1">
              No visits yet
            </div>
          )}
        </div>
      </div>

      {/* Main Performance Section */}
      <div className="p-6 rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-neutral-700 dark:text-neutral-300" />
              <span>Link Performance Breakdown</span>
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Traffic distribution across all active and permanent paths
            </p>
          </div>

          {/* Action Tools: Reset All */}
          <div className="flex items-center gap-2">
            {onResetAllAnalytics && totalClicks > 0 && (
              <button
                type="button"
                onClick={() => onResetAllAnalytics()}
                className="px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 transition cursor-pointer flex items-center gap-1.5 shadow-sm"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset All to 0</span>
              </button>
            )}
          </div>
        </div>

        {/* Timeframe Selector Buttons */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {timeframeOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setTimeframe(opt.value)}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl border transition cursor-pointer ${
                  timeframe === opt.value
                    ? "bg-black dark:bg-white text-white dark:text-black border-black dark:border-white shadow-sm"
                    : "bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-500 hover:text-black dark:hover:text-white"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Custom Date Range Picker */}
          {timeframe === "custom" && (
            <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 flex flex-wrap items-center gap-3 animate-in fade-in duration-150 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-neutral-500 dark:text-neutral-400 font-semibold flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-neutral-700 dark:text-neutral-300" />
                  From:
                </span>
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="px-2.5 py-1.5 text-xs bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-600 rounded-xl text-neutral-900 dark:text-white focus:outline-none focus:border-black dark:focus:border-white font-medium"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-neutral-500 dark:text-neutral-400 font-semibold flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-neutral-700 dark:text-neutral-300" />
                  To:
                </span>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="px-2.5 py-1.5 text-xs bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-600 rounded-xl text-neutral-900 dark:text-white focus:outline-none focus:border-black dark:focus:border-white font-medium"
                />
              </div>

              <button
                type="button"
                onClick={fetchTimeframeData}
                className="px-3 py-1.5 bg-black dark:bg-white text-white dark:text-black text-xs font-semibold rounded-xl hover:bg-neutral-800 dark:hover:bg-neutral-200 transition cursor-pointer"
              >
                Apply Range
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="text-center py-12 text-neutral-400 dark:text-neutral-500 text-xs font-medium">
            Loading timeframe analytics...
          </div>
        ) : totalClicks === 0 ? (
          <div className="text-center py-12 text-neutral-400 dark:text-neutral-500 text-xs">
            <p>No clicks recorded during this timeframe.</p>
            <p className="mt-1 text-neutral-500 dark:text-neutral-400">
              Share your permanent links and sub-links to start tracking traffic!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedRedirects.map((r, index) => {
              const path = r.code ? `/u/${r.code}` : `/${r.username}/${r.webname}`;
              const percentage = totalClicks > 0 ? Math.round(((r.clickCount || 0) / totalClicks) * 100) : 0;
              const isMenuOpen = openMenuId === r.id;
              const isCopied = copiedId === r.id;
              const isSublink = !!r.parentId;

              return (
                <div
                  key={r.id}
                  className="p-4 rounded-2xl border border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/40 hover:bg-neutral-50 dark:hover:bg-neutral-800/70 transition space-y-2.5 relative"
                >
                  <div className="flex items-center justify-between gap-2">
                    {/* Left: Rank, Link Name, Destination */}
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-6 h-6 rounded-full bg-black dark:bg-white text-white dark:text-black text-xs font-bold font-mono flex items-center justify-center flex-shrink-0">
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          {isSublink && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-300 font-sans font-medium flex-shrink-0 inline-flex items-center gap-1">
                              <GitFork className="w-2.5 h-2.5" />
                              <span>sub</span>
                            </span>
                          )}
                          <span className="font-bold text-xs text-neutral-900 dark:text-white truncate">
                            {r.title || r.webname}
                          </span>
                          <button
                            onClick={() => handleCopy(r.id, path)}
                            title="Copy link"
                            className="p-1 rounded-lg text-neutral-400 hover:text-black dark:hover:text-white hover:bg-neutral-200/60 dark:hover:bg-neutral-700 transition cursor-pointer flex-shrink-0"
                          >
                            {isCopied ? (
                              <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                        <div className="flex items-center gap-1.5 text-neutral-400 dark:text-neutral-500 text-[11px] font-mono mt-0.5">
                          <ArrowRight className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate max-w-xs md:max-w-md">{r.destinationUrl}</span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Clicks, Percentage & 3-Dots Button */}
                    <div className="flex items-center gap-4 flex-shrink-0">
                      <div className="text-right">
                        <div className="text-sm font-bold font-mono text-neutral-900 dark:text-white flex items-center justify-end gap-1">
                          <span>{r.clickCount || 0}</span>
                          <span className="text-xs font-normal text-neutral-500 dark:text-neutral-400">clicks</span>
                        </div>
                        <div className="text-[11px] font-mono text-neutral-400 dark:text-neutral-500">
                          {percentage}% of traffic
                        </div>
                      </div>

                      {/* 3 Dots Button */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (openMenuId === r.id) {
                              setOpenMenuId(null);
                              setMenuPos(null);
                            } else {
                              const rect = e.currentTarget.getBoundingClientRect();
                              const dropdownHeight = 230;
                              const dropdownWidth = 196;
                              const fitsBelow = rect.bottom + dropdownHeight <= window.innerHeight - 12;

                              setMenuPos({
                                top: fitsBelow ? rect.bottom + 6 : Math.max(12, rect.top - dropdownHeight - 6),
                                left: Math.max(12, Math.min(window.innerWidth - dropdownWidth - 12, rect.right - dropdownWidth)),
                              });
                              setOpenMenuId(r.id);
                            }
                          }}
                          className="p-1.5 rounded-lg text-neutral-400 hover:text-black dark:hover:text-white hover:bg-neutral-200/60 dark:hover:bg-neutral-700 transition cursor-pointer"
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
                            className="w-48 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-1.5 shadow-2xl animate-in fade-in zoom-in-95 duration-150 text-left"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {onCreateSublink && (
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

                            {onEdit && (
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuId(null);
                                  setMenuPos(null);
                                  onEdit(r);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:text-black dark:hover:text-white hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded-xl transition text-left cursor-pointer"
                              >
                                <Edit2 className="w-3.5 h-3.5 text-neutral-500" />
                                <span>Edit</span>
                              </button>
                            )}

                            {onResetClicks && (
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuId(null);
                                  setMenuPos(null);
                                  onResetClicks(r);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:text-black dark:hover:text-white hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded-xl transition text-left cursor-pointer"
                              >
                                <RotateCcw className="w-3.5 h-3.5 text-neutral-500" />
                                <span>Reset Clicks to 0</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => {
                                setOpenMenuId(null);
                                setMenuPos(null);
                                handleCopy(r.id, path);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:text-black dark:hover:text-white hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded-xl transition text-left cursor-pointer"
                            >
                              <Copy className="w-3.5 h-3.5 text-neutral-500" />
                              <span>Copy link</span>
                            </button>

                            <a
                              href={path}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={() => {
                                setOpenMenuId(null);
                                setMenuPos(null);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:text-black dark:hover:text-white hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded-xl transition text-left"
                            >
                              <ExternalLink className="w-3.5 h-3.5 text-neutral-500" />
                              <span>Open link</span>
                            </a>

                            {onDelete && (
                              <>
                                <div className="h-px bg-neutral-100 dark:bg-neutral-800 my-1" />
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
                                  <span>Delete link</span>
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Progress / Traffic Distribution Bar */}
                  <div className="w-full h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-black dark:bg-white rounded-full transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
