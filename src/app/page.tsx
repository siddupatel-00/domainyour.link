"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Link2,
  Lock,
  Mail,
  User,
  ArrowRight,
  Globe,
  RefreshCw,
  AlertCircle,
  X,
  Zap,
  ShieldCheck,
  AlertTriangle,
  KeyRound,
  CheckCircle2,
  XCircle,
  Loader2,
  Eye,
  EyeOff,
  Sparkles,
  Check,
} from "lucide-react";
import { sanitizeSlug } from "@/lib/utils";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function HomePage() {
  const [isSignUp, setIsSignUp] = useState(true);
  const [authMethod, setAuthMethod] = useState<"code" | "password">("code");
  const [step, setStep] = useState<"input" | "verify" | "password">("input");
  const [username, setUsername] = useState("");
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken" | "reserved" | "invalid">("idle");
  const [usernameMessage, setUsernameMessage] = useState<string>("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isUsernameFocused, setIsUsernameFocused] = useState(false);
  const [modalType, setModalType] = useState<"features" | "howItWorks" | "about" | "forgotPassword" | null>(null);
  const router = useRouter();

  const cleanUsername = sanitizeSlug(username);

  // Close modal on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setModalType(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Real-time live username availability check
  useEffect(() => {
    if (!isSignUp || !username.trim()) {
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
  }, [username, isSignUp]);

  // Step 1: Send verification code to email or direct password login
  const handlePrimarySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);

    if (isSignUp) {
      if (!cleanUsername) {
        setError("Please enter a username");
        return;
      }
      if (usernameStatus === "checking") {
        setError("Please wait while we check username availability");
        return;
      }
      if (usernameStatus === "taken") {
        setError(`@${cleanUsername} is already taken. Please choose another.`);
        return;
      }
      if (usernameStatus === "reserved") {
        setError(`"${cleanUsername}" is reserved. Please choose another.`);
        return;
      }
      if (usernameStatus === "invalid" || cleanUsername.length < 3) {
        setError("Username must be at least 3 characters");
        return;
      }
    }

    if (!email.trim() || !email.includes("@")) {
      setError("Please enter a valid email address");
      return;
    }

    // Direct password sign in (only available in Sign In mode)
    if (!isSignUp && authMethod === "password") {
      if (!password) {
        setError("Please enter your password");
        return;
      }
      setLoading(true);
      try {
        const res = await fetch("/api/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "password_login",
            email: email.trim(),
            password,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Incorrect email or password");
        router.push("/admin");
        router.refresh();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to sign in");
      } finally {
        setLoading(false);
      }
      return;
    }

    // Send 6-digit email code
    setLoading(true);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send_code",
          email: email.trim(),
          username: isSignUp ? cleanUsername : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Could not send verification code");
      }

      setStep("verify");
      setInfoMessage(`We sent a 6-digit code to ${email.trim()}`);
      if (data.devCode) {
        setCode(data.devCode);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not send code");
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify 6-digit code
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!code.trim() || code.length < 6) {
      setError("Please enter the 6-digit code");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "verify_code",
          email: email.trim(),
          code: code.trim(),
          username: isSignUp ? cleanUsername : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Incorrect code. Please check and try again.");
      }

      // If user is signing up -> Ask them to set their password next!
      if (isSignUp) {
        setStep("password");
        setInfoMessage("Email verified! Now set a password to secure your account.");
      } else {
        // If user is signing in with code -> Direct login to dashboard!
        router.push("/admin");
        router.refresh();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Set Password & Complete Sign Up
  const handleCompleteSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!password || password.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "complete_signup",
          email: email.trim(),
          username: cleanUsername,
          password: password,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create account");
      }

      router.push("/admin");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create account");
    } finally {
      setLoading(false);
    }
  };

  const toggleAuthMode = (signupMode: boolean) => {
    setError(null);
    setInfoMessage(null);
    setStep("input");
    setCode("");
    setPassword("");
    setUsernameStatus("idle");
    setUsernameMessage("");
    setIsSignUp(signupMode);
    setAuthMethod(signupMode ? "code" : "password");
    setTimeout(() => {
      const input = document.getElementById(signupMode ? "username-input" : "email-input");
      input?.focus();
    }, 50);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 flex flex-col justify-between p-6 sm:p-10 lg:p-12 font-sans selection:bg-black dark:selection:bg-white selection:text-white dark:selection:text-black transition-colors duration-200">
      {/* Header */}
      <header className="max-w-7xl w-full mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Link2 className="w-6 h-6 text-black dark:text-white stroke-[2.2]" />
          <span className="font-bold text-lg text-black dark:text-white tracking-tight">
            domainyourlink
          </span>
        </div>

        <nav className="flex items-center gap-4 sm:gap-6 text-xs sm:text-sm font-medium text-neutral-600 dark:text-neutral-400">
          <button
            onClick={() => setModalType("features")}
            className="hover:text-black dark:hover:text-white transition cursor-pointer"
          >
            Features
          </button>
          <button
            onClick={() => setModalType("howItWorks")}
            className="hover:text-black dark:hover:text-white transition cursor-pointer"
          >
            How it works
          </button>
          <button
            onClick={() => setModalType("about")}
            className="hover:text-black dark:hover:text-white transition cursor-pointer"
          >
            About
          </button>

          <ThemeToggle />

          <button
            onClick={() => toggleAuthMode(!isSignUp)}
            className="px-3.5 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition font-medium cursor-pointer"
          >
            {isSignUp ? "Sign in" : "Sign up"}
          </button>
        </nav>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center my-auto py-10 sm:py-14">
        {/* Left Column: Hero & Interactive Diagram */}
        <div className="lg:col-span-7 space-y-6">
          <div className="space-y-4">
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.08] text-neutral-900 dark:text-white">
              One link.
              <br />
              Always yours.
            </h1>
            <p className="text-base sm:text-lg text-neutral-600 dark:text-neutral-400 max-w-lg leading-relaxed font-normal">
              Create a single permanent link for your profile or website. Change where it points anytime, and your link never breaks.
            </p>
          </div>

          {/* Clean Interactive Visual Box */}
          <div className="p-6 sm:p-7 rounded-3xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800/80 max-w-xl shadow-sm">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              {/* Permanent Link Box */}
              <div className="flex-1 w-full bg-white dark:bg-neutral-950 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 text-center">
                <div className="w-8 h-8 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 flex items-center justify-center mx-auto mb-2">
                  <Link2 className="w-4 h-4" />
                </div>
                <div className="text-xs font-bold text-neutral-900 dark:text-white font-mono break-all">
                  yourlink.com/{cleanUsername || "siddu"}/linkedin
                </div>
                <div className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-1">
                  Share this link
                </div>
              </div>

              <div className="text-neutral-400 dark:text-neutral-600 hidden sm:block">
                <ArrowRight className="w-5 h-5" />
              </div>

              {/* Destination Box */}
              <div className="flex-1 w-full bg-white dark:bg-neutral-950 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 text-center">
                <div className="w-8 h-8 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 flex items-center justify-center mx-auto mb-2">
                  <Globe className="w-4 h-4" />
                </div>
                <div className="text-xs font-bold text-neutral-900 dark:text-white font-mono break-all">
                  linkedin.com/in/{cleanUsername || "siddu"}
                </div>
                <div className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-1">
                  Goes here
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
            <RefreshCw className="w-4 h-4 text-neutral-500 flex-shrink-0" />
            <span>Change where it goes anytime. Your link stays the same.</span>
          </div>
        </div>

        {/* Right Column: Sign Up / Sign In Card */}
        <div className="lg:col-span-5 flex justify-center lg:justify-end w-full">
          <div className="w-full max-w-md rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-7 sm:p-9 shadow-sm">
            
            {/* ============================================================== */}
            {/* STEP 1: Input (Username + Email for Signup, or Email + Pass for Signin) */}
            {/* ============================================================== */}
            {step === "input" && (
              <>
                <h2 className="text-2xl sm:text-3xl font-bold text-center text-neutral-900 dark:text-white tracking-tight">
                  {isSignUp ? "Create your account" : "Welcome back"}
                </h2>
                <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 text-center mt-1 mb-6">
                  {isSignUp
                    ? "Get your permanent link in seconds"
                    : "Sign in to manage your links"}
                </p>

                {error && (
                  <div className="mb-4 p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/60 text-neutral-800 dark:text-neutral-200 text-xs flex items-center gap-2.5">
                    <AlertCircle className="w-4 h-4 text-neutral-700 dark:text-neutral-300 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <form onSubmit={handlePrimarySubmit} className="space-y-3.5">
                  {/* 1. Username with Live Availability Checking (Sign Up only) */}
                  {isSignUp && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                          Username
                        </label>
                        <span className="text-[10px] text-neutral-500 dark:text-neutral-400 flex items-center gap-1">
                          <Lock className="w-2.5 h-2.5" /> Unique & Permanent
                        </span>
                      </div>
                      <div className="relative">
                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                        <input
                          id="username-input"
                          type="text"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          onFocus={() => setIsUsernameFocused(true)}
                          onBlur={() => setIsUsernameFocused(false)}
                          placeholder="Choose a username (e.g. siddu)"
                          required={isSignUp}
                          className={`w-full pl-10 pr-10 py-2.5 text-sm bg-white dark:bg-neutral-950 border rounded-xl text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-600 focus:outline-none transition ${
                            usernameStatus === "available"
                              ? "border-emerald-500/80 dark:border-emerald-500/80 focus:ring-1 focus:ring-emerald-500"
                              : usernameStatus === "taken" || usernameStatus === "reserved" || usernameStatus === "invalid"
                              ? "border-rose-500/80 dark:border-rose-500/80 focus:ring-1 focus:ring-rose-500"
                              : isUsernameFocused || username
                              ? "border-black dark:border-white ring-1 ring-black dark:ring-white"
                              : "border-neutral-300 dark:border-neutral-800"
                          }`}
                        />

                        {/* Live Availability Status Icon */}
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

                      {/* Live Feedback / Warning Banner */}
                      {usernameStatus === "available" && (
                        <div className="mt-1.5 p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 flex items-center gap-1.5 text-[11px] text-emerald-700 dark:text-emerald-300 font-medium animate-in fade-in duration-150">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                          <span>{usernameMessage}</span>
                        </div>
                      )}

                      {(usernameStatus === "taken" || usernameStatus === "reserved" || usernameStatus === "invalid") && (
                        <div className="mt-1.5 p-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-center gap-1.5 text-[11px] text-rose-700 dark:text-rose-300 font-medium animate-in fade-in duration-150">
                          <AlertCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 flex-shrink-0" />
                          <span>{usernameMessage}</span>
                        </div>
                      )}

                      {usernameStatus === "idle" && (
                        <div className="mt-1.5 p-2 rounded-lg bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 flex items-start gap-1.5 text-[11px] text-neutral-600 dark:text-neutral-400 leading-snug">
                          <AlertTriangle className="w-3.5 h-3.5 text-neutral-800 dark:text-neutral-200 flex-shrink-0 mt-0.5" />
                          <span>
                            <strong className="text-neutral-900 dark:text-white font-semibold">Note:</strong> Your username cannot be changed later.
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 2. Email Address */}
                  <div>
                    <label className="block text-xs font-semibold text-neutral-800 dark:text-neutral-200 mb-1">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                      <input
                        id="email-input"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@gmail.com"
                        required
                        className="w-full pl-10 pr-4 py-2.5 text-sm bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-xl text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-600 focus:outline-none focus:border-black dark:focus:border-white focus:ring-1 focus:ring-black dark:focus:ring-white transition"
                      />
                    </div>
                  </div>

                  {/* 3. Password Box (Available in Sign In mode) */}
                  {!isSignUp && authMethod === "password" && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                          Password
                        </label>
                        <button
                          type="button"
                          onClick={() => setModalType("forgotPassword")}
                          className="text-xs text-neutral-500 dark:text-neutral-400 hover:text-black dark:hover:text-white font-medium transition cursor-pointer"
                        >
                          Forgot password?
                        </button>
                      </div>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                        <input
                          id="password-input"
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Enter your password"
                          required
                          className="w-full pl-10 pr-10 py-2.5 text-sm bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-xl text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-600 focus:outline-none focus:border-black dark:focus:border-white focus:ring-1 focus:ring-black dark:focus:ring-white transition"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition p-0.5 cursor-pointer"
                          title={showPassword ? "Hide password" : "Show password"}
                        >
                          {showPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Primary Submit Button */}
                  <button
                    type="submit"
                    disabled={loading || (isSignUp && (usernameStatus === "taken" || usernameStatus === "reserved" || usernameStatus === "invalid" || usernameStatus === "checking"))}
                    className="w-full mt-2 py-3 bg-black dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-200 text-white dark:text-black rounded-xl text-sm font-semibold transition disabled:opacity-50 shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {loading ? (
                      "Please wait..."
                    ) : isSignUp ? (
                      <>
                        <span>Send 6-Digit Code</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    ) : authMethod === "password" ? (
                      <>
                        <span>Sign in</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    ) : (
                      <>
                        <span>Send 6-Digit Code</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>

                {/* Switcher for Sign In: between Password and 6-Digit Code */}
                {!isSignUp && (
                  <div className="mt-3 text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setError(null);
                        setAuthMethod(authMethod === "code" ? "password" : "code");
                      }}
                      className="text-xs text-neutral-500 dark:text-neutral-400 hover:text-black dark:hover:text-white transition underline underline-offset-2 cursor-pointer"
                    >
                      {authMethod === "code"
                        ? "Or sign in with your password →"
                        : "Or sign in with a 6-digit email code →"}
                    </button>
                  </div>
                )}

                <div className="my-4 flex items-center justify-center gap-3">
                  <div className="h-px bg-neutral-200 dark:bg-neutral-800 flex-1" />
                  <span className="text-xs text-neutral-400 dark:text-neutral-500">or</span>
                  <div className="h-px bg-neutral-200 dark:bg-neutral-800 flex-1" />
                </div>

                {/* Toggle between Sign up and Sign in */}
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => toggleAuthMode(!isSignUp)}
                    className="text-xs text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white font-medium transition cursor-pointer"
                  >
                    {isSignUp ? (
                      <>
                        Already have an account? <span className="text-black dark:text-white font-semibold underline underline-offset-2">Sign in</span>
                      </>
                    ) : (
                      <>
                        Don&apos;t have an account? <span className="text-black dark:text-white font-semibold underline underline-offset-2">Sign up</span>
                      </>
                    )}
                  </button>
                </div>
              </>
            )}

            {/* ============================================================== */}
            {/* STEP 2: Verify 6-Digit Code */}
            {/* ============================================================== */}
            {step === "verify" && (
              <>
                <div className="text-center mb-6">
                  <div className="w-12 h-12 mx-auto rounded-2xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-black dark:text-white flex items-center justify-center mb-3 shadow-sm">
                    <KeyRound className="w-6 h-6 stroke-[2]" />
                  </div>
                  <h2 className="text-2xl font-bold text-neutral-900 dark:text-white tracking-tight">
                    Check your email
                  </h2>
                  <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                    We sent a 6-digit code to <strong className="text-neutral-900 dark:text-white">{email}</strong>
                  </p>
                </div>

                {infoMessage && (
                  <div className="mb-4 p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/60 text-neutral-800 dark:text-neutral-200 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-black dark:text-white flex-shrink-0" />
                    <span>{infoMessage}</span>
                  </div>
                )}

                {error && (
                  <div className="mb-4 p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/60 text-neutral-800 dark:text-neutral-200 text-xs flex items-center gap-2.5">
                    <AlertCircle className="w-4 h-4 text-neutral-700 dark:text-neutral-300 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <form onSubmit={handleVerifyCode} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-800 dark:text-neutral-200 mb-1.5 text-center">
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
                    disabled={loading || code.length < 6}
                    className="w-full py-3 bg-black dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-200 text-white dark:text-black rounded-xl text-sm font-semibold transition disabled:opacity-50 shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {loading ? (
                      "Checking code..."
                    ) : isSignUp ? (
                      <>
                        <span>Continue</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    ) : (
                      <>
                        <span>Sign in</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>

                <div className="mt-5 flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                  <button
                    type="button"
                    onClick={() => {
                      setStep("input");
                      setError(null);
                    }}
                    className="hover:text-black dark:hover:text-white transition underline underline-offset-2 cursor-pointer"
                  >
                    ← Change email
                  </button>
                  <button
                    type="button"
                    onClick={handlePrimarySubmit}
                    disabled={loading}
                    className="hover:text-black dark:hover:text-white transition underline underline-offset-2 cursor-pointer"
                  >
                    Resend code
                  </button>
                </div>
              </>
            )}

            {/* ============================================================== */}
            {/* STEP 3: Set Password (for Sign Up) */}
            {/* ============================================================== */}
            {step === "password" && (
              <>
                <div className="text-center mb-6">
                  <div className="w-12 h-12 mx-auto rounded-2xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-black dark:text-white flex items-center justify-center mb-3 shadow-sm">
                    <Lock className="w-6 h-6 stroke-[2]" />
                  </div>
                  <h2 className="text-2xl font-bold text-neutral-900 dark:text-white tracking-tight">
                    Set your password
                  </h2>
                  <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                    Choose a password to secure your account
                  </p>
                </div>

                {/* Account Details Summary (Fixed) */}
                <div className="mb-4 p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-500 dark:text-neutral-400">Username</span>
                    <span className="font-semibold text-neutral-900 dark:text-white font-mono">@{cleanUsername}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-500 dark:text-neutral-400">Email</span>
                    <span className="font-medium text-neutral-900 dark:text-white">{email}</span>
                  </div>
                </div>

                {error && (
                  <div className="mb-4 p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/60 text-neutral-800 dark:text-neutral-200 text-xs flex items-center gap-2.5">
                    <AlertCircle className="w-4 h-4 text-neutral-700 dark:text-neutral-300 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <form onSubmit={handleCompleteSignUp} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-800 dark:text-neutral-200 mb-1">
                      Create Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                      <input
                        id="signup-password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Choose a password (min 6 chars)"
                        minLength={6}
                        autoFocus
                        required
                        className="w-full pl-10 pr-10 py-2.5 text-sm bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-xl text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-600 focus:outline-none focus:border-black dark:focus:border-white focus:ring-1 focus:ring-black dark:focus:ring-white transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition p-0.5 cursor-pointer"
                        title={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || password.length < 6}
                    className="w-full py-3 bg-black dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-200 text-white dark:text-black rounded-xl text-sm font-semibold transition disabled:opacity-50 shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {loading ? (
                      "Creating account..."
                    ) : (
                      <>
                        <span>Complete Sign Up</span>
                        <Check className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>

                <div className="mt-5 text-center text-xs text-neutral-500 dark:text-neutral-400 pt-3 border-t border-neutral-100 dark:border-neutral-800">
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

          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-7xl w-full mx-auto flex flex-col sm:flex-row items-center justify-between text-xs text-neutral-400 dark:text-neutral-600 pt-6 border-t border-neutral-100 dark:border-neutral-800">
        <div>© 2026 domainyourlink. All rights reserved.</div>
        <div className="mt-2 sm:mt-0">Simple links. Permanent forever.</div>
      </footer>

      {/* Clean, Simple Information Modals */}
      {modalType && (
        <div
          onClick={() => setModalType(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 dark:bg-black/70 backdrop-blur-sm animate-in fade-in duration-150 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-7 sm:p-8 shadow-2xl cursor-default"
          >
            <div className="flex items-center justify-between pb-4 border-b border-neutral-100 dark:border-neutral-800">
              <h3 className="text-lg font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                {modalType === "about" && "About domainyourlink"}
                {modalType === "howItWorks" && "How it works"}
                {modalType === "features" && "Features"}
                {modalType === "forgotPassword" && "Reset Password"}
              </h3>
              <button
                type="button"
                onClick={() => setModalType(null)}
                className="p-1 rounded-lg text-neutral-400 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-5 space-y-4 text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed">
              {/* About Modal */}
              {modalType === "about" && (
                <div className="space-y-3">
                  <p className="text-neutral-800 dark:text-neutral-200 font-medium">
                    domainyourlink gives you one simple link that stays with you forever.
                  </p>
                  <p>
                    Ever printed a link on your resume or business card, only to change your username later? With domainyourlink, you never have to worry.
                  </p>
                  <p>
                    Whenever you update your social media handle or website, just change where the link points in your dashboard. Your shared link stays the exact same!
                  </p>
                </div>
              )}

              {/* How it works Modal */}
              {modalType === "howItWorks" && (
                <div className="space-y-3.5">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-black dark:bg-white text-white dark:text-black text-xs flex items-center justify-center font-bold flex-shrink-0 mt-0.5">
                      1
                    </div>
                    <div>
                      <strong className="text-neutral-900 dark:text-white block">Pick your username</strong>
                      Choose your name (like <code className="bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded text-neutral-800 dark:text-neutral-200 font-mono text-xs">siddu</code>). It stays yours forever.
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-black dark:bg-white text-white dark:text-black text-xs flex items-center justify-center font-bold flex-shrink-0 mt-0.5">
                      2
                    </div>
                    <div>
                      <strong className="text-neutral-900 dark:text-white block">Create your links</strong>
                      Add simple links like <code className="bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded text-neutral-800 dark:text-neutral-200 font-mono text-xs">yourlink.com/siddu/linkedin</code>.
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-black dark:bg-white text-white dark:text-black text-xs flex items-center justify-center font-bold flex-shrink-0 mt-0.5">
                      3
                    </div>
                    <div>
                      <strong className="text-neutral-900 dark:text-white block">Update destination anytime</strong>
                      Whenever you change your profiles or websites, change the destination in your dashboard. Your public link never breaks!
                    </div>
                  </div>
                </div>
              )}

              {/* Features Modal */}
              {modalType === "features" && (
                <div className="space-y-3.5">
                  <div className="flex items-start gap-3">
                    <Zap className="w-5 h-5 text-black dark:text-white flex-shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-neutral-900 dark:text-white block">Instant Speed</strong>
                      When someone clicks your link, they open your destination page immediately with zero waiting.
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Sparkles className="w-5 h-5 text-black dark:text-white flex-shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-neutral-900 dark:text-white block">Links Never Break</strong>
                      Share your links on resumes, bios, or cards without worrying about changing them later.
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <ShieldCheck className="w-5 h-5 text-black dark:text-white flex-shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-neutral-900 dark:text-white block">Safe & Simple Login</strong>
                      Sign in easily with your password or a quick 6-digit code sent right to your email.
                    </div>
                  </div>
                </div>
              )}

              {/* Forgot Password Modal */}
              {modalType === "forgotPassword" && (
                <div className="space-y-3">
                  <p>
                    You can easily sign in by requesting a <strong>6-digit verification code</strong> sent directly to your email, or update your password in your settings.
                  </p>
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-neutral-100 dark:border-neutral-800 flex justify-end">
              <button
                type="button"
                onClick={() => setModalType(null)}
                className="px-4 py-2 bg-black dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-200 text-white dark:text-black rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
