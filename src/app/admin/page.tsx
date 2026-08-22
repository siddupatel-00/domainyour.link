"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Redirect } from "@/lib/db/schema";
import { RedirectTable } from "./components/RedirectTable";
import { AnalyticsView } from "./components/AnalyticsView";
import { BioPageView } from "./components/BioPageView";
import { CreateRedirectModal } from "./components/CreateRedirectModal";
import { CreateSublinkModal } from "./components/CreateSublinkModal";
import { EditRedirectModal } from "./components/EditRedirectModal";
import { DeleteRedirectModal } from "./components/DeleteRedirectModal";
import {
  Link2,
  Plus,
  LogOut,
  Check,
  CheckCircle2,
  TrendingUp,
  Clock,
  RotateCw,
  ExternalLink,
  Sparkles,
} from "lucide-react";

export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState<"links" | "expired" | "analytics" | "bio">("links");
  const [redirects, setRedirects] = useState<Redirect[]>([]);
  const [loading, setLoading] = useState(true);
  const [baseUrl, setBaseUrl] = useState("");
  const [currentUser, setCurrentUser] = useState("siddu");

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [sublinkParent, setSublinkParent] = useState<Redirect | null>(null);
  const [editingRedirect, setEditingRedirect] = useState<Redirect | null>(null);
  const [deletingRedirect, setDeletingRedirect] = useState<Redirect | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const router = useRouter();

  const isLinkExpired = (r: Redirect) => {
    return r.expiresAt && new Date(r.expiresAt).getTime() <= Date.now();
  };

  const activeLinks = redirects.filter((r) => !isLinkExpired(r));
  const expiredLinks = redirects.filter((r) => isLinkExpired(r));
  const totalClicks = redirects.reduce((acc, curr) => acc + (curr.clickCount || 0), 0);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
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

  useEffect(() => {
    setBaseUrl(window.location.origin);
    fetchRedirects();
  }, [fetchRedirects]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth", { method: "DELETE" });
      router.push("/");
    } catch (err) {
      console.error("Logout error:", err);
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

  return (
    <main className="min-h-screen bg-white text-neutral-900 font-sans selection:bg-black selection:text-white">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-black text-white px-4 py-2.5 rounded-xl shadow-2xl animate-in slide-in-from-bottom-5 duration-200">
          <Check className="w-4 h-4" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <header className="border-b border-neutral-100 px-6 sm:px-12 py-4 sticky top-0 bg-white/90 backdrop-blur-md z-40">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <a href="/" className="flex items-center gap-2">
            <Link2 className="w-5 h-5 text-black stroke-[2.2]" />
            <span className="font-bold text-base tracking-tight text-neutral-900">
              PermanentLink
            </span>
          </a>

          <div className="flex items-center gap-2.5">
            {/* View Bio Page Shortcut Button */}
            <a
              href={`/${currentUser}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-neutral-200 hover:border-black text-xs font-semibold text-neutral-800 bg-white transition shadow-2xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-black" />
              <span>/{currentUser} (Bio Page)</span>
              <ExternalLink className="w-3 h-3 text-neutral-400" />
            </a>

            <button
              onClick={() => fetchRedirects()}
              title="Refresh real-time data"
              className="p-2 rounded-xl text-neutral-400 hover:text-black hover:bg-neutral-50 border border-neutral-200 transition"
            >
              <RotateCw className={`w-4 h-4 ${loading ? "animate-spin text-black" : ""}`} />
            </button>

            <button
              onClick={() => setIsCreateOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-black hover:bg-neutral-800 text-white rounded-xl text-xs font-semibold transition shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Create Link</span>
            </button>
            <button
              onClick={handleLogout}
              title="Sign Out"
              className="p-2 rounded-xl text-neutral-400 hover:text-black hover:bg-neutral-50 border border-neutral-200 transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="max-w-5xl mx-auto px-6 sm:px-12 py-8 sm:py-10 space-y-8">
        {/* 3 Overview Boxes Side by Side */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* 1. Total Links Box */}
          <div
            onClick={() => setActiveTab("links")}
            className="cursor-pointer text-left p-5 rounded-2xl border border-neutral-200 bg-white hover:border-neutral-300 transition shadow-sm flex items-center justify-between"
          >
            <div>
              <p className="text-xs text-neutral-500 font-medium">Total Links</p>
              <h4 className="text-2xl font-bold text-neutral-900 mt-1 font-mono">
                {redirects.length}
              </h4>
              <p className="text-[11px] text-neutral-400 mt-0.5">All created links</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-neutral-100 border border-neutral-200 flex items-center justify-center text-black">
              <Link2 className="w-5 h-5 stroke-[2]" />
            </div>
          </div>

          {/* 2. Working Links Box */}
          <div
            onClick={() => setActiveTab("links")}
            className="cursor-pointer text-left p-5 rounded-2xl border border-neutral-200 bg-white hover:border-neutral-300 transition shadow-sm flex items-center justify-between"
          >
            <div>
              <p className="text-xs text-neutral-500 font-medium">Working Links</p>
              <h4 className="text-2xl font-bold text-neutral-900 mt-1 font-mono">
                {activeLinks.length}
              </h4>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                {expiredLinks.length > 0 ? `${expiredLinks.length} expired` : "100% active & fast"}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-neutral-100 border border-neutral-200 flex items-center justify-center text-black">
              <CheckCircle2 className="w-5 h-5 stroke-[2]" />
            </div>
          </div>

          {/* 3. Analytics Box */}
          <div
            onClick={() => setActiveTab("analytics")}
            className="cursor-pointer text-left p-5 rounded-2xl border border-neutral-200 bg-white hover:border-neutral-300 transition shadow-sm flex items-center justify-between"
          >
            <div>
              <p className="text-xs text-neutral-500 font-medium">Analytics</p>
              <h4 className="text-2xl font-bold text-neutral-900 mt-1 font-mono">
                {totalClicks} <span className="text-xs font-normal text-neutral-500">Clicks</span>
              </h4>
              <p className="text-[11px] text-neutral-400 mt-0.5">Total visitor traffic</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-neutral-100 border border-neutral-200 flex items-center justify-center text-black">
              <TrendingUp className="w-5 h-5 stroke-[2]" />
            </div>
          </div>
        </div>

        {/* Tab Selection Switcher (Active Links | Expired Links | Analytics | Bio Page) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-neutral-100 pb-4 gap-3">
          <div className="flex flex-wrap items-center gap-2 bg-neutral-100 p-1 rounded-xl">
            {/* Active Links Tab */}
            <button
              type="button"
              onClick={() => setActiveTab("links")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition ${
                activeTab === "links"
                  ? "bg-white text-black shadow-sm"
                  : "text-neutral-500 hover:text-black"
              }`}
            >
              <span>Active Links</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-neutral-200 text-neutral-700">
                {activeLinks.length}
              </span>
            </button>

            {/* Expired Links Tab */}
            <button
              type="button"
              onClick={() => setActiveTab("expired")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition ${
                activeTab === "expired"
                  ? "bg-white text-black shadow-sm"
                  : "text-neutral-500 hover:text-black"
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Expired</span>
              {expiredLinks.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-neutral-200 text-neutral-800 font-semibold">
                  {expiredLinks.length}
                </span>
              )}
            </button>

            {/* Analytics Tab */}
            <button
              type="button"
              onClick={() => setActiveTab("analytics")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition ${
                activeTab === "analytics"
                  ? "bg-white text-black shadow-sm"
                  : "text-neutral-500 hover:text-black"
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Analytics</span>
            </button>

            {/* Bio Page Tab */}
            <button
              type="button"
              onClick={() => setActiveTab("bio")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition ${
                activeTab === "bio"
                  ? "bg-black text-white shadow-sm"
                  : "text-neutral-500 hover:text-black"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Bio Page (/{currentUser})</span>
            </button>
          </div>

          <div className="text-xs text-neutral-400 font-mono">
            {activeTab === "links" && `${activeLinks.length} active`}
            {activeTab === "expired" && `${expiredLinks.length} expired`}
            {activeTab === "analytics" && `${totalClicks} total clicks`}
            {activeTab === "bio" && `localhost:3000/${currentUser}`}
          </div>
        </div>

        {/* View Section */}
        {loading && redirects.length === 0 ? (
          <div className="py-20 text-center text-neutral-400 text-xs font-medium">
            Loading...
          </div>
        ) : activeTab === "links" ? (
          <RedirectTable
            redirects={activeLinks}
            baseUrl={baseUrl}
            onEdit={(r) => setEditingRedirect(r)}
            onDelete={(r) => setDeletingRedirect(r)}
            onCreateOpen={() => setIsCreateOpen(true)}
            onCreateSublink={(r) => setSublinkParent(r)}
            onToggleProfileVisibility={handleToggleProfileVisibility}
            isExpiredView={false}
          />
        ) : activeTab === "expired" ? (
          <RedirectTable
            redirects={expiredLinks}
            baseUrl={baseUrl}
            onEdit={(r) => setEditingRedirect(r)}
            onDelete={(r) => setDeletingRedirect(r)}
            onCreateOpen={() => setIsCreateOpen(true)}
            onCreateSublink={(r) => setSublinkParent(r)}
            onToggleProfileVisibility={handleToggleProfileVisibility}
            isExpiredView={true}
          />
        ) : activeTab === "analytics" ? (
          <AnalyticsView
            redirects={redirects}
            baseUrl={baseUrl}
            onEdit={(r) => setEditingRedirect(r)}
            onDelete={(r) => setDeletingRedirect(r)}
            onCreateSublink={(r) => setSublinkParent(r)}
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
        baseUrl={baseUrl}
        currentUser={currentUser}
        onCreated={() => {
          fetchRedirects();
          showToast("Link created!");
        }}
      />

      <CreateSublinkModal
        parentRedirect={sublinkParent}
        isOpen={!!sublinkParent}
        onClose={() => setSublinkParent(null)}
        baseUrl={baseUrl}
        currentUser={currentUser}
        onCreated={() => {
          fetchRedirects();
          showToast("Sub-link created!");
        }}
      />

      <EditRedirectModal
        redirect={editingRedirect}
        isOpen={!!editingRedirect}
        onClose={() => setEditingRedirect(null)}
        baseUrl={baseUrl}
        onUpdated={() => {
          fetchRedirects();
          showToast("Link updated!");
        }}
      />

      <DeleteRedirectModal
        redirect={deletingRedirect}
        isOpen={!!deletingRedirect}
        onClose={() => setDeletingRedirect(null)}
        baseUrl={baseUrl}
        onDeleted={() => {
          fetchRedirects();
          showToast("Link deleted");
        }}
      />
    </main>
  );
}
