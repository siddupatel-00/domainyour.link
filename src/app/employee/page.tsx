"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  Link2,
  Users,
  TrendingUp,
  Globe,
  LogOut,
  RotateCw,
  Search,
  ArrowRight,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

interface EmployeeProfile {
  id: number;
  name: string;
  email: string;
  role: string;
  permissions: string[];
}

interface OverviewData {
  totalLinks: number;
  activeCount: number;
  expiredCount: number;
  totalClicks: number;
  totalBios: number;
}

export default function EmployeeDashboardPage() {
  const [employee, setEmployee] = useState<EmployeeProfile | null>(null);
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [links, setLinks] = useState<any[]>([]);
  const [bios, setBios] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"links" | "users" | "analytics">("links");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const router = useRouter();

  const fetchEmployeeData = useCallback(async () => {
    try {
      setLoading(true);

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

      const dataRes = await fetch(`/api/employee/data?t=${Date.now()}`, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });
      if (dataRes.ok) {
        const d = await dataRes.json();
        setOverview(d.overview);
        setLinks(d.links || []);
        setBios(d.bios || []);
      }
    } catch (err) {
      console.error("Fetch employee data error:", err);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchEmployeeData();
  }, [fetchEmployeeData]);

  const handleLogout = async () => {
    try {
      await fetch("/api/employee/auth", { method: "DELETE" });
      router.push("/employee/login");
    } catch (err) {
      console.error("Employee logout error:", err);
    }
  };

  const filteredLinks = links.filter((l) => {
    const q = search.toLowerCase();
    return (
      l.username?.toLowerCase().includes(q) ||
      l.webname?.toLowerCase().includes(q) ||
      l.destinationUrl?.toLowerCase().includes(q)
    );
  });

  const uniqueUsers = Array.from(new Set(links.map((l) => l.username))).map((u) => {
    const userLinks = links.filter((l) => l.username === u);
    const userBios = bios.filter((b) => b.username === u);
    const userClicks = userLinks.reduce((acc, curr) => acc + (curr.clickCount || 0), 0);
    return {
      username: u,
      linksCount: userLinks.length,
      biosCount: userBios.length,
      totalClicks: userClicks,
    };
  });

  return (
    <main className="min-h-screen bg-neutral-950 text-white font-sans selection:bg-white selection:text-black">
      {/* Top Header */}
      <header className="border-b border-neutral-800 px-6 sm:px-12 py-4 sticky top-0 bg-neutral-950/90 backdrop-blur-md z-40">
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
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-neutral-800 text-neutral-300 font-mono font-semibold">
                  {employee?.role || "Staff"}
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
              onClick={() => fetchEmployeeData()}
              title="Refresh Data"
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
        {/* Stat Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl border border-neutral-800 bg-neutral-900/60 shadow-md">
            <div className="flex items-center justify-between">
              <p className="text-xs text-neutral-400 font-medium">Platform Links</p>
              <div className="w-8 h-8 rounded-xl bg-neutral-800 flex items-center justify-center text-white">
                <Link2 className="w-4 h-4" />
              </div>
            </div>
            <h4 className="text-2xl font-bold text-white mt-2 font-mono">
              {overview?.totalLinks ?? 0}
            </h4>
            <p className="text-[11px] text-neutral-500 mt-1">
              {overview?.activeCount ?? 0} active • {overview?.expiredCount ?? 0} expired
            </p>
          </div>

          <div className="p-5 rounded-2xl border border-neutral-800 bg-neutral-900/60 shadow-md">
            <div className="flex items-center justify-between">
              <p className="text-xs text-neutral-400 font-medium">Creator Accounts</p>
              <div className="w-8 h-8 rounded-xl bg-neutral-800 flex items-center justify-center text-white">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <h4 className="text-2xl font-bold text-white mt-2 font-mono">
              {uniqueUsers.length}
            </h4>
            <p className="text-[11px] text-neutral-500 mt-1">
              Total registered users
            </p>
          </div>

          <div className="p-5 rounded-2xl border border-neutral-800 bg-neutral-900/60 shadow-md">
            <div className="flex items-center justify-between">
              <p className="text-xs text-neutral-400 font-medium">Total Clicks</p>
              <div className="w-8 h-8 rounded-xl bg-neutral-800 flex items-center justify-center text-white">
                <Globe className="w-4 h-4" />
              </div>
            </div>
            <h4 className="text-2xl font-bold text-white mt-2 font-mono">
              {overview?.totalClicks ?? 0}
            </h4>
            <p className="text-[11px] text-neutral-500 mt-1">
              Worldwide visitor traffic
            </p>
          </div>

          <div className="p-5 rounded-2xl border border-neutral-800 bg-neutral-900/60 shadow-md">
            <div className="flex items-center justify-between">
              <p className="text-xs text-neutral-400 font-medium">Bio Pages</p>
              <div className="w-8 h-8 rounded-xl bg-neutral-800 flex items-center justify-center text-white">
                <Sparkles className="w-4 h-4" />
              </div>
            </div>
            <h4 className="text-2xl font-bold text-white mt-2 font-mono">
              {overview?.totalBios ?? 0}
            </h4>
            <p className="text-[11px] text-neutral-500 mt-1">
              Public profile pages
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-neutral-800 pb-4 gap-3">
          <div className="flex flex-wrap items-center gap-2 bg-neutral-900 p-1 rounded-xl border border-neutral-800">
            <button
              onClick={() => setActiveTab("links")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                activeTab === "links"
                  ? "bg-white text-black shadow-sm"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              <Link2 className="w-3.5 h-3.5" />
              <span>Links & Moderation</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-neutral-800 text-neutral-300">
                {links.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("users")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                activeTab === "users"
                  ? "bg-white text-black shadow-sm"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Support & Users</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-neutral-800 text-neutral-300">
                {uniqueUsers.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("analytics")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                activeTab === "analytics"
                  ? "bg-white text-black shadow-sm"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Traffic Analytics</span>
            </button>
          </div>

          <div className="text-xs text-neutral-500 font-mono">
            Staff Access • Delegated Authority
          </div>
        </div>

        {/* Tab 1: Links & Moderation */}
        {activeTab === "links" && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="relative max-w-sm">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search links, creators, destinations..."
                className="w-full pl-10 pr-4 py-2 text-xs bg-neutral-900 border border-neutral-800 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:border-white transition"
              />
            </div>

            <div className="rounded-3xl border border-neutral-800 bg-neutral-900/60 shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-neutral-800 bg-neutral-900 text-[11px] uppercase tracking-wider text-neutral-400 font-semibold">
                    <th className="py-3.5 px-5">Link Path</th>
                    <th className="py-3.5 px-5">Creator</th>
                    <th className="py-3.5 px-5">Destination URL</th>
                    <th className="py-3.5 px-5 text-center">Status</th>
                    <th className="py-3.5 px-5 text-right">Clicks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800 text-xs">
                  {filteredLinks.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-neutral-500">
                        No links found.
                      </td>
                    </tr>
                  ) : (
                    filteredLinks.map((l) => {
                      const isExpired = l.expiresAt && new Date(l.expiresAt).getTime() <= Date.now();
                      const path = `/${l.username}/${l.webname}`;

                      return (
                        <tr key={l.id} className="hover:bg-neutral-800/40 transition">
                          <td className="py-4 px-5 font-mono font-bold text-white">
                            <a
                              href={path}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:underline flex items-center gap-1.5"
                            >
                              <span>{path}</span>
                              <ExternalLink className="w-3 h-3 text-neutral-500" />
                            </a>
                          </td>

                          <td className="py-4 px-5 font-mono text-neutral-400">
                            @{l.username}
                          </td>

                          <td className="py-4 px-5 max-w-xs truncate text-neutral-300 font-mono text-[11px]">
                            <div className="flex items-center gap-1.5">
                              <ArrowRight className="w-3 h-3 text-neutral-600 flex-shrink-0" />
                              <span className="truncate">{l.destinationUrl}</span>
                            </div>
                          </td>

                          <td className="py-4 px-5 text-center">
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                                isExpired
                                  ? "bg-neutral-800 text-neutral-400"
                                  : "bg-emerald-950 text-emerald-300 border border-emerald-800"
                              }`}
                            >
                              {isExpired ? "Expired" : "Active"}
                            </span>
                          </td>

                          <td className="py-4 px-5 text-right font-mono font-bold text-white">
                            {l.clickCount || 0}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: Support & Users */}
        {activeTab === "users" && (
          <div className="rounded-3xl border border-neutral-800 bg-neutral-900/60 shadow-sm overflow-hidden animate-in fade-in duration-200">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-neutral-800 bg-neutral-900 text-[11px] uppercase tracking-wider text-neutral-400 font-semibold">
                  <th className="py-3.5 px-5">Creator</th>
                  <th className="py-3.5 px-5 text-center">Total Links</th>
                  <th className="py-3.5 px-5 text-center">Bio Pages</th>
                  <th className="py-3.5 px-5 text-right">Total Traffic</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800 text-xs">
                {uniqueUsers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-neutral-500">
                      No user accounts found.
                    </td>
                  </tr>
                ) : (
                  uniqueUsers.map((u) => (
                    <tr key={u.username} className="hover:bg-neutral-800/40 transition">
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center font-bold text-xs">
                            {u.username.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-bold text-white block">@{u.username}</span>
                            <a
                              href={`/${u.username}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] text-neutral-500 hover:text-white font-mono transition"
                            >
                              /{u.username}
                            </a>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-5 text-center font-mono text-neutral-300">
                        {u.linksCount}
                      </td>

                      <td className="py-4 px-5 text-center font-mono text-neutral-400">
                        {u.biosCount}
                      </td>

                      <td className="py-4 px-5 text-right font-mono font-bold text-white text-sm">
                        {u.totalClicks}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 3: Analytics */}
        {activeTab === "analytics" && (
          <div className="p-8 rounded-3xl border border-neutral-800 bg-neutral-900/60 shadow-sm space-y-4 animate-in fade-in duration-200">
            <h3 className="text-base font-bold text-white">Platform Traffic Metrics</h3>
            <p className="text-xs text-neutral-400">
              Aggregated overview of click traffic across all creator links
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
              <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800">
                <span className="text-xs text-neutral-400">All-Time Traffic</span>
                <div className="text-2xl font-bold text-white font-mono mt-1">{overview?.totalClicks ?? 0} clicks</div>
              </div>
              <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800">
                <span className="text-xs text-neutral-400">Active Destinations</span>
                <div className="text-2xl font-bold text-white font-mono mt-1">{overview?.activeCount ?? 0} links</div>
              </div>
              <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800">
                <span className="text-xs text-neutral-400">Creator Profiles</span>
                <div className="text-2xl font-bold text-white font-mono mt-1">{uniqueUsers.length} accounts</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
