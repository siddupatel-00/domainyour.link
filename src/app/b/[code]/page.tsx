"use client";

import { use, useEffect, useState } from "react";
import { Link2, ArrowRight, X, ExternalLink, Copy, Check, Sparkles } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

interface LinkItem {
  id: number;
  username: string;
  webname: string;
  code?: string | null;
  title?: string | null;
  destinationUrl: string;
  expiresAt: Date | string | null;
  showOnProfile: boolean;
  clickCount: number;
}

interface BioData {
  type: "main" | "sub";
  code: string;
  bioname?: string;
  title?: string | null;
  description?: string | null;
  username: string;
  avatar: string | null;
  isExpired: boolean;
  links: LinkItem[];
}

interface BioPageProps {
  params: Promise<{ code: string }>;
}

export default function PermanentBioPage({ params }: BioPageProps) {
  const { code } = use(params);
  const cleanCode = code?.trim().toLowerCase() || "";

  const [bioData, setBioData] = useState<BioData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function loadBio() {
      if (!cleanCode) return;
      try {
        setLoading(true);
        const res = await fetch(`/api/public/bio?code=${encodeURIComponent(cleanCode)}&t=${Date.now()}`, {
          cache: "no-store",
          headers: { "Cache-Control": "no-cache" },
        });

        if (res.ok) {
          const data: BioData = await res.json();
          setBioData(data);
        } else {
          setBioData(null);
        }
      } catch (err) {
        console.error("Load bio error:", err);
        setBioData(null);
      } finally {
        setLoading(false);
      }
    }

    loadBio();
  }, [cleanCode]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isPreviewOpen) setIsPreviewOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPreviewOpen]);

  const handleCopyBioLink = () => {
    if (typeof window === "undefined") return;
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const username = bioData?.username || "";
  const initial = username.charAt(0).toUpperCase() || "B";

  return (
    <main className="min-h-screen bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 font-sans selection:bg-black dark:selection:bg-white selection:text-white dark:selection:text-black flex flex-col justify-between py-12 px-4 sm:px-6 transition-colors duration-200">
      {/* Top Bar with Theme Toggle & Copy Link */}
      <div className="w-full max-w-md mx-auto flex items-center justify-between">
        <button
          onClick={handleCopyBioLink}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border border-neutral-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/80 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300 shadow-sm transition"
          title="Copy permanent bio link"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-black dark:text-white" />
              <span className="text-black dark:text-white font-semibold">Copied link!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Share bio</span>
            </>
          )}
        </button>
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md mx-auto space-y-8 animate-in fade-in duration-300 mt-4">
        {/* Creator Avatar & Header */}
        <div className="text-center space-y-3">
          {bioData?.avatar ? (
            <button
              type="button"
              onClick={() => setIsPreviewOpen(true)}
              className="group/avatar block mx-auto rounded-full focus:outline-none focus:ring-4 focus:ring-black dark:focus:ring-white transition cursor-pointer"
              title="Click to view full photo"
            >
              <img
                src={bioData.avatar}
                alt={username}
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover shadow-xl mx-auto ring-4 ring-neutral-100 dark:ring-neutral-900 group-hover/avatar:opacity-90 group-hover/avatar:scale-105 transition-all duration-200"
              />
            </button>
          ) : (
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-black dark:bg-white text-white dark:text-black flex items-center justify-center font-bold text-2xl sm:text-3xl shadow-xl mx-auto ring-4 ring-neutral-100 dark:ring-neutral-900">
              {initial}
            </div>
          )}

          <div className="space-y-1">
            <h1 className="text-lg sm:text-xl font-bold text-neutral-900 dark:text-white tracking-tight flex items-center justify-center gap-1.5">
              <span>@{username || cleanCode}</span>
              {bioData && (
                <span className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
                  Permanent Bio
                </span>
              )}
            </h1>

            {bioData?.title && bioData.title !== `@${username}` && (
              <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                {bioData.title}
              </p>
            )}

            {bioData?.description && (
              <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-sm mx-auto leading-relaxed">
                {bioData.description}
              </p>
            )}
          </div>
        </div>

        {/* Links List */}
        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-12 text-neutral-400 dark:text-neutral-500 text-xs font-medium">
              Loading links...
            </div>
          ) : !bioData ? (
            <div className="text-center py-16 px-4 rounded-3xl border border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50 space-y-2">
              <Link2 className="w-8 h-8 text-neutral-400 dark:text-neutral-500 mx-auto stroke-[1.8]" />
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">Bio page not found</h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-xs mx-auto">
                This bio link does not exist or may have been deleted.
              </p>
            </div>
          ) : bioData.isExpired ? (
            <div className="text-center py-16 px-4 rounded-3xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 space-y-2">
              <Link2 className="w-8 h-8 text-amber-500 dark:text-amber-400 mx-auto stroke-[1.8]" />
              <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-200">This bio link has expired</h3>
              <p className="text-xs text-amber-700 dark:text-amber-400 max-w-xs mx-auto">
                This temporary bio link has reached its expiration time.
              </p>
            </div>
          ) : bioData.links.length === 0 ? (
            <div className="text-center py-16 px-4 rounded-3xl border border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50 space-y-2">
              <Link2 className="w-8 h-8 text-neutral-400 dark:text-neutral-500 mx-auto stroke-[1.8]" />
              <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-xs mx-auto">
                No links available right now.
              </p>
            </div>
          ) : (
            bioData.links.map((link) => (
              <a
                key={link.id}
                href={link.code ? `/u/${link.code}` : `/${link.username}/${link.webname}`}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative flex items-center justify-between p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-black dark:hover:border-white shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer"
              >
                <div className="flex items-center gap-3.5 min-w-0 pr-4">
                  <div className="w-9 h-9 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-600 dark:text-neutral-300 group-hover:bg-black group-hover:text-white dark:group-hover:bg-white dark:group-hover:text-black transition-colors shrink-0">
                    <Link2 className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-sm font-semibold text-neutral-900 dark:text-white truncate block">
                      {link.title || link.webname}
                    </span>
                    <span className="text-[11px] text-neutral-400 dark:text-neutral-500 truncate block mt-0.5 font-mono">
                      {link.destinationUrl}
                    </span>
                  </div>
                </div>

                <div className="w-7 h-7 rounded-full flex items-center justify-center text-neutral-400 group-hover:text-black dark:group-hover:text-white group-hover:translate-x-0.5 transition shrink-0">
                  <ArrowRight className="w-4 h-4" />
                </div>
              </a>
            ))
          )}
        </div>
      </div>

      {/* Powered by footer */}
      <div className="w-full max-w-md mx-auto text-center pt-8">
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[11px] text-neutral-400 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 transition"
        >
          <span>Powered by</span>
          <span className="font-semibold text-neutral-900 dark:text-white">domainyourlink</span>
        </a>
      </div>

      {/* Full-Screen Avatar Lightbox Modal */}
      {isPreviewOpen && bioData?.avatar && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200 cursor-pointer"
          onClick={() => setIsPreviewOpen(false)}
        >
          <div
            className="relative max-w-md w-full bg-neutral-900 rounded-3xl overflow-hidden border border-neutral-800 shadow-2xl p-6 text-center cursor-default animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setIsPreviewOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-full bg-neutral-800/80 hover:bg-neutral-700 text-neutral-400 hover:text-white transition cursor-pointer"
              title="Close (Esc)"
            >
              <X className="w-4 h-4" />
            </button>

            <img
              src={bioData.avatar}
              alt={username}
              className="w-56 h-56 sm:w-64 sm:h-64 rounded-full object-cover shadow-2xl mx-auto ring-4 ring-neutral-800 my-4"
            />

            <h3 className="text-base font-bold text-white tracking-tight">@{username}</h3>
            <p className="text-xs text-neutral-400 mt-1">Profile Photo</p>

            <div className="mt-6 flex items-center justify-center gap-2">
              <a
                href={bioData.avatar}
                target="_blank"
                rel="noopener noreferrer"
                download={`avatar-${username}.png`}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-white text-black hover:bg-neutral-200 transition cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open Full Size</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
