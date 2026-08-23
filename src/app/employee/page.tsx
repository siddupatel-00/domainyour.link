"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  TrendingUp,
  Users,
  Link2,
  Globe,
  Clock,
  LogOut,
  RotateCw,
  Lock,
  Compass,
  Radio,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

interface EmployeeProfile {
  name: string;
  email: string;
  role: string;
}

interface PlatformInsights {
  totalPeople: number;
  totalLinksCreated: number;
  activeLinksCount: number;
  expiredOrDeletedCount: number;
  totalClicksWorldwide: number;
  timeframeClicks?: number;
  totalBiosCreated: number;
  topDomains: Array<{ domain: string; clicks: number }>;
}

export default function EmployeeInsightsDashboard() {
  const [employee, setEmployee] = useState<EmployeeProfile | null>(null);
  const [insights, setInsights] = useState<PlatformInsights | null>(null);
  const [timeframe, setTimeframe] = useState<string>("7d");
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const router = useRouter();
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchInsights = useCallback(async (isBackground = false) => {
    try {
      if (!isBackground) setLoading(true);

      const authRes = await fetch("/api/employee/auth", {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });
      const authData = await authRes.json();
      if (!authData.authenticated) {
        router.push("/employee/login");
        return;
      }
      setEmployee(authData.employee);

      const dataRes = await fetch(`/api/employee/data?timeframe=${timeframe}&t=${Date.now()}`, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });
      if (dataRes.ok) {
        const d = await dataRes.json();
        setInsights(d.insights);
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.error("Fetch employee insights error:", err);
    } finally {
      if (!isBackground) setLoading(false);
    }
  }, [router, timeframe]);

  // Initial fetch and auto-polling every 4 seconds for real-time live data
  useEffect(() => {
    fetchInsights();

    pollTimerRef.current = setInterval(() => {
      fetchInsights(true);
    }, 4000);

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [fetchInsights]);

  const handleLogout = async () => {
    try {
      await fetch("/api/employee/auth", { method: "DELETE" });
      router.push("/employee/login");
    } catch (err) {
      console.error("Employee logout error:", err);
    }
  };

  const totalDomainClicks = insights?.topDomains.reduce((acc, curr) => acc + curr.clicks, 0) || 1;

  return (
    <main className="min-h-screen bg-neutral-950 text-white font-sans selection:bg-white selection:text-black">
      {/* Top Header */}
      <header className="border-b border-neutral-800/80 px-6 sm:px-12 py-4 sticky top-0 bg-neutral-950/90 backdrop-blur-md z-40">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-white text-black flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-white tracking-tight">
                  PermanentLink Staff
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-neutral-800 text-neutral-300 font-mono font-semibold flex items-center gap-1">
                  <Radio className="w-2.5 h-2.5 text-emerald-400 animate-pulse" />
                  <span>Real-Time Insights</span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-right">
              <div className="text-xs font-semibold text-white">{employee?.name}</div>
              <div className="text-[10px] text-neutral-400 font-mono">{employee?.email}</div>
            </div>

            <ThemeToggle />

            <button
              onClick={() => fetchInsights(false)}
              title="Refresh Insights"
              className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-900 border border-neutral-800 transition cursor-pointer"
            >
              <RotateCw className={`w-4 h-4 ${loading ? "animate-spin text-white" : ""}`} />
            </button>

            <button
              onClick={handleLogout}
              title="Sign Out"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-800 hover:border-neutral-700 text-xs font-semibold text-neutral-300 bg-neutral-900 hover:bg-neutral-800 transition cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-6xl mx-auto px-6 sm:px-12 py-8 sm:py-10 space-y-8">
        {/* Privacy Shield Banner with Live Sync Indicator */}
        <div className="p-4 rounded-2xl border border-neutral-800 bg-neutral-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-neutral-800 text-neutral-300 flex items-center justify-center flex-shrink-0">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <span className="font-semibold text-white">Anonymized Platform Insights Mode</span>
              <p className="text-[11px] text-neutral-400">
                Live view of platform totals, click volume, and traffic trends. Creator names and private accounts are hidden.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px] font-mono text-neutral-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>Live Sync Active</span>
          </div>
        </div>

        {/* 4 Core Metric Cards (People, Created, Deleted/Expired, Clicks) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: How Many People Used The App */}
          <div className="p-5 rounded-2xl border border-neutral-800 bg-neutral-900/70 shadow-md">
            <div className="flex items-center justify-between">
              <p className="text-xs text-neutral-400 font-medium">People / Creators</p>
              <div className="w-8 h-8 rounded-xl bg-neutral-800 flex items-center justify-center text-white">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <h4 className="text-3xl font-bold text-white mt-2 font-mono">
              {insights?.totalPeople ?? 0}
            </h4>
            <p className="text-[11px] text-neutral-500 mt-1">
              Active account creators
            </p>
          </div>

          {/* Card 2: Total Links Created */}
          <div className="p-5 rounded-2xl border border-neutral-800 bg-neutral-900/70 shadow-md">
            <div className="flex items-center justify-between">
              <p className="text-xs text-neutral-400 font-medium">Links Created</p>
              <div className="w-8 h-8 rounded-xl bg-neutral-800 flex items-center justify-center text-white">
                <Link2 className="w-4 h-4" />
              </div>
            </div>
            <h4 className="text-3xl font-bold text-white mt-2 font-mono">
              {insights?.totalLinksCreated ?? 0}
            </h4>
            <p className="text-[11px] text-neutral-500 mt-1">
              {insights?.activeLinksCount ?? 0} active • {insights?.totalBiosCreated ?? 0} bios
            </p>
          </div>

          {/* Card 3: Links Expired / Deleted */}
          <div className="p-5 rounded-2xl border border-neutral-800 bg-neutral-900/70 shadow-md">
            <div className="flex items-center justify-between">
              <p className="text-xs text-neutral-400 font-medium">Expired / Deleted</p>
              <div className="w-8 h-8 rounded-xl bg-neutral-800 flex items-center justify-center text-white">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <h4 className="text-3xl font-bold text-white mt-2 font-mono">
              {insights?.expiredOrDeletedCount ?? 0}
            </h4>
            <p className="text-[11px] text-neutral-500 mt-1">
              Expired temporary links
            </p>
          </div>

          {/* Card 4: Total Worldwide Clicks */}
          <div className="p-5 rounded-2xl border border-neutral-800 bg-neutral-900/70 shadow-md">
            <div className="flex items-center justify-between">
              <p className="text-xs text-neutral-400 font-medium">Total Clicks</p>
              <div className="w-8 h-8 rounded-xl bg-neutral-800 flex items-center justify-center text-white">
                <Globe className="w-4 h-4" />
              </div>
            </div>
            <h4 className="text-3xl font-bold text-white mt-2 font-mono">
              {insights?.totalClicksWorldwide ?? 0}
            </h4>
            <p className="text-[11px] text-neutral-500 mt-1">
              Worldwide visitor clicks
            </p>
          </div>
        </div>

        {/* Timeframe Trend Selector */}
        <div className="p-5 rounded-3xl border border-neutral-800 bg-neutral-900/60 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-neutral-800">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                <span>Traffic & Activity Timeframe</span>
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                Filter platform click performance across time periods
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { label: "24 Hours", val: "24h" },
                { label: "Past 7 Days", val: "7d" },
                { label: "Past 14 Days", val: "14d" },
                { label: "This Month", val: "this_month" },
                { label: "Last Month", val: "last_month" },
              ].map((tf) => (
                <button
                  key={tf.val}
                  type="button"
                  onClick={() => setTimeframe(tf.val)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                    timeframe === tf.val
                      ? "bg-white text-black border-white shadow-sm"
                      : "bg-neutral-950 text-neutral-400 border-neutral-800 hover:border-neutral-700 hover:text-white"
                  }`}
                >
                  {tf.label}
                </button>
              ))}
            </div>
          </div>

          {/* Top Destination Domains Insights (Anonymized destinations) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-neutral-400" />
                <span>Top Destination Platforms & Domains</span>
              </h4>
              <span className="text-[11px] font-mono text-neutral-500">
                Aggregated breakdown
              </span>
            </div>

            {!insights?.topDomains || insights.topDomains.length === 0 ? (
              <div className="text-center py-10 text-xs text-neutral-500">
                No destination clicks recorded in this range.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {insights.topDomains.map((item, idx) => {
                  const share = Math.round((item.clicks / totalDomainClicks) * 100);
                  return (
                    <div
                      key={item.domain}
                      className="p-3.5 rounded-2xl border border-neutral-800 bg-neutral-950/70 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-md bg-neutral-800 text-white font-mono text-[10px] font-bold flex items-center justify-center">
                            #{idx + 1}
                          </span>
                          <span className="font-mono font-bold text-xs text-white">
                            {item.domain}
                          </span>
                        </div>

                        <div className="text-right">
                          <span className="font-mono font-bold text-xs text-white">
                            {item.clicks} clicks
                          </span>
                          <span className="text-[10px] text-neutral-400 ml-1.5">
                            ({share}%)
                          </span>
                        </div>
                      </div>

                      <div className="w-full bg-neutral-800 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-white h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(share, 3)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
