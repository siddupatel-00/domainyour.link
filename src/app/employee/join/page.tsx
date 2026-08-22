"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ShieldCheck,
  User,
  Lock,
  ArrowRight,
  AlertCircle,
  Sparkles,
  Eye,
  EyeOff,
  CheckCircle2,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

function EmployeeJoinContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [email, setEmail] = useState("");
  const [role, setRole] = useState("Insights Viewer");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();

  useEffect(() => {
    async function validateToken() {
      if (!token) {
        setError("Missing invitation token. Please check the link from your email.");
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`/api/employee/join?token=${encodeURIComponent(token)}`);
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Invalid or expired invitation link.");
        } else {
          setEmail(data.email);
          setRole(data.role || "Insights Viewer");
        }
      } catch {
        setError("Failed to validate invitation link.");
      } finally {
        setLoading(false);
      }
    }

    validateToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !username.trim() || !password) {
      setError("Please fill in your full name, username, and password");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/employee/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          name: name.trim(),
          username: username.trim(),
          password,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to complete setup");
      }

      router.push("/employee");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Setup failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-neutral-950 text-white font-sans flex flex-col justify-between p-6 sm:p-10 selection:bg-white selection:text-black">
      {/* Top Header */}
      <header className="max-w-5xl w-full mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-white text-black flex items-center justify-center font-bold">
            <ShieldCheck className="w-5 h-5 stroke-[2.2]" />
          </div>
          <span className="font-bold text-base text-white tracking-tight">
            PermanentLink Staff
          </span>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <a
            href="/"
            className="text-xs text-neutral-400 hover:text-white transition"
          >
            ← Return to App
          </a>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-md w-full mx-auto my-auto p-8 sm:p-10 rounded-3xl border border-neutral-800 bg-neutral-900 shadow-2xl space-y-6">
        {loading ? (
          <div className="text-center py-12 text-neutral-400 text-xs font-medium">
            Verifying invitation...
          </div>
        ) : error && !email ? (
          <div className="text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-950/40 border border-red-900/50 text-red-400 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-white">Invalid Invitation</h2>
            <p className="text-xs text-neutral-400 max-w-xs mx-auto leading-relaxed">
              {error}
            </p>
            <a
              href="/employee/login"
              className="inline-block px-5 py-2.5 bg-white text-black text-xs font-semibold rounded-xl hover:bg-neutral-200 transition"
            >
              Go to Employee Login
            </a>
          </div>
        ) : (
          <>
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-white text-black flex items-center justify-center mx-auto shadow-md">
                <Sparkles className="w-6 h-6" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-white">
                Welcome to the Team!
              </h1>
              <p className="text-xs text-neutral-400">
                You were invited to join as <strong className="text-white">{role}</strong> for <strong className="text-white">{email}</strong>
              </p>
            </div>

            {error && (
              <div className="p-3.5 rounded-xl border border-red-900/50 bg-red-950/40 text-red-300 text-xs flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Alex Vance"
                    autoFocus
                    required
                    className="w-full pl-10 pr-4 py-2.5 text-xs bg-neutral-950 border border-neutral-800 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:border-white transition font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  Choose Username
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-mono text-neutral-500">@</span>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="alex"
                    required
                    className="w-full pl-8 pr-4 py-2.5 text-xs bg-neutral-950 border border-neutral-800 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:border-white transition font-mono font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  Create Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full pl-10 pr-10 py-2.5 text-xs bg-neutral-950 border border-neutral-800 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:border-white transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 transition p-0.5 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-white hover:bg-neutral-200 text-black rounded-xl text-xs font-semibold transition disabled:opacity-50 shadow-sm flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                {submitting ? (
                  "Setting up your workspace..."
                ) : (
                  <>
                    <span>Complete Setup & Join Workspace</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </>
        )}
      </div>

      {/* Footer */}
      <footer className="text-center text-xs text-neutral-500">
        PermanentLink Staff Onboarding
      </footer>
    </main>
  );
}

export default function EmployeeJoinPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center text-xs">Loading...</div>}>
      <EmployeeJoinContent />
    </Suspense>
  );
}
