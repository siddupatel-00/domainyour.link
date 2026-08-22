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
} from "lucide-react";

interface AnalyticsViewProps {
  redirects: Redirect[];
  baseUrl: string;
  onEdit?: (redirect: Redirect) => void;
  onDelete?: (redirect: Redirect) => void;
  onCreateSublink?: (parentRedirect: Redirect) => void;
}

export function AnalyticsView({
  redirects: initialRedirects,
  baseUrl,
  onEdit,
  onDelete,
  onCreateSublink,
}: AnalyticsViewProps) {
  const [timeframe, setTimeframe] = useState<string>("7d");
  const [customStart, setCustomStart] = useState<string>("");
  const [customEnd, setCustomEnd] = useState<string>("");
  const [filteredRedirects, setFilteredRedirects] = useState<Redirect[]>(initialRedirects);
  const [loading, setLoading] = useState(false);

  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

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

  const totalClicks = filteredRedirects.reduce((acc, curr) => acc + (curr.clickCount || 0), 0);

  // Sort redirects by clicks descending
  const sortedRedirects = [...filteredRedirects].sort(
    (a, b) => (b.clickCount || 0) - (a.clickCount || 0)
  );

  const handleCopy = (id: number, path: string) => {
    const fullUrl = `${baseUrl}${path}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedId(id);
    setOpenMenuId(null);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (initialRedirects.length === 0) {
    return (
      <div className="text-center py-24 rounded-3xl border border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50 font-sans">
        <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 flex items-center justify-center text-black dark:text-white shadow-sm">
          <BarChart2 className="w-6 h-6 stroke-[2]" />
        </div>
        <h3 className="text-base font-bold text-neutral-900 dark:text-white">No data yet</h3>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-xs mx-auto mt-1">
          Create and share your permanent links to see click analytics here.
        </p>
      </div>
    );
  }

  const timeframeOptions = [
    { label: "24 Hours", val: "24h" },
    { label: "Past 7 Days", val: "7d" },
    { label: "Past 14 Days", val: "14d" },
    { label: "This Month", val: "this_month" },
    { label: "Last Month", val: "last_month" },
    { label: "Custom", val: "custom" },
  ];

  return (
    <div className="space-y-6 font-sans">
      {/* Traffic Breakdown Card with Timeframe Filter */}
      <div className="rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 sm:p-8 shadow-sm">
        {/* Header & Timeframe Buttons */}
        <div className="space-y-4 mb-6 pb-6 border-b border-neutral-100 dark:border-neutral-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-bold text-neutral-900 dark:text-white">Traffic Breakdown by Source</h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Track how many visitors clicked each link during the selected timeframe
              </p>
            </div>
            <span className="text-xs font-mono text-neutral-400 dark:text-neutral-500">
              {sortedRedirects.length} links ranked
            </span>
          </div>

          {/* Timeframe Buttons Bar */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            {timeframeOptions.map((opt) => (
              <button
                key={opt.val}
                type="button"
                onClick={() => setTimeframe(opt.val)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                  timeframe === opt.val
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
              const path = `/${r.username}/${r.webname}`;
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
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-200 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200 font-sans font-medium flex items-center gap-1">
                              <GitFork className="w-2.5 h-2.5" /> sub-link
                            </span>
                          )}
                          <span className="font-mono font-bold text-sm text-neutral-900 dark:text-white truncate">
                            {path}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(r.id, path)}
                            title="Copy link"
                            className="p-1 rounded-lg text-neutral-400 hover:text-black dark:hover:text-white hover:bg-neutral-200/60 dark:hover:bg-neutral-700 transition flex-shrink-0 cursor-pointer"
                          >
                            {isCopied ? (
                              <Check className="w-3.5 h-3.5 text-black dark:text-white" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 truncate">
                          <ArrowRight className="w-3 h-3 text-neutral-400 flex-shrink-0" />
                          <span className="truncate max-w-xs sm:max-w-md">{r.destinationUrl}</span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Clicks, Traffic Share & 3 Dots Button */}
                    <div className="flex items-center gap-3 sm:gap-5 flex-shrink-0">
                      <div className="text-right">
                        <div className="font-mono font-bold text-sm sm:text-base text-neutral-900 dark:text-white">
                          {r.clickCount || 0}{" "}
                          <span className="text-xs font-normal text-neutral-500 dark:text-neutral-400">clicks</span>
                        </div>
                        <div className="text-[11px] font-mono text-neutral-400 dark:text-neutral-500">
                          {percentage}% of traffic
                        </div>
                      </div>

                      {/* 3 Dots Button */}
                      <div className="relative" ref={isMenuOpen ? menuRef : null}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId(isMenuOpen ? null : r.id);
                          }}
                          className="p-1.5 rounded-lg text-neutral-400 hover:text-black dark:hover:text-white hover:bg-neutral-200/60 dark:hover:bg-neutral-700 transition cursor-pointer"
                          title="More options"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {/* 3-Dots Dropdown Menu */}
                        {isMenuOpen && (
                          <div className="absolute right-0 top-9 z-50 w-48 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-1.5 shadow-xl animate-in fade-in zoom-in-95 duration-150 text-left">
                            {onCreateSublink && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenMenuId(null);
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
                                  onEdit(r);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:text-black dark:hover:text-white hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded-xl transition text-left cursor-pointer"
                              >
                                <Edit2 className="w-3.5 h-3.5 text-neutral-500" />
                                <span>Edit destination</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleCopy(r.id, path)}
                              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:text-black dark:hover:text-white hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded-xl transition text-left cursor-pointer"
                            >
                              <Copy className="w-3.5 h-3.5 text-neutral-500" />
                              <span>Copy link</span>
                            </button>

                            <a
                              href={path}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={() => setOpenMenuId(null)}
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
                                    onDelete(r);
                                  }}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:text-black dark:hover:text-white hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded-xl transition text-left cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-neutral-500" />
                                  <span>Delete link</span>
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Minimalist Progress Bar */}
                  <div className="w-full bg-neutral-200 dark:bg-neutral-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-black dark:bg-white h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(percentage, 2)}%` }}
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
