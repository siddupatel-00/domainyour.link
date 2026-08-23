"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  TrendingUp,
  Users,
  Link2,
  Globe,
  Plus,
  Trash2,
  Edit2,
  MoreVertical,
  LogOut,
  RotateCw,
  Search,
  ArrowRight,
  Sparkles,
  Calendar,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AddEmployeeModal } from "@/app/ceo/components/AddEmployeeModal";
import { EditEmployeeModal } from "@/app/ceo/components/EditEmployeeModal";
import { Employee } from "@/lib/db/schema";

interface CeoCommandViewProps {
  initialTab?: "analytics" | "users" | "employees";
}

interface OverviewData {
  totalClicksWorldwide: number;
  allTimeClicksWorldwide: number;
  totalExpiredClicksWorldwide: number;
  totalLinksCreated: number;
  activeLinksCount: number;
  expiredLinksCount: number;
  totalUsersCount: number;
  totalBiosCount: number;
}

interface TopLink {
  id: number;
  username: string;
  webname: string;
  destinationUrl: string;
  clickCount: number;
  periodClicks?: number;
}

interface UserStat {
  username: string;
  totalLinks: number;
  activeLinks: number;
  totalClicks: number;
  totalBios: number;
}

export function CeoCommandView({ initialTab = "analytics" }: CeoCommandViewProps) {
  const [activeTab, setActiveTab] = useState<"analytics" | "users" | "employees">(initialTab);
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [topLinks, setTopLinks] = useState<TopLink[]>([]);
  const [usersList, setUsersList] = useState<UserStat[]>([]);
  const [employeesList, setEmployeesList] = useState<Employee[]>([]);

  // Timeframe filters for CEO analytics
  const [timeframe, setTimeframe] = useState<string>("7d");
  const [customStart, setCustomStart] = useState<string>("");
  const [customEnd, setCustomEnd] = useState<string>("");

  // Search & mod states
  const [userSearch, setUserSearch] = useState("");
  const [isAddEmployeeOpen, setIsAddEmployeeOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [openEmployeeMenuId, setOpenEmployeeMenuId] = useState<number | null>(null);

  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Switch tab with history sync
  const switchTab = (tab: "analytics" | "users" | "employees") => {
    setActiveTab(tab);
    window.history.pushState(null, "", `/ceo/${tab}`);
  };

  const fetchCeoData = useCallback(async () => {
    try {
      setLoading(true);

      // Verify CEO auth
      const authRes = await fetch("/api/ceo/auth", {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });
      const authData = await authRes.json();
      if (!authData.authenticated) {
        router.push("/ceo/login");
        return;
      }

      // Fetch statistics
      let statsUrl = `/api/ceo/stats?timeframe=${timeframe}&t=${Date.now()}`;
      if (timeframe === "custom" && customStart) {
        statsUrl += `&startDate=${customStart}`;
        if (customEnd) statsUrl += `&endDate=${customEnd}`;
      }

      const statsRes = await fetch(statsUrl, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });
      if (statsRes.ok) {
        const data = await statsRes.json();
        setOverview(data.overview);
        setTopLinks(data.topGlobalLinks || []);
        setUsersList(data.usersList || []);
      }

      // Fetch employee team list
      const empRes = await fetch(`/api/ceo/employees?t=${Date.now()}`, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });
      if (empRes.ok) {
        const empData = await empRes.json();
        setEmployeesList(empData.employees || []);
      }
    } catch (err) {
      console.error("Fetch CEO data error:", err);
    } finally {
      setLoading(false);
    }
  }, [router, timeframe, customStart, customEnd]);

  useEffect(() => {
    fetchCeoData();
  }, [fetchCeoData]);

  const handleLogout = async () => {
    try {
      await fetch("/api/ceo/auth", { method: "DELETE" });
      router.push("/ceo/login");
    } catch (err) {
      console.error("CEO logout error:", err);
    }
  };

  const handleDeleteEmployee = async (id: number) => {
    if (!confirm("Are you sure you want to remove this employee's access?")) return;
    try {
      const res = await fetch(`/api/ceo/employees/${id}`, { method: "DELETE" });
      if (res.ok) fetchCeoData();
    } catch (err) {
      console.error("Delete employee error:", err);
    }
  };

  const filteredUsers = usersList.filter((u) =>
    u.username.toLowerCase().includes(userSearch.toLowerCase())
  );

  return (
    <main className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white font-sans selection:bg-black dark:selection:bg-white selection:text-white dark:selection:text-black transition-colors duration-200">
      {/* CEO Executive Top Bar */}
      <header className="border-b border-neutral-200 dark:border-neutral-800/80 px-6 sm:px-12 py-4 sticky top-0 bg-white/90 dark:bg-neutral-950/90 backdrop-blur-md z-40">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-black dark:bg-white text-white dark:text-black flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-neutral-900 dark:text-white tracking-tight">
                  PermanentLink CEO
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-mono font-semibold border border-neutral-200 dark:border-neutral-700">
                  Executive Command
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <ThemeToggle />

            <button
              onClick={() => fetchCeoData()}
              title="Refresh Real-Time Data"
              className="p-2 rounded-xl text-neutral-500 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 transition cursor-pointer"
            >
              <RotateCw className={`w-4 h-4 ${loading ? "animate-spin text-black dark:text-white" : ""}`} />
            </button>

            <button
              onClick={handleLogout}
              title="Sign Out of CEO Portal"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 text-xs font-semibold text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition cursor-pointer shadow-2xs"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Lock Portal</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-6xl mx-auto px-6 sm:px-12 py-8 sm:py-10 space-y-8">
        {/* 4 Overview Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Worldwide Clicks */}
          <div className="p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/60 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">Worldwide Traffic</p>
              <div className="w-8 h-8 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-800 dark:text-white border border-neutral-200 dark:border-neutral-700">
                <Globe className="w-4 h-4" />
              </div>
            </div>
            <h4 className="text-2xl font-bold text-neutral-900 dark:text-white mt-2 font-mono">
              {overview?.totalClicksWorldwide ?? 0}
            </h4>
            <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-1">
              {overview?.allTimeClicksWorldwide ?? 0} all-time clicks
            </p>
          </div>

          {/* Card 2: Total Users / Creators */}
          <div className="p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/60 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">Creators & Users</p>
              <div className="w-8 h-8 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-800 dark:text-white border border-neutral-200 dark:border-neutral-700">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <h4 className="text-2xl font-bold text-neutral-900 dark:text-white mt-2 font-mono">
              {overview?.totalUsersCount ?? 0}
            </h4>
            <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-1">
              Active account profiles
            </p>
          </div>

          {/* Card 3: Total Links Created */}
          <div className="p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/60 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">Total Links</p>
              <div className="w-8 h-8 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-800 dark:text-white border border-neutral-200 dark:border-neutral-700">
                <Link2 className="w-4 h-4" />
              </div>
            </div>
            <h4 className="text-2xl font-bold text-neutral-900 dark:text-white mt-2 font-mono">
              {overview?.totalLinksCreated ?? 0}
            </h4>
            <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-1">
              {overview?.activeLinksCount ?? 0} active • {overview?.expiredLinksCount ?? 0} expired
            </p>
          </div>

          {/* Card 4: Total Bio Pages */}
          <div className="p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/60 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">Bio Pages</p>
              <div className="w-8 h-8 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-800 dark:text-white border border-neutral-200 dark:border-neutral-700">
                <Sparkles className="w-4 h-4" />
              </div>
            </div>
            <h4 className="text-2xl font-bold text-neutral-900 dark:text-white mt-2 font-mono">
              {overview?.totalBiosCount ?? 0}
            </h4>
            <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-1">
              Main & temporary sub-bios
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-4 gap-3">
          <div className="flex flex-wrap items-center gap-2 bg-neutral-100 dark:bg-neutral-900 p-1 rounded-xl border border-neutral-200 dark:border-neutral-800">
            <button
              onClick={() => switchTab("analytics")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                activeTab === "analytics"
                  ? "bg-white dark:bg-white text-black dark:text-black shadow-sm"
                  : "text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white"
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Worldwide Analytics</span>
            </button>

            <button
              onClick={() => switchTab("users")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                activeTab === "users"
                  ? "bg-white dark:bg-white text-black dark:text-black shadow-sm"
                  : "text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Users / Creators</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-medium ${
                activeTab === "users"
                  ? "bg-neutral-200 text-neutral-800"
                  : "bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
              }`}>
                {usersList.length}
              </span>
            </button>

            <button
              onClick={() => switchTab("employees")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                activeTab === "employees"
                  ? "bg-white dark:bg-white text-black dark:text-black shadow-sm"
                  : "text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white"
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Employees & Team</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-medium ${
                activeTab === "employees"
                  ? "bg-neutral-200 text-neutral-800"
                  : "bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
              }`}>
                {employeesList.length}
              </span>
            </button>
          </div>

          <div className="text-xs text-neutral-400 dark:text-neutral-500 font-mono">
            {activeTab === "analytics" && "/ceo/analytics"}
            {activeTab === "users" && "/ceo/users"}
            {activeTab === "employees" && "/ceo/employees"}
          </div>
        </div>

        {/* Tab 1: Global Analytics View */}
        {activeTab === "analytics" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Timeframe Range Selector */}
            <div className="p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/60 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { label: "24 Hours", val: "24h" },
                  { label: "Past 7 Days", val: "7d" },
                  { label: "Past 14 Days", val: "14d" },
                  { label: "This Month", val: "this_month" },
                  { label: "Last Month", val: "last_month" },
                  { label: "Custom Range", val: "custom" },
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

              {timeframe === "custom" && (
                <div className="flex items-center gap-2 text-xs">
                  <div className="flex items-center gap-1.5 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg px-2.5 py-1">
                    <Calendar className="w-3 h-3 text-neutral-400 dark:text-neutral-500" />
                    <input
                      type="date"
                      value={customStart}
                      onChange={(e) => setCustomStart(e.target.value)}
                      className="bg-transparent text-neutral-900 dark:text-white focus:outline-none text-xs"
                    />
                  </div>
                  <span className="text-neutral-400 dark:text-neutral-500">to</span>
                  <div className="flex items-center gap-1.5 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg px-2.5 py-1">
                    <Calendar className="w-3 h-3 text-neutral-400 dark:text-neutral-500" />
                    <input
                      type="date"
                      value={customEnd}
                      onChange={(e) => setCustomEnd(e.target.value)}
                      className="bg-transparent text-neutral-900 dark:text-white focus:outline-none text-xs"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Top Global Links Leaderboard */}
            <div className="rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/60 shadow-sm p-6 sm:p-8 space-y-5">
              <div className="flex items-center justify-between pb-4 border-b border-neutral-100 dark:border-neutral-800">
                <div>
                  <h3 className="text-base font-bold text-neutral-900 dark:text-white">Top Performing Links Worldwide</h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                    Highest traffic destinations across all creators
                  </p>
                </div>
                <span className="text-xs font-mono text-neutral-400 dark:text-neutral-500">
                  Ranked by clicks
                </span>
              </div>

              {topLinks.length === 0 ? (
                <div className="text-center py-12 text-neutral-400 dark:text-neutral-500 text-xs">
                  No click activity recorded yet.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {topLinks.map((link, idx) => {
                    const fullPath = `/${link.username}/${link.webname}`;
                    return (
                      <div
                        key={link.id}
                        className="p-4 rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 bg-neutral-50/60 dark:bg-neutral-950/60 flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0 flex items-center gap-3.5">
                          <div className="w-7 h-7 rounded-xl bg-neutral-200 dark:bg-neutral-800 text-neutral-900 dark:text-white flex items-center justify-center font-bold text-xs flex-shrink-0 font-mono">
                            #{idx + 1}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-sm text-neutral-900 dark:text-white truncate">
                                {fullPath}
                              </span>
                              <span className="text-[10px] px-2 py-0.5 rounded-md bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-400 font-mono">
                                @{link.username}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-neutral-500 truncate mt-0.5 font-mono">
                              <ArrowRight className="w-3 h-3 text-neutral-400 dark:text-neutral-600 flex-shrink-0" />
                              <span className="truncate">{link.destinationUrl}</span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right flex-shrink-0">
                          <div className="text-base font-bold text-neutral-900 dark:text-white font-mono">
                            {link.periodClicks || link.clickCount || 0}
                          </div>
                          <div className="text-[10px] text-neutral-400 dark:text-neutral-500">clicks in range</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Users / Creators View */}
        {activeTab === "users" && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Search Bar */}
            <div className="relative max-w-sm">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 dark:text-neutral-500" />
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search creators..."
                className="w-full pl-10 pr-4 py-2 text-xs bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 rounded-xl text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:border-black dark:focus:border-white transition"
              />
            </div>

            {/* Users Table */}
            <div className="rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/60 shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-[11px] uppercase tracking-wider text-neutral-600 dark:text-neutral-400 font-semibold">
                    <th className="py-3.5 px-5">Creator / Handle</th>
                    <th className="py-3.5 px-5 text-center">Active Links</th>
                    <th className="py-3.5 px-5 text-center">Total Links</th>
                    <th className="py-3.5 px-5 text-center">Bio Pages</th>
                    <th className="py-3.5 px-5 text-right">Total Clicks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800 text-xs">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-neutral-400 dark:text-neutral-500">
                        No creators found.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => (
                      <tr key={u.username} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition">
                        <td className="py-4 px-5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-black dark:bg-white text-white dark:text-black flex items-center justify-center font-bold text-xs">
                              {u.username.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <span className="font-bold text-neutral-900 dark:text-white block">@{u.username}</span>
                              <a
                                href={`/${u.username}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[11px] text-neutral-500 hover:text-black dark:hover:text-white font-mono transition"
                              >
                                /{u.username}
                              </a>
                            </div>
                          </div>
                        </td>

                        <td className="py-4 px-5 text-center font-mono font-medium text-neutral-700 dark:text-neutral-300">
                          {u.activeLinks}
                        </td>

                        <td className="py-4 px-5 text-center font-mono text-neutral-500 dark:text-neutral-400">
                          {u.totalLinks}
                        </td>

                        <td className="py-4 px-5 text-center font-mono text-neutral-500 dark:text-neutral-400">
                          {u.totalBios}
                        </td>

                        <td className="py-4 px-5 text-right font-mono font-bold text-neutral-900 dark:text-white text-sm">
                          {u.totalClicks}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Employees & Team Access */}
        {activeTab === "employees" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="p-6 rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-black dark:bg-white text-white dark:text-black flex items-center justify-center font-bold text-lg shadow-md flex-shrink-0">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-neutral-900 dark:text-white">Employee & Team Access</h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                    Authorize employees and manage platform insights access
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsAddEmployeeOpen(true)}
                className="flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-white dark:text-black bg-black dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-200 rounded-xl transition shadow-sm cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Employee</span>
              </button>
            </div>

            {/* Employees Table */}
            <div className="rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/60 shadow-sm overflow-visible">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-[11px] uppercase tracking-wider text-neutral-600 dark:text-neutral-400 font-semibold">
                    <th className="py-3.5 px-5">Employee</th>
                    <th className="py-3.5 px-5">Role</th>
                    <th className="py-3.5 px-5">Status</th>
                    <th className="py-3.5 px-5 text-right w-16"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800 text-xs">
                  {employeesList.map((emp) => {
                    const isMenuOpen = openEmployeeMenuId === emp.id;
                    const isActive = emp.status === "active";
                    const isInvited = emp.status === "invited";
                    const displayName = emp.name?.trim() || emp.email.split("@")[0];
                    const initialLetter = (emp.name?.trim() || emp.email).charAt(0).toUpperCase();

                    return (
                      <tr key={emp.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition relative">
                        <td className="py-4 px-5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white flex items-center justify-center font-bold text-xs border border-neutral-200 dark:border-neutral-700">
                              {initialLetter}
                            </div>
                            <div>
                              <span className="font-bold text-neutral-900 dark:text-white block">{displayName}</span>
                              <span className="text-[11px] text-neutral-500 font-mono">{emp.email}</span>
                            </div>
                          </div>
                        </td>

                        <td className="py-4 px-5">
                          <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">{emp.role}</span>
                        </td>

                        <td className="py-4 px-5">
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                              isActive
                                ? "bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                                : isInvited
                                ? "bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                                : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700"
                            }`}
                          >
                            {isActive ? "Active" : isInvited ? "Invited (Pending)" : "Suspended"}
                          </span>
                        </td>

                        <td className="py-4 px-5 text-right relative">
                          <div className="inline-block text-left">
                            <button
                              type="button"
                              onClick={() => setOpenEmployeeMenuId(isMenuOpen ? null : emp.id)}
                              className="p-1.5 rounded-lg text-neutral-400 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
                              title="Actions"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            {isMenuOpen && (
                              <div className="absolute right-4 top-12 z-50 w-44 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-1.5 shadow-2xl animate-in fade-in zoom-in-95 duration-150 text-left">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenEmployeeMenuId(null);
                                    setEditingEmployee(emp);
                                  }}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition text-left cursor-pointer"
                                >
                                  <Edit2 className="w-3.5 h-3.5 text-neutral-400" />
                                  <span>Edit permissions</span>
                                </button>

                                <div className="h-px bg-neutral-100 dark:bg-neutral-800 my-1" />

                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenEmployeeMenuId(null);
                                    handleDeleteEmployee(emp.id);
                                  }}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition text-left cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-red-500 dark:text-red-400" />
                                  <span>Revoke access</span>
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
          </div>
        )}
      </div>

      {/* Modals */}
      <AddEmployeeModal
        isOpen={isAddEmployeeOpen}
        onClose={() => setIsAddEmployeeOpen(false)}
        onCreated={() => fetchCeoData()}
      />

      <EditEmployeeModal
        employee={editingEmployee}
        isOpen={!!editingEmployee}
        onClose={() => setEditingEmployee(null)}
        onUpdated={() => fetchCeoData()}
      />
    </main>
  );
}
