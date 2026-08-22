"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Redirect } from "@/lib/db/schema";
import { RedirectTable } from "./components/RedirectTable";
import { CreateRedirectModal } from "./components/CreateRedirectModal";
import { EditRedirectModal } from "./components/EditRedirectModal";
import { DeleteRedirectModal } from "./components/DeleteRedirectModal";
import {
  Link2,
  Plus,
  LogOut,
  RefreshCw,
  Zap,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

export default function AdminDashboardPage() {
  const [redirects, setRedirects] = useState<Redirect[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [baseUrl, setBaseUrl] = useState("");

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingRedirect, setEditingRedirect] = useState<Redirect | null>(null);
  const [deletingRedirect, setDeletingRedirect] = useState<Redirect | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const router = useRouter();

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const fetchRedirects = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Check auth status
      const authRes = await fetch("/api/auth");
      const authData = await authRes.json();
      if (!authData.authenticated) {
        router.push("/admin/login");
        return;
      }

      const res = await fetch("/api/redirects");
      if (res.status === 401) {
        router.push("/admin/login");
        return;
      }
      if (!res.ok) {
        throw new Error("Failed to load redirects from database");
      }

      const data = await res.json();
      setRedirects(data.redirects || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load redirects");
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
      router.push("/admin/login");
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  return (
    <main className="min-h-screen bg-[#090d16] text-slate-100 pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-slate-900 border border-slate-700 text-emerald-400 px-4 py-3 rounded-xl shadow-2xl animate-in slide-in-from-bottom-5 duration-200">
          <CheckCircle2 className="w-4 h-4" />
          <span className="text-xs font-medium text-slate-200">{toastMessage}</span>
        </div>
      )}

      {/* Top Navigation */}
      <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-8 py-3.5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-600/10 border border-indigo-500/20 text-indigo-400">
              <Link2 className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-sm text-white tracking-tight">
                PermanentLink
              </span>
              <span className="ml-2 text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                Admin
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsCreateOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition shadow-md shadow-indigo-600/20"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Link</span>
            </button>
            <button
              onClick={handleLogout}
              title="Sign Out"
              className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition border border-slate-800"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="max-w-6xl mx-auto px-4 sm:px-8 mt-8">
        {/* Metric / Feature Highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex items-center gap-3.5">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400">
              <Link2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] text-slate-400 font-medium">Permanent Links</p>
              <h4 className="text-xl font-bold text-white">{redirects.length} Active</h4>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex items-center gap-3.5">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] text-slate-400 font-medium">Redirect Latency</p>
              <h4 className="text-xl font-bold text-white">HTTP 307 (Instant)</h4>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex items-center gap-3.5">
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] text-slate-400 font-medium">Total Redirect Traffic</p>
              <h4 className="text-xl font-bold text-white">
                {redirects.reduce((acc, curr) => acc + (curr.clickCount || 0), 0)} Clicks
              </h4>
            </div>
          </div>
        </div>

        {/* Header Title with Refresh */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              Redirect Management
            </h1>
            <p className="text-xs text-slate-400">
              Manage your namespaces, links, and destinations
            </p>
          </div>
          <button
            onClick={fetchRedirects}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white bg-slate-900 border border-slate-800 hover:bg-slate-800 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Table or Loading State */}
        {loading && redirects.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-slate-800 text-slate-400 text-xs">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-400" />
            Loading permanent links...
          </div>
        ) : (
          <RedirectTable
            redirects={redirects}
            baseUrl={baseUrl}
            onEdit={(r) => setEditingRedirect(r)}
            onDelete={(r) => setDeletingRedirect(r)}
            onCreateOpen={() => setIsCreateOpen(true)}
          />
        )}
      </div>

      {/* Modals */}
      <CreateRedirectModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        baseUrl={baseUrl}
        onCreated={() => {
          fetchRedirects();
          showToast("Permanent link created successfully!");
        }}
      />

      <EditRedirectModal
        redirect={editingRedirect}
        isOpen={!!editingRedirect}
        onClose={() => setEditingRedirect(null)}
        baseUrl={baseUrl}
        onUpdated={() => {
          fetchRedirects();
          showToast("Destination URL updated!");
        }}
      />

      <DeleteRedirectModal
        redirect={deletingRedirect}
        isOpen={!!deletingRedirect}
        onClose={() => setDeletingRedirect(null)}
        baseUrl={baseUrl}
        onDeleted={() => {
          fetchRedirects();
          showToast("Permanent link deleted.");
        }}
      />
    </main>
  );
}
