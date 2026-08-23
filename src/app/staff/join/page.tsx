"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ShieldCheck,
  User,
  Lock,
  Mail,
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

function StaffJoinContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [email, setEmail] = useState("");
  const [role, setRole] = useState("Staff");
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
          setRole(data.role || "Staff");
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

      router.push("/staff");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Setup failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white font-sans flex flex-col justify-between p-6 sm:p-10 selection:bg-black dark:selection:bg-white selection:text-white dark:selection:text-black transition-colors duration-200">
      {/* Top Header */}
      <header className="max-w-5xl w-full mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-black dark:bg-white text-white dark:text-black flex items-center justify-center font-bold">
            <ShieldCheck className="w-5 h-5 stroke-[2.2]" />
          </div>
          <span className="font-bold text-base text-neutral-900 dark:text-white tracking-tight">
            PermanentLink Staff
          </span>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <a
            href="/"
            className="text-xs text-neutral-500 hover:text-black dark:text-neutral-400 dark:hover:text-white transition"
          >
            ← Return to App
          </a>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-md w-full mx-auto my-auto p-8 sm:p-10 rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xl space-y-6">
        {loading ? (
          <div className="text-center py-12 text-neutral-500 dark:text-neutral-400 text-xs font-medium">
            Verifying invitation...
          </div>
        ) : error && !email ? (
          <div className="text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-neutral-900 dark:text-white">Invalid Invitation</h2>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 max-w-xs mx-auto leading-relaxed">
              {error}
            </p>
            <a
              href="/staff/login"
              className="inline-block px-5 py-2.5 bg-black dark:bg-white text-white dark:text-black text-xs font-semibold rounded-xl hover:bg-neutral-800 dark:hover:bg-neutral-200 transition"
            >
              Go to Staff Login
            </a>
          </div>
        ) : (
          <>
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-black dark:bg-white text-white dark:text-black flex items-center justify-center mx-auto shadow-md">
                <User className="w-6 h-6" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
                Set Up Your Account
              </h1>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Joining as <span className="text-neutral-900 dark:text-white font-semibold">{role}</span>
              </p>
            </div>

            {error && (
              <div className="p-3.5 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* 1. Work Email (Fixed / Read-only) */}
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Work Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 dark:text-neutral-500" />
                  <input
                    type="email"
                    value={email}
                    readOnly
                    className="w-full pl-10 pr-4 py-2.5 text-xs bg-neutral-100 dark:bg-neutral-950/80 border border-neutral-200 dark:border-neutral-800 rounded-xl text-neutral-600 dark:text-neutral-400 font-mono select-none cursor-not-allowed focus:outline-none"
                  />
                </div>
              </div>

              {/* 2. Full Name */}
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 dark:text-neutral-500" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Alex Vance"
                    autoFocus
                    required
                    className="w-full pl-10 pr-4 py-2.5 text-xs bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-xl text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:border-black dark:focus:border-white transition"
                  />
                </div>
              </div>

              {/* 3. Choose Username */}
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Username
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-mono text-neutral-400 dark:text-neutral-500">@</span>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="alex"
                    required
                    className="w-full pl-8 pr-4 py-2.5 text-xs bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-xl text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:border-black dark:focus:border-white transition font-mono"
                  />
                </div>
              </div>

              {/* 4. Create Password */}
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 dark:text-neutral-500" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full pl-10 pr-10 py-2.5 text-xs bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-xl text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:border-black dark:focus:border-white transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:text-neutral-500 dark:hover:text-neutral-300 transition p-0.5 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-black dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-200 text-white dark:text-black rounded-xl text-xs font-semibold transition disabled:opacity-50 shadow-sm flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                {submitting ? (
                  "Setting up..."
                ) : (
                  <>
                    <span>Complete Setup & Join</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </>
        )}
      </div>

      {/* Footer */}
      <footer className="text-center text-xs text-neutral-400 dark:text-neutral-500">
        PermanentLink Staff Portal
      </footer>
    </main>
  );
}

export default function StaffJoinPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white flex items-center justify-center text-xs">Loading...</div>}>
      <StaffJoinContent />
    </Suspense>
  );
}
