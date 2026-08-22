import Link from "next/link";
import { ArrowRight, ArrowUpRight, Link2, Shield, Zap, Globe, CornerDownRight } from "lucide-react";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-black text-white flex flex-col justify-between">
      {/* Top Navigation */}
      <header className="border-b border-neutral-800 px-6 sm:px-12 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white text-black flex items-center justify-center font-bold">
              <Link2 className="w-4 h-4" />
            </div>
            <span className="font-semibold text-sm tracking-tight text-white">
              PermanentLink
            </span>
          </div>

          <Link
            href="/admin"
            className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded-lg text-xs font-medium hover:bg-neutral-200 transition"
          >
            <span>Dashboard</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-4xl mx-auto px-6 py-20 sm:py-28 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-neutral-800 bg-neutral-950 text-neutral-400 text-xs font-mono mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          <span>HTTP 307 Dynamic Redirection</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-white leading-tight">
          Permanent URLs that adapt to changing destinations.
        </h1>

        <p className="mt-6 text-sm sm:text-base text-neutral-400 max-w-2xl mx-auto leading-relaxed">
          Share clean, unchanging links like <code className="text-white bg-neutral-900 border border-neutral-800 px-2 py-0.5 rounded font-mono text-xs">domain.com/siddu/linkedin</code>.
          Update where they redirect at any time from your dashboard without ever breaking your public link.
        </p>

        {/* Visual Route Example Card */}
        <div className="mt-12 max-w-xl mx-auto rounded-xl border border-neutral-800 bg-neutral-950 p-5 text-left font-mono text-xs shadow-2xl">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-3 mb-4 text-neutral-400">
            <span className="text-[11px] uppercase tracking-wider font-semibold">Public Link</span>
            <span className="text-[11px] uppercase tracking-wider font-semibold">Destination</span>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-2.5 rounded-lg border border-neutral-900 bg-black">
              <span className="text-white font-medium">/siddu/linkedin</span>
              <div className="flex items-center gap-1.5 text-neutral-400">
                <CornerDownRight className="w-3.5 h-3.5 text-neutral-600" />
                <span className="truncate max-w-[200px] text-neutral-300">linkedin.com/in/siddu</span>
              </div>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg border border-neutral-900 bg-black">
              <span className="text-white font-medium">/siddu/github</span>
              <div className="flex items-center gap-1.5 text-neutral-400">
                <CornerDownRight className="w-3.5 h-3.5 text-neutral-600" />
                <span className="truncate max-w-[200px] text-neutral-300">github.com/siddu</span>
              </div>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg border border-neutral-900 bg-black">
              <span className="text-white font-medium">/siddu/lifeagent</span>
              <div className="flex items-center gap-1.5 text-neutral-400">
                <CornerDownRight className="w-3.5 h-3.5 text-neutral-600" />
                <span className="truncate max-w-[200px] text-neutral-300">lifeagent.ai</span>
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-10 flex items-center justify-center gap-3">
          <Link
            href="/admin"
            className="px-6 py-3 bg-white text-black font-medium text-sm rounded-lg hover:bg-neutral-200 transition flex items-center gap-2"
          >
            <span>Open Admin Dashboard</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="max-w-5xl mx-auto px-6 pb-24 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-6 rounded-xl border border-neutral-800 bg-neutral-950">
          <div className="w-8 h-8 rounded-lg border border-neutral-800 bg-black flex items-center justify-center mb-4 text-white">
            <Zap className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-semibold text-white">Zero Latency 307</h3>
          <p className="text-xs text-neutral-400 mt-2 leading-relaxed">
            Direct single indexed database lookup followed by an immediate server-side HTTP 307 redirect.
          </p>
        </div>

        <div className="p-6 rounded-xl border border-neutral-800 bg-neutral-950">
          <div className="w-8 h-8 rounded-lg border border-neutral-800 bg-black flex items-center justify-center mb-4 text-white">
            <Globe className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-semibold text-white">Permanent URLs</h3>
          <p className="text-xs text-neutral-400 mt-2 leading-relaxed">
            Printed links on resumes, cards, or bios never break when your social usernames or portfolios change.
          </p>
        </div>

        <div className="p-6 rounded-xl border border-neutral-800 bg-neutral-950">
          <div className="w-8 h-8 rounded-lg border border-neutral-800 bg-black flex items-center justify-center mb-4 text-white">
            <Shield className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-semibold text-white">Secure Admin</h3>
          <p className="text-xs text-neutral-400 mt-2 leading-relaxed">
            Protected password dashboard to create, update destinations, copy links, and track click counts.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-neutral-800 py-6 text-center text-xs text-neutral-500 font-mono">
        PermanentLink — Minimalist Dynamic Redirection Service
      </footer>
    </main>
  );
}
