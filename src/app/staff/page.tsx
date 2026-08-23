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
  Compass,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

interface StaffProfile {
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
  totalBiosCreated: number;
  topDomains: Array<{ domain: string; clicks: number }>;
}

export default function StaffInsightsDashboard() {
  const [staff, setStaff] = useState<StaffProfile | null>(null);
  const [insights, setInsights] = useState<PlatformInsights | null>(null);
  const [timeframe, setTimeframe] = useState<string>("7d");
  const [loading, setLoading] = useState(true);

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
        router.push("/staff/login");
        return;
      }
      setStaff(authData.employee);

      const dataRes = await fetch(`/api/employee/data?timeframe=${timeframe}&t=${Date.now()}`, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });
      if (dataRes.ok) {
        const d = await dataRes.json();
        setInsights(d.insights);
      }
    } catch (err) {
      console.error("Fetch staff insights error:", err);
    } finally {
      if (!isBackground) setLoading(false);
    }
  }, [router, timeframe]);

  // Initial fetch and real-time auto-polling every 4 seconds
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
      router.push("/staff/login");
    } catch (err) {
      console.error("Staff logout error:", err);
    }
  };

  const totalDomainClicks = insights?.topDomains.reduce((acc, curr) => acc + curr.clicks, 0) || 1;

  return (
    <main className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white font-sans selection:bg-black dark:selection:bg-white selection:text-white dark:selection:text-black transition-colors duration-200">
      {/* Top Header */}
      <header className="border-b border-neutral-200 dark:border-neutral-800/80 px-6 sm:px-12 py-4 sticky top-0 bg-white/90 dark:bg-neutral-950/90 backdrop-blur-md z-40">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-black dark:bg-white text-white dark:text-black flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5 stroke-[2.2]" />
            </div>
            <span className="font-bold text-base text-neutral-900 dark:text-white tracking-tight">
              PermanentLink Staff
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-right">
              <div className="text-xs font-semibold text-neutral-900 dark:text-white">{staff?.name}</div>
              <div className="text-[10px] text-neutral-500 dark:text-neutral-400 font-mono">{staff?.email}</div>
            </div>

            <ThemeToggle />

            <button
              onClick={() => fetchInsights(false)}
              title="Refresh"
              className="p-2 rounded-xl text-neutral-500 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 transition cursor-pointer"
            >
              <RotateCw className={`w-4 h-4 ${loading ? "animate-spin text-black dark:text-white" : ""}`} />
            </button>

            <button
              onClick={handleLogout}
              title="Sign Out"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 text-xs font-semibold text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition cursor-pointer shadow-2xs"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-6xl mx-auto px-6 sm:px-12 py-8 sm:py-10 space-y-8">
        {/* 4 Core Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Users */}
          <div className="p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/70 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">Total Users</p>
              <div className="w-8 h-8 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-800 dark:text-white border border-neutral-200 dark:border-neutral-700">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <h4 className="text-3xl font-bold text-neutral-900 dark:text-white mt-2 font-mono">
              {insights?.totalPeople ?? 0}
            </h4>
            <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-1">
              Registered creators
            </p>
          </div>

          {/* Card 2: Links Created */}
          <div className="p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/70 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">Links Created</p>
              <div className="w-8 h-8 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-800 dark:text-white border border-neutral-200 dark:border-neutral-700">
                <Link2 className="w-4 h-4" />
              </div>
            </div>
            <h4 className="text-3xl font-bold text-neutral-900 dark:text-white mt-2 font-mono">
              {insights?.totalLinksCreated ?? 0}
            </h4>
            <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-1">
              {insights?.activeLinksCount ?? 0} currently active
            </p>
          </div>

          {/* Card 3: Expired Links */}
          <div className="p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/70 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">Expired Links</p>
              <div className="w-8 h-8 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-800 dark:text-white border border-neutral-200 dark:border-neutral-700">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <h4 className="text-3xl font-bold text-neutral-900 dark:text-white mt-2 font-mono">
              {insights?.expiredOrDeletedCount ?? 0}
            </h4>
            <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-1">
              Ended temporary links
            </p>
          </div>

          {/* Card 4: Worldwide Clicks */}
          <div className="p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/70 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">Total Clicks</p>
              <div className="w-8 h-8 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-800 dark:text-white border border-neutral-200 dark:border-neutral-700">
                <Globe className="w-4 h-4" />
              </div>
            </div>
            <h4 className="text-3xl font-bold text-neutral-900 dark:text-white mt-2 font-mono">
              {insights?.totalClicksWorldwide ?? 0}
            </h4>
            <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-1">
              Worldwide visits
            </p>
          </div>
        </div>

        {/* Traffic & Destinations Section */}
        <div className="p-6 rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/60 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-neutral-100 dark:border-neutral-800">
            <div>
              <h3 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                <span>Traffic Overview</span>
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                Visitor activity across time periods
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { label: "24 Hours", val: "24h" },
                { label: "7 Days", val: "7d" },
                { label: "14 Days", val: "14d" },
                { label: "This Month", val: "this_month" },
                { label: "Last Month", val: "last_month" },
              ].map((tf) => (
                <button
                  key={tf.val}
                  type="button"
                  onClick={() => setTimeframe(tf.val)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                    timeframe === tf.val
                      ? "bg-black dark:bg-white text-white dark:text-black border-black dark:border-white shadow-sm"
                      : "bg-neutral-50 dark:bg-neutral-950 text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 hover:text-black dark:hover:text-white"
                  }`}
                >
                  {tf.label}
                </button>
              ))}
            </div>
          </div>

          {/* Top Destination Platforms */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400" />
                <span>Top Destinations</span>
              </h4>
            </div>

            {!insights?.topDomains || insights.topDomains.length === 0 ? (
              <div className="text-center py-10 text-xs text-neutral-400 dark:text-neutral-500">
                No clicks recorded in this timeframe yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {insights.topDomains.map((item, idx) => {
                  const share = Math.round((item.clicks / totalDomainClicks) * 100);
                  return (
                    <div
                      key={item.domain}
                      className="p-3.5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-950/70 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-md bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-white font-mono text-[10px] font-bold flex items-center justify-center">
                            #{idx + 1}
                          </span>
                          <span className="font-mono font-bold text-xs text-neutral-900 dark:text-white">
                            {item.domain}
                          </span>
                        </div>

                        <div className="text-right">
                          <span className="font-mono font-bold text-xs text-neutral-900 dark:text-white">
                            {item.clicks} clicks
                          </span>
                          <span className="text-[10px] text-neutral-500 dark:text-neutral-400 ml-1.5">
                            ({share}%)
                          </span>
                        </div>
                      </div>

                      <div className="w-full bg-neutral-200 dark:bg-neutral-800 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-black dark:bg-white h-full rounded-full transition-all duration-500"
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
