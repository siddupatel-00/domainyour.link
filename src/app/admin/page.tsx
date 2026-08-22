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
    <main className="min-h-screen bg-black text-white pb-20">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-white text-black px-4 py-2.5 rounded-lg shadow-2xl animate-in slide-in-from-bottom-5 duration-200">
          <Check className="w-4 h-4" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Top Navigation */}
      <header className="sticky top-0 z-40 bg-black/90 backdrop-blur-md border-b border-neutral-800 px-4 sm:px-8 py-3.5">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white text-black flex items-center justify-center font-bold">
              <Link2 className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm tracking-tight text-white">
                PermanentLink
              </span>
              <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded border border-neutral-700 text-neutral-400 bg-neutral-900">
                Admin
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsCreateOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-black rounded-lg text-xs font-semibold hover:bg-neutral-200 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Link</span>
            </button>
            <button
              onClick={handleLogout}
              title="Sign Out"
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white border border-neutral-800 hover:border-neutral-600 transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-8 mt-8">
        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
          <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-950 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider">Active Links</p>
              <h4 className="text-xl font-bold text-white mt-1">{redirects.length}</h4>
            </div>
            <div className="w-8 h-8 rounded-lg border border-neutral-800 bg-black flex items-center justify-center text-neutral-300">
              <Link2 className="w-4 h-4" />
            </div>
          </div>

          <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-950 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider">Redirect Status</p>
              <h4 className="text-xl font-bold text-white mt-1 font-mono">307 (Instant)</h4>
            </div>
            <div className="w-8 h-8 rounded-lg border border-neutral-800 bg-black flex items-center justify-center text-neutral-300">
              <Zap className="w-4 h-4" />
            </div>
          </div>

          <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-950 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider">Total Traffic</p>
              <h4 className="text-xl font-bold text-white mt-1 font-mono">
                {redirects.reduce((acc, curr) => acc + (curr.clickCount || 0), 0)} Clicks
              </h4>
            </div>
            <div className="w-8 h-8 rounded-lg border border-neutral-800 bg-black flex items-center justify-center text-neutral-300">
              <Activity className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Section Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-base font-semibold text-white tracking-tight">
              Redirects
            </h1>
            <p className="text-xs text-neutral-400">
              Manage permanent link namespaces and destinations
            </p>
          </div>
          <button
            onClick={fetchRedirects}
            disabled={loading}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono text-neutral-400 hover:text-white border border-neutral-800 hover:border-neutral-600 bg-neutral-950 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Sync</span>
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-3 rounded-lg border border-neutral-700 bg-neutral-900 text-white text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-neutral-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Table or Loading State */}
        {loading && redirects.length === 0 ? (
          <div className="p-12 text-center rounded-xl border border-neutral-800 bg-neutral-950 text-neutral-400 text-xs font-mono">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-white" />
            Fetching redirects...
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
