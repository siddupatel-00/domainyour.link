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
  Activity,
  AlertCircle,
  Check,
  Globe,
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
      router.push("/");
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  return (
    <main className="min-h-screen bg-white text-neutral-900 pb-20 font-sans selection:bg-black selection:text-white">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-black text-white px-4 py-2.5 rounded-xl shadow-2xl animate-in slide-in-from-bottom-5 duration-200">
          <Check className="w-4 h-4" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Top Navigation */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-neutral-200 px-6 sm:px-12 py-3.5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/" className="flex items-center gap-2">
              <Link2 className="w-5 h-5 text-black stroke-[2.2]" />
              <span className="font-bold text-base tracking-tight text-neutral-900">
                PermanentLink
              </span>
            </a>
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded border border-neutral-200 text-neutral-500 bg-neutral-50">
              Dashboard
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsCreateOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-black hover:bg-neutral-800 text-white rounded-xl text-xs font-semibold transition shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Link</span>
            </button>
            <button
              onClick={handleLogout}
              title="Sign Out"
              className="p-2 rounded-xl text-neutral-500 hover:text-black border border-neutral-200 hover:border-neutral-400 transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="max-w-6xl mx-auto px-6 sm:px-12 mt-8">
        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="p-5 rounded-2xl border border-neutral-200 bg-neutral-50/50 flex items-center justify-between shadow-sm">
            <div>
              <p className="text-[11px] font-mono text-neutral-500 uppercase tracking-wider">Active Links</p>
              <h4 className="text-2xl font-bold text-neutral-900 mt-1">{redirects.length}</h4>
            </div>
            <div className="w-10 h-10 rounded-xl border border-neutral-200 bg-white flex items-center justify-center text-neutral-800 shadow-sm">
              <Link2 className="w-5 h-5" />
            </div>
          </div>

          <div className="p-5 rounded-2xl border border-neutral-200 bg-neutral-50/50 flex items-center justify-between shadow-sm">
            <div>
              <p className="text-[11px] font-mono text-neutral-500 uppercase tracking-wider">Redirect Status</p>
              <h4 className="text-2xl font-bold text-neutral-900 mt-1 font-mono">307 (Instant)</h4>
            </div>
            <div className="w-10 h-10 rounded-xl border border-neutral-200 bg-white flex items-center justify-center text-neutral-800 shadow-sm">
              <Zap className="w-5 h-5" />
            </div>
          </div>

          <div className="p-5 rounded-2xl border border-neutral-200 bg-neutral-50/50 flex items-center justify-between shadow-sm">
            <div>
              <p className="text-[11px] font-mono text-neutral-500 uppercase tracking-wider">Total Traffic</p>
              <h4 className="text-2xl font-bold text-neutral-900 mt-1 font-mono">
                {redirects.reduce((acc, curr) => acc + (curr.clickCount || 0), 0)} Clicks
              </h4>
            </div>
            <div className="w-10 h-10 rounded-xl border border-neutral-200 bg-white flex items-center justify-center text-neutral-800 shadow-sm">
              <Activity className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Section Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-lg font-bold text-neutral-900 tracking-tight">
              Redirect Management
            </h1>
            <p className="text-xs text-neutral-500">
              Manage permanent link namespaces and destination targets
            </p>
          </div>
          <button
            onClick={fetchRedirects}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono text-neutral-600 hover:text-black border border-neutral-200 hover:border-neutral-400 bg-white transition shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-800 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-neutral-700 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Table / Content */}
        {loading && redirects.length === 0 ? (
          <div className="p-16 text-center rounded-2xl border border-neutral-200 bg-neutral-50/50 text-neutral-500 text-xs font-mono">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-neutral-800" />
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
          showToast("Permanent link created");
        }}
      />

      <EditRedirectModal
        redirect={editingRedirect}
        isOpen={!!editingRedirect}
        onClose={() => setEditingRedirect(null)}
        baseUrl={baseUrl}
        onUpdated={() => {
          fetchRedirects();
          showToast("Destination updated");
        }}
      />

      <DeleteRedirectModal
        redirect={deletingRedirect}
        isOpen={!!deletingRedirect}
        onClose={() => setDeletingRedirect(null)}
        baseUrl={baseUrl}
        onDeleted={() => {
          fetchRedirects();
          showToast("Redirect deleted");
        }}
      />
    </main>
  );
}
