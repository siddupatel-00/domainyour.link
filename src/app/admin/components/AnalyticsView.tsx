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

  // Fetch timeframe data from backend
  const fetchTimeframeData = useCallback(async () => {
    try {
      setLoading(true);
      let url = `/api/redirects?timeframe=${timeframe}`;
      if (timeframe === "custom" && customStart && customEnd) {
        url += `&startDate=${customStart}&endDate=${customEnd}`;
      }

      const res = await fetch(url);
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
      <div className="text-center py-24 rounded-3xl border border-neutral-100 bg-neutral-50/50 font-sans">
        <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-white border border-neutral-200 flex items-center justify-center text-black shadow-sm">
          <BarChart2 className="w-6 h-6 stroke-[2]" />
        </div>
        <h3 className="text-base font-bold text-neutral-900">No data yet</h3>
        <p className="text-xs text-neutral-500 max-w-xs mx-auto mt-1">
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
      <div className="rounded-3xl border border-neutral-200 bg-white p-6 sm:p-8 shadow-sm">
        {/* Header & Timeframe Buttons */}
        <div className="space-y-4 mb-6 pb-6 border-b border-neutral-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-bold text-neutral-900">Traffic Breakdown by Source</h3>
              <p className="text-xs text-neutral-500">
                Track how many visitors clicked each link during the selected timeframe
              </p>
            </div>
            <span className="text-xs font-mono text-neutral-400">
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
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                  timeframe === opt.val
                    ? "bg-black text-white border-black shadow-sm"
                    : "bg-white text-neutral-600 border-neutral-200 hover:border-neutral-400 hover:text-black"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Custom Date Range Picker */}
          {timeframe === "custom" && (
            <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200 flex flex-wrap items-center gap-3 animate-in fade-in duration-150 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-neutral-500 font-semibold flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-neutral-700" />
                  From:
                </span>
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="px-2.5 py-1.5 text-xs bg-white border border-neutral-300 rounded-xl text-neutral-900 focus:outline-none focus:border-black font-medium"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-neutral-500 font-semibold flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-neutral-700" />
                  To:
                </span>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="px-2.5 py-1.5 text-xs bg-white border border-neutral-300 rounded-xl text-neutral-900 focus:outline-none focus:border-black font-medium"
                />
              </div>

              <button
                type="button"
                onClick={fetchTimeframeData}
                className="px-3 py-1.5 bg-black text-white text-xs font-semibold rounded-xl hover:bg-neutral-800 transition"
              >
                Apply Range
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="text-center py-12 text-neutral-400 text-xs font-medium">
            Loading timeframe analytics...
          </div>
        ) : totalClicks === 0 ? (
          <div className="text-center py-12 text-neutral-400 text-xs">
            <p>No clicks recorded during this timeframe.</p>
            <p className="mt-1 text-neutral-500">
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
                  className="p-4 rounded-2xl border border-neutral-100 bg-neutral-50/50 hover:bg-neutral-50 transition space-y-2.5 relative"
                >
                  <div className="flex items-center justify-between gap-2">
                    {/* Left: Rank, Link Name, Destination */}
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-6 h-6 rounded-full bg-black text-white text-xs font-bold font-mono flex items-center justify-center flex-shrink-0">
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          {isSublink && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-200 text-neutral-800 font-sans font-medium flex items-center gap-1">
                              <GitFork className="w-2.5 h-2.5" /> sub-link
                            </span>
                          )}
                          <span className="font-mono font-bold text-sm text-neutral-900 truncate">
                            {path}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(r.id, path)}
                            title="Copy link"
                            className="p-1 rounded-lg text-neutral-400 hover:text-black hover:bg-neutral-200/60 transition flex-shrink-0"
                          >
                            {isCopied ? (
                              <Check className="w-3.5 h-3.5 text-black" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-neutral-500 mt-0.5 truncate">
                          <ArrowRight className="w-3 h-3 text-neutral-400 flex-shrink-0" />
                          <span className="truncate max-w-xs sm:max-w-md">{r.destinationUrl}</span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Clicks, Traffic Share & 3 Dots Button */}
                    <div className="flex items-center gap-3 sm:gap-5 flex-shrink-0">
                      <div className="text-right">
                        <div className="font-mono font-bold text-sm sm:text-base text-neutral-900">
                          {r.clickCount || 0}{" "}
                          <span className="text-xs font-normal text-neutral-500">clicks</span>
                        </div>
                        <div className="text-[11px] font-mono text-neutral-400">
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
                          className="p-1.5 rounded-lg text-neutral-400 hover:text-black hover:bg-neutral-200/60 transition"
                          title="More options"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {/* 3-Dots Dropdown Menu */}
                        {isMenuOpen && (
                          <div className="absolute right-0 top-9 z-50 w-48 rounded-2xl bg-white border border-neutral-200 p-1.5 shadow-xl animate-in fade-in zoom-in-95 duration-150">
                            {onCreateSublink && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenMenuId(null);
                                    onCreateSublink(r);
                                  }}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-black hover:bg-neutral-50 rounded-xl transition text-left"
                                >
                                  <GitFork className="w-3.5 h-3.5 text-black" />
                                  <span>Add Sub-link</span>
                                </button>
                                <div className="h-px bg-neutral-100 my-1" />
                              </>
                            )}

                            {onEdit && (
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuId(null);
                                  onEdit(r);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-neutral-700 hover:text-black hover:bg-neutral-50 rounded-xl transition text-left"
                              >
                                <Edit2 className="w-3.5 h-3.5 text-neutral-500" />
                                <span>Edit destination</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleCopy(r.id, path)}
                              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-neutral-700 hover:text-black hover:bg-neutral-50 rounded-xl transition text-left"
                            >
                              <Copy className="w-3.5 h-3.5 text-neutral-500" />
                              <span>Copy link</span>
                            </button>

                            <a
                              href={path}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={() => setOpenMenuId(null)}
                              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-neutral-700 hover:text-black hover:bg-neutral-50 rounded-xl transition text-left"
                            >
                              <ExternalLink className="w-3.5 h-3.5 text-neutral-500" />
                              <span>Open link</span>
                            </a>

                            {onDelete && (
                              <>
                                <div className="h-px bg-neutral-100 my-1" />
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenMenuId(null);
                                    onDelete(r);
                                  }}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-neutral-700 hover:text-black hover:bg-neutral-50 rounded-xl transition text-left"
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
                  <div className="w-full bg-neutral-200 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-black h-full rounded-full transition-all duration-500"
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
