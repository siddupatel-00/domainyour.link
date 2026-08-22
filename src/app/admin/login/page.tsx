"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, ArrowRight, AlertCircle, Link2, KeyRound, X, Mail } from "lucide-react";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Invalid password");
      }

      router.push("/admin");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-white text-neutral-900 font-sans selection:bg-black selection:text-white">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <a href="/" className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-neutral-100 border border-neutral-200 text-black mb-4 shadow-sm hover:scale-105 transition">
            <Link2 className="w-6 h-6 stroke-[2.2]" />
          </a>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
            Welcome back
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 mt-1">
            Sign in to manage your permanent links
          </p>
        </div>

        <div className="bg-white border border-neutral-200 rounded-3xl p-8 sm:p-10 shadow-sm">
          {error && (
            <div className="mb-5 p-3.5 rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-800 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-neutral-700 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-800 mb-1.5">
                Gmail / Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email (e.g. you@gmail.com)"
                  required
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-neutral-300 rounded-xl text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-neutral-800">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(true)}
                  className="text-xs text-neutral-500 hover:text-black font-medium transition"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  autoFocus
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-neutral-300 rounded-xl text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-black hover:bg-neutral-800 text-white rounded-xl text-sm font-semibold transition disabled:opacity-50 shadow-sm flex items-center justify-center gap-2"
            >
              {loading ? (
                "Signing in..."
              ) : (
                <>
                  <span>Sign in</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-neutral-100 text-center">
            <a
              href="/"
              className="text-xs text-neutral-500 hover:text-black transition"
            >
              ← Back to Home
            </a>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg rounded-3xl bg-white border border-neutral-200 p-7 sm:p-8 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
              <h3 className="text-lg font-bold text-neutral-900 flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-neutral-900" />
                <span>Reset Password</span>
              </h3>
              <button
                onClick={() => setShowForgotModal(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-black hover:bg-neutral-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-5 space-y-4 text-sm text-neutral-600 leading-relaxed">
              <p>
                To reset or update your admin password, update your environment configuration:
              </p>
              <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200 font-mono text-xs text-neutral-900 space-y-2">
                <div>
                  <strong className="block text-[11px] text-neutral-500 uppercase tracking-wider">Local Development:</strong>
                  Update <code className="bg-white border px-1.5 py-0.5 rounded text-black">ADMIN_PASSWORD</code> in your <code className="bg-white border px-1.5 py-0.5 rounded text-black">.env.local</code> file.
                </div>
                <div>
                  <strong className="block text-[11px] text-neutral-500 uppercase tracking-wider">Vercel Deployment:</strong>
                  Go to <strong>Project Settings → Environment Variables</strong> and update <code className="bg-white border px-1.5 py-0.5 rounded text-black">ADMIN_PASSWORD</code>.
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-neutral-100 flex justify-end">
              <button
                onClick={() => setShowForgotModal(false)}
                className="px-4 py-2 bg-black hover:bg-neutral-800 text-white rounded-xl text-xs font-semibold transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
