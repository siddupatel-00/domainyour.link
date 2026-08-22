import Link from "next/link";
import {
  Link2,
  Zap,
  ArrowRight,
  ShieldCheck,
  Globe2,
  Layers,
  Sparkles,
} from "lucide-react";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col justify-between selection:bg-indigo-500 selection:text-white">
      {/* Header */}
      <header className="border-b border-slate-800/80 px-6 sm:px-12 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-600/10 border border-indigo-500/20 text-indigo-400">
              <Link2 className="w-5 h-5" />
            </div>
            <span className="font-bold text-base text-white tracking-tight">
              PermanentLink
            </span>
          </div>

          <Link
            href="/admin"
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition shadow-lg shadow-indigo-600/20"
          >
            <span>Admin Dashboard</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-4xl mx-auto px-6 py-16 sm:py-24 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold mb-6">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Ultra-Fast Dynamic Redirection</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight leading-tight">
          Permanent URLs that adapt to <br className="hidden sm:inline" />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">
            changing destinations.
          </span>
        </h1>

        <p className="mt-6 text-sm sm:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Share clean, branded public URLs like <code className="text-indigo-400 bg-slate-900 px-1.5 py-0.5 rounded font-mono">domain.com/siddu/linkedin</code>.
          Update where they point anytime in your dashboard without ever breaking your public link.
        </p>

        {/* Live Visual Demonstration */}
        <div className="mt-10 max-w-xl mx-auto p-5 rounded-2xl bg-slate-900/90 border border-slate-800 text-left shadow-2xl">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400 mb-3 border-b border-slate-800/80 pb-2">
            <span>How It Works</span>
            <span className="text-emerald-400 font-mono">HTTP 307 Instant Redirect</span>
          </div>

          <div className="space-y-2.5 text-xs font-mono">
            <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
              <span className="text-indigo-400 font-medium">/siddu/linkedin</span>
              <span className="text-slate-500">↳ https://linkedin.com/in/currentusername</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
              <span className="text-indigo-400 font-medium">/siddu/github</span>
              <span className="text-slate-500">↳ https://github.com/currentusername</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
              <span className="text-indigo-400 font-medium">/siddu/lifeagent</span>
              <span className="text-slate-500">↳ https://lifeagent.ai</span>
            </div>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link
            href="/admin"
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold transition shadow-xl shadow-indigo-600/25 flex items-center gap-2"
          >
            <span>Open Admin Dashboard</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="max-w-6xl mx-auto px-6 pb-20 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-4">
            <Zap className="w-5 h-5" />
          </div>
          <h3 className="text-base font-semibold text-white">Instant Server-Side 307</h3>
          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
            One single indexed lookup and immediate redirect headers. Zero intermediate web pages or script lag.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center mb-4">
            <Globe2 className="w-5 h-5" />
          </div>
          <h3 className="text-base font-semibold text-white">Never Broken URLs</h3>
          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
            Printed links on resumes, business cards, NFC tags, or bios never become obsolete when social handles change.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h3 className="text-base font-semibold text-white">Self-Hosted & Secure</h3>
          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
            Backed by PostgreSQL / Neon and deployable to Vercel in seconds with protected admin authentication.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-6 text-center text-xs text-slate-500">
        <p>PermanentLink — Simple, Ultra-Fast URL Redirection Engine</p>
      </footer>
    </main>
  );
}
