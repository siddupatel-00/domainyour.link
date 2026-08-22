"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Link2,
  Lock,
  ArrowRight,
  Globe,
  RefreshCw,
  AlertCircle,
  X,
  CheckCircle2,
  Zap,
  ShieldCheck,
} from "lucide-react";

export default function HomePage() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalType, setModalType] = useState<"features" | "howItWorks" | "about" | null>(null);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
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

  const scrollToSignIn = () => {
    const input = document.getElementById("password-input");
    input?.focus();
  };

  return (
    <div className="min-h-screen bg-white text-neutral-900 flex flex-col justify-between p-6 sm:p-10 lg:p-12 font-sans selection:bg-black selection:text-white">
      {/* Header */}
      <header className="max-w-7xl w-full mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Link2 className="w-6 h-6 text-black stroke-[2.2]" />
          <span className="font-bold text-lg text-black tracking-tight">
            PermanentLink
          </span>
        </div>

        <nav className="flex items-center gap-6 sm:gap-8 text-xs sm:text-sm font-medium text-neutral-600">
          <button
            onClick={() => setModalType("features")}
            className="hover:text-black transition"
          >
            Features
          </button>
          <button
            onClick={() => setModalType("howItWorks")}
            className="hover:text-black transition"
          >
            How it works
          </button>
          <button
            onClick={() => setModalType("about")}
            className="hover:text-black transition"
          >
            About
          </button>
          <button
            onClick={scrollToSignIn}
            className="px-4 py-1.5 border border-neutral-300 rounded-lg text-xs font-semibold text-black hover:border-black transition"
          >
            Sign in
          </button>
        </nav>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl w-full mx-auto my-auto py-8 sm:py-12 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
        {/* Left Column */}
        <div className="lg:col-span-7 flex flex-col space-y-6">
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-neutral-900 leading-[1.08]">
            One link.<br />Always yours.
          </h1>

          <p className="text-base sm:text-lg text-neutral-600 max-w-xl leading-relaxed">
            Create a single, permanent link for your profiles and websites. Update the destination anytime, your link never changes.
          </p>

          {/* Diagram Card */}
          <div className="max-w-xl rounded-2xl border border-neutral-200/90 bg-white p-6 sm:p-8 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              {/* Source Box */}
              <div className="flex-1 text-center">
                <div className="w-12 h-12 mx-auto rounded-xl border border-neutral-200 flex items-center justify-center text-neutral-800 mb-3 bg-neutral-50/50">
                  <Link2 className="w-5 h-5 stroke-[2]" />
                </div>
                <div className="font-semibold text-xs sm:text-sm text-neutral-900 font-mono truncate">
                  yourlink.com/alex/linkedin
                </div>
                <div className="text-[11px] sm:text-xs text-neutral-400 mt-0.5">
                  Share this link
                </div>
              </div>

              {/* Arrow */}
              <div className="flex-shrink-0 text-neutral-700 px-2">
                <ArrowRight className="w-6 h-6 stroke-[1.8]" />
              </div>

              {/* Destination Box */}
              <div className="flex-1 text-center">
                <div className="w-12 h-12 mx-auto rounded-xl border border-neutral-200 flex items-center justify-center text-neutral-800 mb-3 bg-neutral-50/50">
                  <Globe className="w-5 h-5 stroke-[2]" />
                </div>
                <div className="font-semibold text-xs sm:text-sm text-neutral-900 font-mono truncate">
                  linkedin.com/in/alex
                </div>
                <div className="text-[11px] sm:text-xs text-neutral-400 mt-0.5">
                  Goes here
                </div>
              </div>
            </div>
          </div>

          {/* Bottom helper note */}
          <div className="flex items-center gap-2 text-xs sm:text-sm text-neutral-600">
            <RefreshCw className="w-4 h-4 text-neutral-500 flex-shrink-0" />
            <span>Change the destination anytime. Your link stays the same.</span>
          </div>
        </div>

        {/* Right Column: Sign In Card */}
        <div className="lg:col-span-5 flex justify-center lg:justify-end w-full">
          <div className="w-full max-w-md rounded-3xl border border-neutral-200 bg-white p-8 sm:p-10 shadow-sm">
            <h2 className="text-2xl sm:text-3xl font-bold text-center text-neutral-900 tracking-tight">
              Welcome back
            </h2>
            <p className="text-xs sm:text-sm text-neutral-500 text-center mt-1.5 mb-8">
              Sign in to manage your links
            </p>

            {error && (
              <div className="mb-5 p-3 rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-800 text-xs flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 text-neutral-700 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-800 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                  <input
                    id="password-input"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-neutral-300 rounded-xl text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-black hover:bg-neutral-800 text-white rounded-xl text-sm font-semibold transition disabled:opacity-50 shadow-sm"
              >
                {loading ? "Signing in..." : "Sign in"}
              </button>
            </form>

            <div className="my-5 flex items-center justify-center gap-3">
              <div className="h-px bg-neutral-200 flex-1" />
              <span className="text-xs text-neutral-400">or</span>
              <div className="h-px bg-neutral-200 flex-1" />
            </div>

            <button
              onClick={() => setModalType("howItWorks")}
              type="button"
              className="w-full py-3 bg-white hover:bg-neutral-50 border border-neutral-200 text-neutral-900 rounded-xl text-sm font-semibold transition"
            >
              View how it works
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-7xl w-full mx-auto flex flex-col sm:flex-row items-center justify-between text-xs text-neutral-400 pt-6 border-t border-neutral-100">
        <div>© 2026 PermanentLink. All rights reserved.</div>
        <div className="mt-2 sm:mt-0">Simple links. Permanent forever.</div>
      </footer>

      {/* Information Modal (Features, How it works, About) */}
      {modalType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg rounded-3xl bg-white border border-neutral-200 p-7 sm:p-8 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
              <h3 className="text-lg font-bold text-neutral-900">
                {modalType === "features" && "PermanentLink Features"}
                {modalType === "howItWorks" && "How PermanentLink Works"}
                {modalType === "about" && "About PermanentLink"}
              </h3>
              <button
                onClick={() => setModalType(null)}
                className="p-1 rounded-lg text-neutral-400 hover:text-black hover:bg-neutral-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-5 space-y-4 text-sm text-neutral-600 leading-relaxed">
              {modalType === "howItWorks" && (
                <>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-black text-white text-xs flex items-center justify-center font-bold flex-shrink-0 mt-0.5">
                      1
                    </div>
                    <div>
                      <strong className="text-neutral-900">Create your link:</strong> Set a permanent username and slug (e.g. <code className="text-xs bg-neutral-100 px-1 py-0.5 rounded font-mono">domain.com/siddu/linkedin</code>).
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-black text-white text-xs flex items-center justify-center font-bold flex-shrink-0 mt-0.5">
                      2
                    </div>
                    <div>
                      <strong className="text-neutral-900">Share it anywhere:</strong> Put it on your resume, GitHub profile, NFC card, or email signature.
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-black text-white text-xs flex items-center justify-center font-bold flex-shrink-0 mt-0.5">
                      3
                    </div>
                    <div>
                      <strong className="text-neutral-900">Update destination anytime:</strong> If your LinkedIn handle changes, change the destination in your dashboard. Your public link stays unchanged.
                    </div>
                  </div>
                </>
              )}

              {modalType === "features" && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-neutral-900 font-medium">
                    <Zap className="w-4 h-4 text-black" />
                    <span>Instant Server-Side HTTP 307 Redirects</span>
                  </div>
                  <p className="text-xs text-neutral-500">
                    Single indexed database query. No client-side scripts, zero intermediate loading page.
                  </p>
                  <div className="flex items-center gap-2 text-neutral-900 font-medium pt-2">
                    <ShieldCheck className="w-4 h-4 text-black" />
                    <span>Secure Password Protected Dashboard</span>
                  </div>
                  <p className="text-xs text-neutral-500">
                    Manage and update destinations securely with signed HTTP-only cookies.
                  </p>
                </div>
              )}

              {modalType === "about" && (
                <p>
                  PermanentLink is built with Next.js, PostgreSQL (Neon / Vercel Postgres), and Drizzle ORM to give individuals and teams clean, permanent URLs that never break.
                </p>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-neutral-100 flex justify-end">
              <button
                onClick={() => setModalType(null)}
                className="px-4 py-2 bg-black hover:bg-neutral-800 text-white rounded-xl text-xs font-semibold transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
