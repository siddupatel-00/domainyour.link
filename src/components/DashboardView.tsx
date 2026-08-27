"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Redirect, LinkGroup } from "@/lib/db/schema";
import { RedirectTable } from "@/app/admin/components/RedirectTable";
import { AnalyticsView } from "@/app/admin/components/AnalyticsView";
import { BioPageView } from "@/app/admin/components/BioPageView";
import { GroupFilterBar } from "@/app/admin/components/GroupFilterBar";
import { ManageGroupModal } from "@/app/admin/components/ManageGroupModal";
import { ShareGroupModal } from "@/app/admin/components/ShareGroupModal";
import { EmailRecapModal } from "@/app/admin/components/EmailRecapModal";
import { ResetClicksModal } from "@/app/admin/components/ResetClicksModal";
import { AvatarUploadModal } from "@/app/admin/components/AvatarUploadModal";
import { ChangeUsernameModal } from "@/app/admin/components/ChangeUsernameModal";
import { DeleteAccountModal } from "@/app/admin/components/DeleteAccountModal";
import { CreateRedirectModal } from "@/app/admin/components/CreateRedirectModal";
import { CreateSublinkModal } from "@/app/admin/components/CreateSublinkModal";
import { EditRedirectModal } from "@/app/admin/components/EditRedirectModal";
import { DeleteRedirectModal } from "@/app/admin/components/DeleteRedirectModal";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  Link2,
  Plus,
  LogOut,
  Check,
  TrendingUp,
  Clock,
  RotateCw,
  ExternalLink,
  Sparkles,
  Mail,
  Folder,
  Camera,
  UserCheck,
  Trash2,
} from "lucide-react";

export type DashboardTab = "links" | "expired" | "analytics" | "bio";

interface DashboardViewProps {
  initialTab?: DashboardTab;
}

export function DashboardView({ initialTab = "links" }: DashboardViewProps) {
  const [activeTab, setActiveTab] = useState<DashboardTab>(initialTab);
  const [redirects, setRedirects] = useState<Redirect[]>([]);
  const [groups, setGroups] = useState<LinkGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<number | "all">("all");
  const [loading, setLoading] = useState(true);
  const [baseUrl, setBaseUrl] = useState("");
  const [currentUser, setCurrentUser] = useState("siddu");
  const [currentUserEmail, setCurrentUserEmail] = useState<string>("");
  const [avatar, setAvatar] = useState<string | null>(null);

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [sublinkParent, setSublinkParent] = useState<Redirect | null>(null);
  const [editingRedirect, setEditingRedirect] = useState<Redirect | null>(null);
  const [deletingRedirect, setDeletingRedirect] = useState<Redirect | null>(null);
  const [isManageGroupOpen, setIsManageGroupOpen] = useState(false);
  const [isGroupImportOnly, setIsGroupImportOnly] = useState(false);
  const [groupToEdit, setGroupToEdit] = useState<LinkGroup | null>(null);
  const [groupToShare, setGroupToShare] = useState<LinkGroup | null>(null);
  const [isEmailRecapOpen, setIsEmailRecapOpen] = useState(false);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [isChangeUsernameOpen, setIsChangeUsernameOpen] = useState(false);
  const [isDeleteAccountOpen, setIsDeleteAccountOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [userMenuPos, setUserMenuPos] = useState<{ top: number; left: number } | null>(null);
  const userMenuRef = useRef<HTMLDivElement | null>(null);
  const [resetClicksTarget, setResetClicksTarget] = useState<{ redirect: Redirect | null; isOpen: boolean } | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Close user dropdown on outside click or scroll
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
        setUserMenuPos(null);
      }
    };
    const handleClose = () => {
      setIsUserMenuOpen(false);
      setUserMenuPos(null);
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

  const router = useRouter();
  const pathname = usePathname();

  // Detect path on load if initialTab not specified
  useEffect(() => {
    if (pathname === "/expire" || pathname === "/expired") {
      setActiveTab("expired");
    } else if (pathname === "/analytics") {
      setActiveTab("analytics");
    } else if (pathname === "/biopage" || pathname === "/bio") {
      setActiveTab("bio");
    } else if (pathname === "/activelinks") {
      setActiveTab("links");
    } else if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [pathname, initialTab]);

  const switchTab = (tab: DashboardTab) => {
    setActiveTab(tab);
    let targetPath = "/admin";
    if (tab === "links") targetPath = "/activelinks";
    else if (tab === "expired") targetPath = "/expire";
    else if (tab === "analytics") targetPath = "/analytics";
    else if (tab === "bio") targetPath = "/biopage";

    if (typeof window !== "undefined") {
      window.history.pushState(null, "", targetPath);
    }
  };

  const isLinkExpired = (r: Redirect) => {
    return r.expiresAt && new Date(r.expiresAt).getTime() <= Date.now();
  };

  const activeLinks = redirects.filter((r) => !isLinkExpired(r));
  const expiredLinks = redirects.filter((r) => isLinkExpired(r));
  const totalClicks = redirects.reduce((acc, curr) => acc + (curr.clickCount || 0), 0);
  const activeLinkIdsSet = useMemo(() => new Set(activeLinks.map((l) => l.id)), [activeLinks]);

  // Filter links by selected group
  const displayedActiveLinks = selectedGroupId === "all"
    ? activeLinks
    : activeLinks.filter((r) => {
        const selectedGroup = groups.find((g) => g.id === selectedGroupId);
        if (!selectedGroup) return true;
        try {
          const parsed = JSON.parse(selectedGroup.linkIds || "[]");
          return Array.isArray(parsed) && parsed.includes(r.id);
        } catch {
          return true;
        }
      });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Fetch groups
  const fetchGroups = useCallback(async () => {
    try {
      const res = await fetch(`/api/groups?t=${Date.now()}`, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });
      if (res.ok) {
        const data = await res.json();
        setGroups(data.groups || []);
      }
    } catch (err) {
      console.warn("Fetch groups error:", err);
    }
  }, []);

  // Reorder groups and persist order
  const handleReorderGroups = async (reorderedGroups: LinkGroup[]) => {
    setGroups(reorderedGroups);
    try {
      await fetch("/api/groups", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderedIds: reorderedGroups.map((g) => g.id),
        }),
      });
    } catch (err) {
      console.warn("Failed to persist group order:", err);
    }
  };

  // Real-time fresh data fetch (no-store)
  const fetchRedirects = useCallback(async () => {
    try {
      setLoading(true);

      const authRes = await fetch("/api/auth", {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });
      const authData = await authRes.json();
      if (!authData.authenticated) {
        router.push("/");
        return;
      }

      if (authData.user?.username) {
        setCurrentUser(authData.user.username);
      }
      if (authData.user?.email) {
        setCurrentUserEmail(authData.user.email);
      }

      const res = await fetch(`/api/redirects?t=${Date.now()}`, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });
      if (res.status === 401) {
        router.push("/");
        return;
      }

      if (res.ok) {
        const data = await res.json();
        setRedirects(data.redirects || []);
      } else {
        setRedirects([]);
      }
    } catch {
      setRedirects([]);
    } finally {
      setLoading(false);
    }
  }, [router]);

  const fetchUserSettings = useCallback(async () => {
    try {
      const res = await fetch(`/api/user/settings?t=${Date.now()}`, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.avatar) setAvatar(data.avatar);
        if (data.email) setCurrentUserEmail(data.email);
      }
    } catch {}
  }, []);

  useEffect(() => {
    setBaseUrl(window.location.origin);
    fetchRedirects();
    fetchGroups();
    fetchUserSettings();
  }, [fetchRedirects, fetchGroups, fetchUserSettings]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth", { method: "DELETE" });
      if (typeof window !== "undefined") {
        window.location.href = "/";
      } else {
        router.push("/");
      }
    } catch (err) {
      console.error("Logout error:", err);
      if (typeof window !== "undefined") {
        window.location.href = "/";
      }
    }
  };

  const handleToggleProfileVisibility = async (redirect: Redirect, nextVal: boolean) => {
    try {
      const res = await fetch(`/api/redirects/${redirect.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ showOnProfile: nextVal }),
      });

      if (res.ok) {
        showToast(nextVal ? "Added to your Bio Page!" : "Removed from your Bio Page");
        fetchRedirects();
      }
    } catch (err) {
      console.error("Toggle visibility error:", err);
    }
  };

  const handleExpireLink = async (redirect: Redirect) => {
    try {
      const res = await fetch(`/api/redirects/${redirect.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expiresAt: new Date(Date.now() - 1000).toISOString() }),
      });

      if (res.ok) {
        showToast("Link expired and moved to Expired tab");
        fetchRedirects();
      }
    } catch (err) {
      console.error("Expire link error:", err);
    }
  };

  const handleDeleteRedirectRequest = async (redirect: Redirect) => {
    if (typeof window !== "undefined" && localStorage.getItem("skip_delete_link_confirm") === "true") {
      try {
        const res = await fetch(`/api/redirects/${redirect.id}`, { method: "DELETE" });
        if (res.ok) {
          showToast("Link deleted");
          fetchRedirects();
          return;
        }
      } catch (err) {
        console.error("Delete link error:", err);
      }
    }
    setDeletingRedirect(redirect);
  };

  const handleResetClicks = (redirect: Redirect) => {
    setResetClicksTarget({ redirect, isOpen: true });
  };

  const handleResetAllAnalytics = () => {
    setResetClicksTarget({ redirect: null, isOpen: true });
  };

  const handleConfirmResetClicks = async () => {
    if (!resetClicksTarget) return;
    try {
      if (resetClicksTarget.redirect) {
        const r = resetClicksTarget.redirect;
        const res = await fetch(`/api/redirects/${r.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "reset_analytics" }),
        });
        if (res.ok) {
          showToast(`Reset clicks for /${r.username}/${r.webname} to 0`);
          fetchRedirects();
        }
      } else {
        const res = await fetch("/api/redirects", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "reset_all_analytics" }),
        });
        if (res.ok) {
          showToast("All link analytics reset to 0 clicks");
          fetchRedirects();
        }
      }
    } catch (err) {
      console.error("Reset clicks error:", err);
    }
  };

  const handleSaveGroup = async (groupData: {
    id?: number;
    name: string;
    color: string;
    linkIds: number[];
  }) => {
    const isEdit = !!groupData.id;
    const url = isEdit ? `/api/groups/${groupData.id}` : "/api/groups";
    const method = isEdit ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: groupData.name,
        color: groupData.color,
        linkIds: groupData.linkIds,
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to save group");

    showToast(isGroupImportOnly ? "Links imported to group!" : isEdit ? "Group updated!" : "Group box created!");
    fetchGroups();
  };

  const handleDeleteGroup = async (id: number) => {
    const res = await fetch(`/api/groups/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete group");

    if (selectedGroupId === id) {
      setSelectedGroupId("all");
    }
    showToast("Group box deleted");
    fetchGroups();
  };

  const handleSaveShareSettings = async (
    groupId: number,
    data: {
      isShared: boolean;
      shareCode?: string;
      duration?: string;
      expiresAt?: string | null;
    }
  ) => {
    const res = await fetch(`/api/groups/${groupId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to save share settings");
    }
    await fetchGroups();
    showToast(data.isShared ? "Group sharing updated!" : "Group sharing turned off");
  };

  const activeGroup = selectedGroupId !== "all" ? groups.find((g) => g.id === selectedGroupId) || null : null;

  return (
    <main className="min-h-screen bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 font-sans selection:bg-black dark:selection:bg-white selection:text-white dark:selection:text-black transition-colors duration-200">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-black dark:bg-white text-white dark:text-black px-4 py-2.5 rounded-xl shadow-2xl animate-in slide-in-from-bottom-5 duration-200">
          <Check className="w-4 h-4" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <header className="border-b border-neutral-100 dark:border-neutral-800/80 px-6 sm:px-12 py-4 sticky top-0 bg-white/90 dark:bg-neutral-950/90 backdrop-blur-md z-40">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <a href="/" className="flex items-center gap-2">
            <Link2 className="w-5 h-5 text-black dark:text-white stroke-[2.2]" />
            <span className="font-bold text-base tracking-tight text-neutral-900 dark:text-white">
              RelayLink
            </span>
          </a>

          <div className="flex items-center gap-2.5">
            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Refresh real-time data */}
            <button
              onClick={() => {
                fetchRedirects();
                fetchGroups();
                fetchUserSettings();
              }}
              title="Refresh real-time data"
              className="p-2 rounded-xl text-neutral-400 hover:text-black dark:hover:text-white hover:bg-neutral-50 dark:hover:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 transition cursor-pointer"
            >
              <RotateCw className={`w-4 h-4 ${loading ? "animate-spin text-black dark:text-white" : ""}`} />
            </button>

            {/* Create Link button */}
            <button
              onClick={() => setIsCreateOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-black dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-200 text-white dark:text-black rounded-xl text-xs font-semibold transition shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>
                {activeTab === "links" && activeGroup
                  ? `Add to ${activeGroup.name}`
                  : "Create Link"}
              </span>
            </button>

            {/* Profile Avatar Button (replaces 3-dots button) */}
            <div className="relative">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (isUserMenuOpen) {
                    setIsUserMenuOpen(false);
                    setUserMenuPos(null);
                  } else {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const dropdownWidth = 240;
                    setUserMenuPos({
                      top: rect.bottom + 8,
                      left: Math.max(12, rect.right - dropdownWidth),
                    });
                    setIsUserMenuOpen(true);
                  }
                }}
                title="Account options"
                className="relative p-0.5 rounded-full ring-2 ring-neutral-200 dark:ring-neutral-800 hover:ring-black dark:hover:ring-white transition cursor-pointer flex-shrink-0"
              >
                {avatar ? (
                  <img
                    src={avatar}
                    alt={currentUser}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-black dark:bg-white text-white dark:text-black flex items-center justify-center font-bold text-xs shadow-sm">
                    {currentUser.charAt(0).toUpperCase()}
                  </div>
                )}
              </button>

              {/* Unclipped User Account Dropdown */}
              {isUserMenuOpen && userMenuPos && (
                <div
                  ref={userMenuRef}
                  style={{
                    position: "fixed",
                    top: `${userMenuPos.top}px`,
                    left: `${userMenuPos.left}px`,
                    zIndex: 9999,
                  }}
                  className="w-60 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-2 shadow-2xl animate-in fade-in zoom-in-95 duration-150 text-left font-sans space-y-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* User Profile Header */}
                  <div className="flex items-center gap-3 p-2.5 pb-3 border-b border-neutral-100 dark:border-neutral-800">
                    {avatar ? (
                      <img
                        src={avatar}
                        alt={currentUser}
                        className="w-9 h-9 rounded-full object-cover ring-1 ring-neutral-200 dark:ring-neutral-700"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-black dark:bg-white text-white dark:text-black flex items-center justify-center font-bold text-sm shadow-xs">
                        {currentUser.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-xs text-neutral-900 dark:text-white truncate">
                        @{currentUser}
                      </div>
                      {currentUserEmail ? (
                        <div className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
                          {currentUserEmail}
                        </div>
                      ) : (
                        <div className="text-[10px] text-neutral-400 dark:text-neutral-500 truncate mt-0.5">
                          Permanent Member
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Menu items */}
                  <div className="pt-1 space-y-0.5">
                    {/* Profile Picture */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        setUserMenuPos(null);
                        setIsAvatarModalOpen(true);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 hover:text-black dark:hover:text-white rounded-xl transition text-left cursor-pointer"
                    >
                      <Camera className="w-4 h-4 text-neutral-400" />
                      <span>Profile Picture</span>
                    </button>

                    {/* Change Username */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        setUserMenuPos(null);
                        setIsChangeUsernameOpen(true);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 hover:text-black dark:hover:text-white rounded-xl transition text-left cursor-pointer"
                    >
                      <UserCheck className="w-4 h-4 text-neutral-400" />
                      <span>Change Username</span>
                    </button>

                    {/* Email Recap */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        setUserMenuPos(null);
                        setIsEmailRecapOpen(true);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 hover:text-black dark:hover:text-white rounded-xl transition text-left cursor-pointer"
                    >
                      <Mail className="w-4 h-4 text-neutral-400" />
                      <span>Email Recap</span>
                    </button>

                    <div className="h-px bg-neutral-100 dark:bg-neutral-800 my-1" />

                    {/* Sign Out */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        setUserMenuPos(null);
                        handleLogout();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 hover:text-black dark:hover:text-white rounded-xl transition text-left cursor-pointer"
                    >
                      <LogOut className="w-4 h-4 text-neutral-400" />
                      <span>Sign Out</span>
                    </button>

                    {/* Delete Account */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        setUserMenuPos(null);
                        setIsDeleteAccountOpen(true);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition text-left cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                      <span>Delete Account</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="max-w-5xl mx-auto px-6 sm:px-12 py-8 sm:py-10 space-y-8">
        {/* 3 Overview Boxes Side by Side */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* 1. Total Links Box */}
          <div
            onClick={() => switchTab("links")}
            className="cursor-pointer text-left p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/70 hover:border-neutral-300 dark:hover:border-neutral-700 transition shadow-sm flex items-center justify-between"
          >
            <div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">Total Links</p>
              <h4 className="text-2xl font-bold text-neutral-900 dark:text-white mt-1 font-mono">
                {redirects.length}
              </h4>
              <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5">All created links</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 flex items-center justify-center text-black dark:text-white">
              <Link2 className="w-5 h-5 stroke-[2]" />
            </div>
          </div>

          {/* 2. Expired Links Box */}
          <div
            onClick={() => switchTab("expired")}
            className="cursor-pointer text-left p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/70 hover:border-neutral-300 dark:hover:border-neutral-700 transition shadow-sm flex items-center justify-between"
          >
            <div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">Expired Links</p>
              <h4 className="text-2xl font-bold text-neutral-900 dark:text-white mt-1 font-mono">
                {expiredLinks.length}
              </h4>
              <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5">Ended temporary links</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 flex items-center justify-center text-black dark:text-white">
              <Clock className="w-5 h-5 stroke-[2]" />
            </div>
          </div>

          {/* 3. Analytics Box */}
          <div
            onClick={() => switchTab("analytics")}
            className="cursor-pointer text-left p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/70 hover:border-neutral-300 dark:hover:border-neutral-700 transition shadow-sm flex items-center justify-between"
          >
            <div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">Analytics</p>
              <h4 className="text-2xl font-bold text-neutral-900 dark:text-white mt-1 font-mono">
                {totalClicks} <span className="text-xs font-normal text-neutral-500">Clicks</span>
              </h4>
              <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5">Total visitor traffic</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 flex items-center justify-center text-black dark:text-white">
              <TrendingUp className="w-5 h-5 stroke-[2]" />
            </div>
          </div>
        </div>

        {/* Tab Selection Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-neutral-100 dark:border-neutral-800/80 pb-4 gap-3">
          <div className="flex flex-wrap items-center gap-1.5 bg-neutral-100 dark:bg-neutral-900 p-1 rounded-xl border border-transparent dark:border-neutral-800">
            {/* 1. Active Links Tab */}
            <button
              type="button"
              onClick={() => switchTab("links")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                activeTab === "links"
                  ? "bg-black dark:bg-white text-white dark:text-black shadow-sm"
                  : "text-neutral-500 dark:text-neutral-400 hover:text-black dark:hover:text-white"
              }`}
            >
              <span>Active Links</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-medium ${
                activeTab === "links"
                  ? "bg-neutral-800 dark:bg-neutral-200 text-white dark:text-black"
                  : "bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
              }`}>
                {activeLinks.length}
              </span>
            </button>

            {/* 2. Expired Links Tab */}
            <button
              type="button"
              onClick={() => switchTab("expired")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                activeTab === "expired"
                  ? "bg-black dark:bg-white text-white dark:text-black shadow-sm"
                  : "text-neutral-500 dark:text-neutral-400 hover:text-black dark:hover:text-white"
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Expired</span>
              {expiredLinks.length > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                  activeTab === "expired"
                    ? "bg-neutral-800 dark:bg-neutral-200 text-white dark:text-black"
                    : "bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
                }`}>
                  {expiredLinks.length}
                </span>
              )}
            </button>

            {/* 3. Analytics Tab */}
            <button
              type="button"
              onClick={() => switchTab("analytics")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                activeTab === "analytics"
                  ? "bg-black dark:bg-white text-white dark:text-black shadow-sm"
                  : "text-neutral-500 dark:text-neutral-400 hover:text-black dark:hover:text-white"
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Analytics</span>
            </button>

            {/* 4. Bio Page Tab */}
            <button
              type="button"
              onClick={() => switchTab("bio")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                activeTab === "bio"
                  ? "bg-black dark:bg-white text-white dark:text-black shadow-sm"
                  : "text-neutral-500 dark:text-neutral-400 hover:text-black dark:hover:text-white"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Bio Page (/{currentUser})</span>
            </button>
          </div>

          <div className="text-xs text-neutral-400 dark:text-neutral-500 font-mono">
            {activeTab === "links" && `${activeLinks.length} active`}
            {activeTab === "expired" && `${expiredLinks.length} expired`}
            {activeTab === "analytics" && `${totalClicks} total clicks`}
            {activeTab === "bio" && `/${currentUser}`}
          </div>
        </div>

        {/* View Section */}
        {loading && redirects.length === 0 ? (
          <div className="py-20 text-center text-neutral-400 text-xs font-medium">
            Loading...
          </div>
        ) : activeTab === "links" ? (
          <div className="space-y-6">
            {/* Group Organizer Filter Bar */}
            <GroupFilterBar
              groups={groups}
              selectedGroupId={selectedGroupId}
              onSelectGroup={(gId) => setSelectedGroupId(gId)}
              totalLinksCount={activeLinks.length}
              existingLinkIds={activeLinkIdsSet}
              onOpenCreateGroup={() => {
                setGroupToEdit(null);
                setIsGroupImportOnly(false);
                setIsManageGroupOpen(true);
              }}
              onOpenEditGroup={(group) => {
                setGroupToEdit(group);
                setIsGroupImportOnly(false);
                setIsManageGroupOpen(true);
              }}
              onOpenShareGroup={(group) => {
                setGroupToShare(group);
              }}
              onReorderGroups={handleReorderGroups}
            />

            {/* Active Links Table */}
            <RedirectTable
              redirects={displayedActiveLinks}
              baseUrl={baseUrl}
              onEdit={(r) => setEditingRedirect(r)}
              onDelete={handleDeleteRedirectRequest}
              onCreateOpen={() => setIsCreateOpen(true)}
              onCreateSublink={(r) => setSublinkParent(r)}
              onToggleProfileVisibility={handleToggleProfileVisibility}
              onExpireLink={handleExpireLink}
              onResetClicks={handleResetClicks}
              selectedGroup={selectedGroupId !== "all" ? groups.find((g) => g.id === selectedGroupId) || null : null}
              onOpenEditGroup={(grp) => {
                setGroupToEdit(grp);
                setIsGroupImportOnly(false);
                setIsManageGroupOpen(true);
              }}
              onOpenShareGroup={(grp) => {
                setGroupToShare(grp);
              }}
              onDeleteGroup={handleDeleteGroup}
              onOpenImportFromAllLinks={
                selectedGroupId !== "all" && activeLinks.length > 0
                  ? () => {
                      const grp = groups.find((g) => g.id === selectedGroupId);
                      if (grp) {
                        setGroupToEdit(grp);
                        setIsGroupImportOnly(true);
                        setIsManageGroupOpen(true);
                      }
                    }
                  : undefined
              }
              isExpiredView={false}
            />
          </div>
        ) : activeTab === "expired" ? (
          <RedirectTable
            redirects={expiredLinks}
            baseUrl={baseUrl}
            onEdit={(r) => setEditingRedirect(r)}
            onDelete={handleDeleteRedirectRequest}
            onCreateOpen={() => setIsCreateOpen(true)}
            onCreateSublink={(r) => setSublinkParent(r)}
            onToggleProfileVisibility={handleToggleProfileVisibility}
            onResetClicks={handleResetClicks}
            isExpiredView={true}
          />
        ) : activeTab === "analytics" ? (
          <AnalyticsView
            redirects={redirects}
            baseUrl={baseUrl}
            onEdit={(r) => setEditingRedirect(r)}
            onDelete={handleDeleteRedirectRequest}
            onCreateSublink={(r) => setSublinkParent(r)}
            onResetClicks={handleResetClicks}
            onResetAllAnalytics={handleResetAllAnalytics}
          />
        ) : (
          <BioPageView
            redirects={redirects}
            baseUrl={baseUrl}
            currentUser={currentUser}
            onRefreshData={fetchRedirects}
          />
        )}
      </div>

      {/* Modals */}
      <CreateRedirectModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        targetGroup={activeTab === "links" ? activeGroup : null}
        baseUrl={baseUrl}
        currentUser={currentUser}
        onCreated={() => {
          fetchRedirects();
          fetchGroups();
          showToast(
            activeTab === "links" && activeGroup
              ? `Link created and added to ${activeGroup.name}!`
              : "Link created!"
          );
        }}
      />

      <CreateSublinkModal
        isOpen={!!sublinkParent}
        onClose={() => setSublinkParent(null)}
        parentRedirect={sublinkParent}
        baseUrl={baseUrl}
        currentUser={currentUser}
        onCreated={() => {
          fetchRedirects();
          showToast("Sub-link created!");
        }}
      />

      <EditRedirectModal
        isOpen={!!editingRedirect}
        onClose={() => setEditingRedirect(null)}
        redirect={editingRedirect}
        baseUrl={baseUrl}
        onUpdated={() => {
          fetchRedirects();
          showToast("Destination updated!");
        }}
      />

      <DeleteRedirectModal
        isOpen={!!deletingRedirect}
        onClose={() => setDeletingRedirect(null)}
        redirect={deletingRedirect}
        baseUrl={baseUrl}
        onDeleted={() => {
          fetchRedirects();
          showToast("Link deleted");
        }}
      />

      <ManageGroupModal
        isOpen={isManageGroupOpen}
        onClose={() => {
          setIsManageGroupOpen(false);
          setIsGroupImportOnly(false);
          setGroupToEdit(null);
        }}
        groupToEdit={groupToEdit}
        allRedirects={activeLinks}
        isImportOnly={isGroupImportOnly}
        onSaveGroup={handleSaveGroup}
        onDeleteGroup={handleDeleteGroup}
      />

      <ShareGroupModal
        isOpen={!!groupToShare}
        onClose={() => setGroupToShare(null)}
        group={groupToShare}
        baseUrl={baseUrl}
        onSaveShareSettings={handleSaveShareSettings}
      />

      <EmailRecapModal
        isOpen={isEmailRecapOpen}
        onClose={() => setIsEmailRecapOpen(false)}
        currentUser={currentUser}
      />

      <AvatarUploadModal
        isOpen={isAvatarModalOpen}
        onClose={() => setIsAvatarModalOpen(false)}
        currentAvatar={avatar}
        username={currentUser}
        onAvatarUpdated={(newAv) => {
          setAvatar(newAv);
          showToast(newAv ? "Profile picture updated!" : "Profile picture removed");
        }}
      />

      <ChangeUsernameModal
        isOpen={isChangeUsernameOpen}
        onClose={() => setIsChangeUsernameOpen(false)}
        currentUsername={currentUser}
        onUsernameChanged={(newU) => {
          setCurrentUser(newU);
          showToast(`Username changed to @${newU}`);
          fetchRedirects();
          fetchUserSettings();
        }}
      />

      <DeleteAccountModal
        isOpen={isDeleteAccountOpen}
        onClose={() => setIsDeleteAccountOpen(false)}
        username={currentUser}
      />

      <ResetClicksModal
        isOpen={!!resetClicksTarget?.isOpen}
        onClose={() => setResetClicksTarget(null)}
        targetRedirect={resetClicksTarget?.redirect ?? null}
        onConfirm={handleConfirmResetClicks}
      />
    </main>
  );
}
