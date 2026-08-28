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
  CheckCircle2,
  XCircle,
  Loader2,
  KeyRound,
  Check,
} from "lucide-react";
import { sanitizeSlug } from "@/lib/utils";
import { ThemeToggle } from "@/components/ThemeToggle";

function EmployeeJoinContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [step, setStep] = useState<"input" | "verify" | "password">("input");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("Insights Viewer");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken" | "reserved" | "invalid">("idle");
  const [usernameMessage, setUsernameMessage] = useState<string>("");
  const [code, setCode] = useState("");
  const [challengeToken, setChallengeToken] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();
  const cleanUsername = sanitizeSlug(username);

  // Validate token on mount
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

  // Real-time live username availability check
  useEffect(() => {
    if (!username.trim()) {
      setUsernameStatus("idle");
      setUsernameMessage("");
      return;
    }

    const clean = sanitizeSlug(username);
    if (clean.length < 3) {
      setUsernameStatus("invalid");
      setUsernameMessage("Username must be at least 3 characters");
      return;
    }

    setUsernameStatus("checking");
    setUsernameMessage("Checking availability...");

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/auth/check-username?username=${encodeURIComponent(clean)}`);
        const data = await res.json();
        if (data.available) {
          setUsernameStatus("available");
          setUsernameMessage(`@${clean} is available!`);
        } else {
          if (data.reason === "reserved") {
            setUsernameStatus("reserved");
            setUsernameMessage(data.message || `"${clean}" is a reserved name`);
          } else if (data.reason === "length") {
            setUsernameStatus("invalid");
            setUsernameMessage(data.message || "Username must be at least 3 characters");
          } else {
            setUsernameStatus("taken");
            setUsernameMessage(data.message || `@${clean} is already taken`);
          }
        }
      } catch {
        setUsernameStatus("idle");
        setUsernameMessage("");
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [username]);

  // Step 1 Submit: Send OTP to work email
  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Please enter your full name");
      return;
    }

    if (!cleanUsername) {
      setError("Please choose a username");
      return;
    }

    if (usernameStatus === "taken" || usernameStatus === "reserved" || usernameStatus === "invalid") {
      setError(usernameMessage || "Please choose an available username");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/employee/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send_code",
          token,
          name: name.trim(),
          username: cleanUsername,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to send verification code");
      }

      if (data.challengeToken) {
        setChallengeToken(data.challengeToken);
      }
      if (data.devCode) {
        setCode(data.devCode);
      }

      setStep("verify");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to send code");
    } finally {
      setSubmitting(false);
    }
  };

  // Step 2 Submit: Verify 6-digit code
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!code.trim() || code.length < 6) {
      setError("Please enter the 6-digit code");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/employee/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "verify_code",
          token,
          code: code.trim(),
          challengeToken,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Incorrect verification code. Please check and try again.");
      }

      setStep("password");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setSubmitting(false);
    }
  };

  // Step 3 Submit: Set password and enter workspace
  const handleCompleteSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!password || password.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/employee/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "complete_setup",
          token,
          name: name.trim(),
          username: cleanUsername,
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
    <main className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white font-sans flex flex-col justify-between p-6 sm:p-10 selection:bg-black dark:selection:bg-white selection:text-white dark:selection:text-black transition-colors duration-200">
      {/* Top Header */}
      <header className="max-w-5xl w-full mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-black dark:bg-white text-white dark:text-black flex items-center justify-center font-bold">
            <ShieldCheck className="w-5 h-5 stroke-[2.2]" />
          </div>
          <span className="font-bold text-base text-neutral-900 dark:text-white tracking-tight">
            domainyourlink Staff
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
            <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-neutral-900 dark:text-white">Invalid Invitation</h2>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 max-w-xs mx-auto leading-relaxed">
              {error}
            </p>
            <a
              href="/employee/login"
              className="inline-block px-5 py-2.5 bg-black dark:bg-white text-white dark:text-black text-xs font-semibold rounded-xl hover:bg-neutral-800 dark:hover:bg-neutral-200 transition"
            >
              Go to Employee Login
            </a>
          </div>
        ) : (
          <>
            {/* ============================================================== */}
            {/* STEP 1: Enter Full Name and Username */}
            {/* ============================================================== */}
            {step === "input" && (
              <>
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-black dark:bg-white text-white dark:text-black flex items-center justify-center mx-auto shadow-sm">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
                    Join the Team
                  </h1>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Invited as <strong className="text-neutral-900 dark:text-white">{role}</strong>
                  </p>
                </div>

                {error && (
                  <div className="p-3.5 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2.5">
                    <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <form onSubmit={handleSendCode} className="space-y-4">
                  {/* Email (Read Only) */}
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                      Invited Work Email
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 dark:text-neutral-500" />
                      <input
                        type="email"
                        value={email}
                        readOnly
                        disabled
                        className="w-full pl-10 pr-4 py-2.5 text-xs bg-neutral-100 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-600 dark:text-neutral-300 cursor-not-allowed"
                      />
                    </div>
                  </div>

                  {/* Full Name */}
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
                        placeholder="Alex Vance"
                        autoFocus
                        required
                        className="w-full pl-10 pr-4 py-2.5 text-xs bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-xl text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:border-black dark:focus:border-white transition"
                      />
                    </div>
                  </div>

                  {/* Username with Live Check */}
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                      Username
                    </label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 dark:text-neutral-500" />
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Choose username (e.g. alex)"
                        required
                        className={`w-full pl-10 pr-10 py-2.5 text-xs bg-white dark:bg-neutral-950 border rounded-xl text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none transition ${
                          usernameStatus === "available"
                            ? "border-emerald-500/80 dark:border-emerald-500/80 focus:ring-1 focus:ring-emerald-500"
                            : usernameStatus === "taken" || usernameStatus === "reserved" || usernameStatus === "invalid"
                            ? "border-rose-500/80 dark:border-rose-500/80 focus:ring-1 focus:ring-rose-500"
                            : "border-neutral-300 dark:border-neutral-800 focus:border-black dark:focus:border-white"
                        }`}
                      />
                      <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center">
                        {usernameStatus === "checking" && (
                          <Loader2 className="w-4 h-4 text-neutral-400 animate-spin" />
                        )}
                        {usernameStatus === "available" && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        )}
                        {(usernameStatus === "taken" || usernameStatus === "reserved" || usernameStatus === "invalid") && (
                          <XCircle className="w-4 h-4 text-rose-500" />
                        )}
                      </div>
                    </div>

                    {/* Feedback message */}
                    {usernameStatus === "available" && (
                      <div className="mt-1.5 p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 flex items-center gap-1.5 text-[11px] text-emerald-700 dark:text-emerald-300 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                        <span>{usernameMessage}</span>
                      </div>
                    )}

                    {(usernameStatus === "taken" || usernameStatus === "reserved" || usernameStatus === "invalid") && (
                      <div className="mt-1.5 p-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-center gap-1.5 text-[11px] text-rose-700 dark:text-rose-300 font-medium">
                        <AlertCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 flex-shrink-0" />
                        <span>{usernameMessage}</span>
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={submitting || (usernameStatus === "taken" || usernameStatus === "reserved" || usernameStatus === "invalid" || usernameStatus === "checking")}
                    className="w-full py-3 bg-black dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-200 text-white dark:text-black rounded-xl text-xs font-semibold transition disabled:opacity-50 shadow-sm flex items-center justify-center gap-2 cursor-pointer mt-2"
                  >
                    {submitting ? (
                      "Sending 6-Digit Code..."
                    ) : (
                      <>
                        <span>Send 6-Digit Code</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              </>
            )}

            {/* ============================================================== */}
            {/* STEP 2: Enter 6-Digit OTP Code */}
            {/* ============================================================== */}
            {step === "verify" && (
              <>
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-black dark:text-white flex items-center justify-center mx-auto shadow-sm">
                    <KeyRound className="w-6 h-6 stroke-[2]" />
                  </div>
                  <h2 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
                    Check your email
                  </h2>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    We sent a 6-digit code to <strong className="text-neutral-900 dark:text-white">{email}</strong>
                  </p>
                </div>

                {error && (
                  <div className="p-3.5 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2.5">
                    <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <form onSubmit={handleVerifyCode} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5 text-center">
                      Enter 6-Digit Code
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ""))}
                      placeholder="••••••"
                      autoFocus
                      required
                      className="w-full text-center tracking-[10px] text-2xl font-mono py-3 bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-xl text-neutral-900 dark:text-white placeholder-neutral-300 dark:placeholder-neutral-700 focus:outline-none focus:border-black dark:focus:border-white focus:bg-white dark:focus:bg-neutral-950 focus:ring-1 focus:ring-black dark:focus:ring-white transition"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting || code.length < 6}
                    className="w-full py-3 bg-black dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-200 text-white dark:text-black rounded-xl text-xs font-semibold transition disabled:opacity-50 shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {submitting ? (
                      "Verifying..."
                    ) : (
                      <>
                        <span>Continue</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>

                <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                  <button
                    type="button"
                    onClick={() => {
                      setStep("input");
                      setError(null);
                    }}
                    className="hover:text-black dark:hover:text-white transition underline underline-offset-2 cursor-pointer"
                  >
                    ← Change details
                  </button>
                  <button
                    type="button"
                    onClick={handleSendCode}
                    disabled={submitting}
                    className="hover:text-black dark:hover:text-white transition underline underline-offset-2 cursor-pointer"
                  >
                    Resend code
                  </button>
                </div>
              </>
            )}

            {/* ============================================================== */}
            {/* STEP 3: Set Password */}
            {/* ============================================================== */}
            {step === "password" && (
              <>
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-black dark:text-white flex items-center justify-center mx-auto shadow-sm">
                    <Lock className="w-6 h-6 stroke-[2]" />
                  </div>
                  <h2 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
                    Set your password
                  </h2>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Choose a password to secure your staff account
                  </p>
                </div>

                {/* Account Summary */}
                <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-500 dark:text-neutral-400">Full Name</span>
                    <span className="font-medium text-neutral-900 dark:text-white">{name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-500 dark:text-neutral-400">Username</span>
                    <span className="font-semibold text-neutral-900 dark:text-white font-mono">@{cleanUsername}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-500 dark:text-neutral-400">Work Email</span>
                    <span className="font-medium text-neutral-900 dark:text-white">{email}</span>
                  </div>
                </div>

                {error && (
                  <div className="p-3.5 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2.5">
                    <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <form onSubmit={handleCompleteSetup} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                      Create Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 dark:text-neutral-500" />
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Choose a password (min 6 chars)"
                        minLength={6}
                        autoFocus
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
                    disabled={submitting || password.length < 6}
                    className="w-full py-3 bg-black dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-200 text-white dark:text-black rounded-xl text-xs font-semibold transition disabled:opacity-50 shadow-sm flex items-center justify-center gap-2 cursor-pointer mt-2"
                  >
                    {submitting ? (
                      "Activating Account..."
                    ) : (
                      <>
                        <span>Complete Setup & Enter Workspace</span>
                        <Check className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>

                <div className="text-center text-xs text-neutral-500 dark:text-neutral-400 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                  <button
                    type="button"
                    onClick={() => {
                      setStep("verify");
                      setError(null);
                    }}
                    className="hover:text-black dark:hover:text-white transition underline underline-offset-2 cursor-pointer"
                  >
                    ← Back to verification code
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <footer className="text-center text-xs text-neutral-400 dark:text-neutral-500">
        domainyourlink Staff Onboarding
      </footer>
    </main>
  );
}

export default function EmployeeJoinPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center p-6 text-neutral-500 dark:text-neutral-400 text-xs">
          Loading invitation...
        </main>
      }
    >
      <EmployeeJoinContent />
    </Suspense>
  );
}
