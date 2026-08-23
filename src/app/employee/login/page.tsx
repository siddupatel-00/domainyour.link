"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  Mail,
  KeyRound,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Lock,
  Eye,
  EyeOff,
  User,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function EmployeeLoginPage() {
  const [method, setMethod] = useState<"password" | "otp">("password");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [otpStep, setOtpStep] = useState<"email" | "code">("email");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const router = useRouter();

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!identifier.trim() || !password) {
      setError("Please enter your username/email and password");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/employee/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "password",
          identifier: identifier.trim(),
          password,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Login failed");
      }

      router.push("/employee");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);

    if (!email.trim() || !email.includes("@")) {
      setError("Please enter your registered work email");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/employee/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send_code",
          email: email.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Could not send security code");
      }

      setOtpStep("code");
      setInfoMessage(`Security code sent to ${email.trim()}`);
      if (data.devCode) {
        setCode(data.devCode);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!code.trim()) {
      setError("Please enter the 6-digit code");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/employee/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "verify_code",
          email: email.trim(),
          code: code.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Invalid security code");
      }

      router.push("/employee");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setLoading(false);
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

      {/* Main Card */}
      <div className="max-w-md w-full mx-auto my-auto p-8 sm:p-10 rounded-3xl border border-neutral-800 bg-neutral-900 shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-neutral-800 border border-neutral-700 text-white flex items-center justify-center mx-auto shadow-md">
            {method === "password" ? <Lock className="w-6 h-6" /> : <KeyRound className="w-6 h-6" />}
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Staff Portal Login
          </h1>
          <p className="text-xs text-neutral-400">
            Sign in to access platform insights and views
          </p>
        </div>

        {/* Method Switcher */}
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-neutral-950 rounded-xl border border-neutral-800 text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setMethod("password");
              setError(null);
            }}
            className={`py-2 rounded-lg transition cursor-pointer ${
              method === "password"
                ? "bg-neutral-800 text-white shadow-sm"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            Password Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMethod("otp");
              setError(null);
            }}
            className={`py-2 rounded-lg transition cursor-pointer ${
              method === "otp"
                ? "bg-neutral-800 text-white shadow-sm"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            Email Code (OTP)
          </button>
        </div>

        {infoMessage && (
          <div className="p-3.5 rounded-xl border border-neutral-700 bg-neutral-800 text-neutral-200 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-white flex-shrink-0" />
            <span>{infoMessage}</span>
          </div>
        )}

        {error && (
          <div className="p-3.5 rounded-xl border border-red-900/50 bg-red-950/40 text-red-300 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {method === "password" ? (
          /* Password Form */
          <form onSubmit={handlePasswordLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                Username or Work Email
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="alex or alex@company.com"
                  autoFocus
                  required
                  className="w-full pl-10 pr-4 py-2.5 text-xs bg-neutral-950 border border-neutral-800 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:border-white transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                Password
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
              disabled={loading}
              className="w-full py-3 bg-white hover:bg-neutral-200 text-black rounded-xl text-xs font-semibold transition disabled:opacity-50 shadow-sm flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              {loading ? (
                "Signing In..."
              ) : (
                <>
                  <span>Sign In with Password</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        ) : (
          /* OTP Form */
          otpStep === "email" ? (
            <form onSubmit={handleSendCode} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  Authorized Work Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="alex@company.com"
                    autoFocus
                    required
                    className="w-full pl-10 pr-4 py-2.5 text-xs bg-neutral-950 border border-neutral-800 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:border-white transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-white hover:bg-neutral-200 text-black rounded-xl text-xs font-semibold transition disabled:opacity-50 shadow-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? (
                  "Sending Code..."
                ) : (
                  <>
                    <span>Send Security Code</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyCode} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5 text-center">
                  6-Digit Security Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ""))}
                  placeholder="••••••"
                  autoFocus
                  required
                  className="w-full text-center tracking-[10px] text-2xl font-mono py-3 bg-neutral-950 border border-neutral-800 rounded-xl text-white placeholder-neutral-700 focus:outline-none focus:border-white transition"
                />
              </div>

              <button
                type="submit"
                disabled={loading || code.length < 6}
                className="w-full py-3 bg-white hover:bg-neutral-200 text-black rounded-xl text-xs font-semibold transition disabled:opacity-50 shadow-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? "Verifying..." : "Access Staff Workspace"}
              </button>

              <div className="flex items-center justify-between text-xs text-neutral-400 pt-2 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => {
                    setOtpStep("email");
                    setError(null);
                  }}
                  className="hover:text-white transition underline underline-offset-2 cursor-pointer"
                >
                  ← Change email
                </button>
                <button
                  type="button"
                  onClick={handleSendCode}
                  disabled={loading}
                  className="hover:text-white transition underline underline-offset-2 cursor-pointer"
                >
                  Resend code
                </button>
              </div>
            </form>
          )
        )}
      </div>

      {/* Footer */}
      <footer className="text-center text-xs text-neutral-500">
        PermanentLink Staff & Operations Portal
      </footer>
    </main>
  );
}
