"use client";

import { Redirect } from "@/lib/db/schema";
import {
  TrendingUp,
  BarChart2,
  Globe,
  ExternalLink,
  ArrowRight,
  Sparkles,
  Link2,
} from "lucide-react";

interface AnalyticsViewProps {
  redirects: Redirect[];
  baseUrl: string;
}

export function AnalyticsView({ redirects, baseUrl }: AnalyticsViewProps) {
  const totalClicks = redirects.reduce((acc, curr) => acc + (curr.clickCount || 0), 0);
  const activeCount = redirects.length;
  const avgClicks = activeCount > 0 ? (totalClicks / activeCount).toFixed(1) : "0";

  // Sort redirects by clicks descending
  const sortedRedirects = [...redirects].sort(
    (a, b) => (b.clickCount || 0) - (a.clickCount || 0)
  );

  const topLink = sortedRedirects[0]?.clickCount > 0 ? sortedRedirects[0] : null;

  if (redirects.length === 0) {
    return (
      <div className="text-center py-24 rounded-3xl border border-neutral-100 bg-neutral-50/50">
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

  return (
    <div className="space-y-8 font-sans">
      {/* 4 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Clicks */}
        <div className="p-5 rounded-2xl border border-neutral-200 bg-neutral-50/40 shadow-sm">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-xs font-medium">Total Clicks</span>
            <TrendingUp className="w-4 h-4 text-black" />
          </div>
          <div className="text-3xl font-bold text-neutral-900 font-mono">
            {totalClicks}
          </div>
          <p className="text-[11px] text-neutral-400 mt-1">Across all your links</p>
        </div>

        {/* Active Links */}
        <div className="p-5 rounded-2xl border border-neutral-200 bg-neutral-50/40 shadow-sm">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-xs font-medium">Active Links</span>
            <Link2 className="w-4 h-4 text-black" />
          </div>
          <div className="text-3xl font-bold text-neutral-900 font-mono">
            {activeCount}
          </div>
          <p className="text-[11px] text-neutral-400 mt-1">Permanent URLs created</p>
        </div>

        {/* Most Clicked */}
        <div className="p-5 rounded-2xl border border-neutral-200 bg-neutral-50/40 shadow-sm">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-xs font-medium">Top Link</span>
            <Sparkles className="w-4 h-4 text-black" />
          </div>
          <div className="text-base font-bold text-neutral-900 font-mono truncate">
            {topLink ? `/${topLink.webname}` : "—"}
          </div>
          <p className="text-[11px] text-neutral-400 mt-1">
            {topLink ? `${topLink.clickCount} clicks` : "No clicks yet"}
          </p>
        </div>

        {/* Avg Clicks */}
        <div className="p-5 rounded-2xl border border-neutral-200 bg-neutral-50/40 shadow-sm">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-xs font-medium">Avg Clicks / Link</span>
            <Globe className="w-4 h-4 text-black" />
          </div>
          <div className="text-3xl font-bold text-neutral-900 font-mono">
            {avgClicks}
          </div>
          <p className="text-[11px] text-neutral-400 mt-1">Average traffic per link</p>
        </div>
      </div>

      {/* Traffic Breakdown List */}
      <div className="rounded-3xl border border-neutral-200 bg-white p-6 sm:p-8 shadow-sm">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-neutral-100">
          <div>
            <h3 className="text-base font-bold text-neutral-900">Traffic Breakdown</h3>
            <p className="text-xs text-neutral-500">See which links are getting the most visitors</p>
          </div>
          <span className="text-xs font-mono text-neutral-400">
            {sortedRedirects.length} links ranked
          </span>
        </div>

        {totalClicks === 0 ? (
          <div className="text-center py-12 text-neutral-400 text-xs">
            <p>Your links haven&apos;t received any clicks yet.</p>
            <p className="mt-1 text-neutral-500">Share your permanent links to start tracking clicks!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedRedirects.map((r, index) => {
              const path = `/${r.username}/${r.webname}`;
              const percentage = totalClicks > 0 ? Math.round(((r.clickCount || 0) / totalClicks) * 100) : 0;

              return (
                <div
                  key={r.id}
                  className="p-4 rounded-2xl border border-neutral-100 bg-neutral-50/50 hover:bg-neutral-50 transition space-y-2.5"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-black text-white text-xs font-bold font-mono flex items-center justify-center flex-shrink-0">
                        {index + 1}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-sm text-neutral-900">
                            {path}
                          </span>
                          <a
                            href={path}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-neutral-400 hover:text-black transition"
                            title="Open link"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-neutral-500 mt-0.5 truncate max-w-sm">
                          <ArrowRight className="w-3 h-3 text-neutral-400 flex-shrink-0" />
                          <span className="truncate">{r.destinationUrl}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 sm:text-right">
                      <div>
                        <div className="font-mono font-bold text-base text-neutral-900">
                          {r.clickCount || 0}{" "}
                          <span className="text-xs font-normal text-neutral-500">clicks</span>
                        </div>
                        <div className="text-[11px] font-mono text-neutral-400">
                          {percentage}% of traffic
                        </div>
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
