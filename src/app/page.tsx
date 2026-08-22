"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Lock,
  ArrowRight,
  Sparkles,
  AlertCircle,
  CornerDownRight,
  Zap,
  Shield,
  Infinity,
} from "lucide-react";

export default function HomePage() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
        throw new Error(data.error || "Invalid credentials");
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
    <main className="h-screen w-screen overflow-hidden bg-black text-white flex flex-col justify-between p-6 sm:p-12 lg:p-16 select-none font-sans">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-bold text-base tracking-tight text-white">PermanentLink</span>
          <span className="text-xs text-neutral-500 font-mono">— 2026</span>
        </div>
      </div>

      {/* Main 2-Column Section (No scroll, perfectly fitted) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-center my-auto max-w-7xl w-full mx-auto">
        {/* Left Column: Headline, Description & Feature Metrics */}
        <div className="lg:col-span-7 flex flex-col justify-center space-y-6">
          <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-widest font-mono text-neutral-400">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            <span>DYNAMIC REDIRECTION, CRAFTED</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-[1.1]">
            Frustrated changing links in every file & app? <br />
            <span className="text-neutral-400 font-normal">This is for you. Make it yours.</span>
          </h1>

          <p className="text-xs sm:text-sm text-neutral-400 max-w-xl leading-relaxed">
            Create permanent URLs once. When your usernames, social profiles, or websites change, update the destination in one place. Your public links stay forever unchanged.
          </p>

          {/* Example Box */}
          <div className="p-3.5 rounded-xl border border-neutral-800 bg-neutral-950 max-w-lg font-mono text-xs shadow-xl">
            <div className="flex items-center justify-between text-neutral-500 text-[10px] uppercase tracking-wider mb-2 border-b border-neutral-900 pb-1.5">
              <span>Permanent Public Link</span>
              <span>Dynamic Destination</span>
            </div>
            <div className="flex items-center justify-between text-xs py-1">
              <span className="text-white font-medium">/siddu/linkedin</span>
              <div className="flex items-center gap-1.5 text-neutral-400 truncate max-w-[240px]">
                <CornerDownRight className="w-3.5 h-3.5 text-neutral-600 flex-shrink-0" />
                <span className="truncate text-neutral-300">linkedin.com/in/siddu</span>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs py-1 text-neutral-500">
              <span>/siddu/github</span>
              <div className="flex items-center gap-1.5 truncate max-w-[240px]">
                <CornerDownRight className="w-3.5 h-3.5 text-neutral-700 flex-shrink-0" />
                <span className="truncate text-neutral-400">github.com/currentuser</span>
              </div>
            </div>
          </div>

          {/* Stat Badges Box */}
          <div className="inline-flex items-center gap-6 p-4 rounded-xl border border-neutral-800 bg-neutral-950 max-w-lg">
            <div className="pr-6 border-r border-neutral-800">
              <div className="text-base sm:text-lg font-bold font-mono text-white">HTTP 307</div>
              <div className="text-[10px] text-neutral-500 font-mono">instant redirect</div>
            </div>
            <div className="pr-6 border-r border-neutral-800">
              <div className="text-base sm:text-lg font-bold font-mono text-white">&lt;10ms</div>
              <div className="text-[10px] text-neutral-500 font-mono">indexed lookup</div>
            </div>
            <div>
              <div className="text-base sm:text-lg font-bold font-mono text-white flex items-center gap-1">
                <span>∞</span> Permanent
              </div>
              <div className="text-[10px] text-neutral-500 font-mono">never broken</div>
            </div>
          </div>
        </div>

        {/* Right Column: Centered Sign In Card */}
        <div className="lg:col-span-5 flex justify-center lg:justify-end w-full">
          <div className="w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-950/90 p-7 sm:p-8 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest text-neutral-400 mb-3">
              <Sparkles className="w-3.5 h-3.5 text-white" />
              <span>ADMIN ACCESS</span>
            </div>

            <h2 className="text-2xl font-bold text-white tracking-tight">Sign in</h2>
            <p className="text-xs text-neutral-400 mt-1 mb-6">
              Enter your credentials to manage your permanent links.
            </p>

            {error && (
              <div className="mb-4 p-3 rounded-lg border border-neutral-800 bg-neutral-900 text-white text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-neutral-400" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-neutral-400 mb-1.5">
                  PASSWORD
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    autoFocus
                    className="w-full pl-10 pr-4 py-2.5 text-xs bg-black border border-neutral-800 rounded-xl text-white placeholder-neutral-600 focus:outline-none focus:border-white transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-white hover:bg-neutral-200 text-black rounded-xl text-xs font-semibold transition duration-150 disabled:opacity-50"
              >
                {loading ? (
                  "Authenticating..."
                ) : (
                  <>
                    <span>Sign in</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 pt-4 border-t border-neutral-900 text-center">
              <p className="text-[11px] text-neutral-500 leading-relaxed font-mono">
                Protected by signed HTTP-only cookies · Powered by Neon PostgreSQL
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Footer */}
      <div className="border-t border-neutral-900 pt-4 flex flex-col sm:flex-row items-center justify-between text-[11px] text-neutral-500 font-mono">
        <div>⚡ Powered by Next.js & PostgreSQL · Instant Server-Side 307</div>
        <div className="mt-1 sm:mt-0">Zero intermediate webpage · Minimum latency</div>
      </div>
    </main>
  );
}
