"use client";

import { use, useEffect, useState } from "react";
import { Link2, ArrowRight, X } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

interface LinkItem {
  id: number;
  username: string;
  webname: string;
  title?: string | null;
  destinationUrl: string;
  expiresAt: Date | string | null;
  showOnProfile: boolean;
  clickCount: number;
}

interface UserProfilePageProps {
  params: Promise<{ username: string }>;
}

export default function UserProfilePage({ params }: UserProfilePageProps) {
  const { username } = use(params);
  const cleanUsername = username?.trim().toLowerCase() || "user";

  const [links, setLinks] = useState<LinkItem[]>([]);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [displayUsername, setDisplayUsername] = useState(cleanUsername);
  const [redirectedFrom, setRedirectedFrom] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  useEffect(() => {
    async function loadUserLinks() {
      try {
        setLoading(true);
        const res = await fetch(`/api/public/profile?username=${encodeURIComponent(cleanUsername)}&t=${Date.now()}`, {
          cache: "no-store",
          headers: { "Cache-Control": "no-cache" },
        });

        if (res.ok) {
          const data = await res.json();
          setLinks(data.links || []);
          if (data.username) setDisplayUsername(data.username);
          if (data.redirectedFrom) setRedirectedFrom(data.redirectedFrom);
          if (data.avatar) setAvatar(data.avatar);
        } else {
          setLinks([]);
        }
      } catch (err) {
        console.error("Load user links error:", err);
        setLinks([]);
      } finally {
        setLoading(false);
      }
    }

    loadUserLinks();
  }, [cleanUsername]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isPreviewOpen) setIsPreviewOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPreviewOpen]);

  const initial = cleanUsername.charAt(0).toUpperCase();

  return (
    <main className="min-h-screen bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 font-sans selection:bg-black dark:selection:bg-white selection:text-white dark:selection:text-black flex flex-col justify-between py-12 px-4 sm:px-6 transition-colors duration-200">
      {/* Top Floating Theme Toggle */}
      <div className="w-full max-w-md mx-auto flex justify-end">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md mx-auto space-y-8 animate-in fade-in duration-300">
        {/* Clean Avatar Header */}
        <div className="text-center space-y-3">
          {avatar ? (
            <button
              type="button"
              onClick={() => setIsPreviewOpen(true)}
              className="group/avatar block mx-auto rounded-full focus:outline-none focus:ring-4 focus:ring-black dark:focus:ring-white transition cursor-pointer"
              title="Click to view full photo"
            >
              <img
                src={avatar}
                alt={cleanUsername}
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover shadow-xl mx-auto ring-4 ring-neutral-100 dark:ring-neutral-900 group-hover/avatar:opacity-90 group-hover/avatar:scale-105 transition-all duration-200"
              />
            </button>
          ) : (
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-black dark:bg-white text-white dark:text-black flex items-center justify-center font-bold text-2xl sm:text-3xl shadow-xl mx-auto ring-4 ring-neutral-100 dark:ring-neutral-900">
              {initial}
            </div>
          )}

          <div className="space-y-1">
            <h1 className="text-lg sm:text-xl font-bold text-neutral-900 dark:text-white tracking-tight">
              @{displayUsername}
            </h1>
            {redirectedFrom && (
              <p className="text-[11px] text-neutral-400 dark:text-neutral-500 font-medium">
                (formerly @{redirectedFrom})
              </p>
            )}
          </div>
        </div>

        {/* Clean Links List */}
        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-12 text-neutral-400 dark:text-neutral-500 text-xs font-medium">
              Loading links...
            </div>
          ) : links.length === 0 ? (
            <div className="text-center py-16 px-4 rounded-3xl border border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50 space-y-2">
              <Link2 className="w-8 h-8 text-neutral-400 dark:text-neutral-500 mx-auto stroke-[1.8]" />
              <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-xs mx-auto">
                No links available right now.
              </p>
            </div>
          ) : (
            links.map((link) => {
              const directRedirectUrl = `/${cleanUsername}/${link.webname}`;

              return (
                <a
                  key={link.id}
                  href={directRedirectUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center justify-between p-4 sm:p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-black dark:hover:border-white hover:shadow-md transition-all duration-200"
                >
                  <div className="min-w-0 flex items-center gap-3.5">
                    <div className="w-9 h-9 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-black dark:text-white flex items-center justify-center font-bold flex-shrink-0 group-hover:bg-black dark:group-hover:bg-white group-hover:text-white dark:group-hover:text-black transition">
                      <Link2 className="w-4 h-4 stroke-[2]" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-sm font-bold text-neutral-900 dark:text-white group-hover:text-black dark:group-hover:text-white transition truncate block">
                        {link.title || `/${link.webname}`}
                      </span>
                    </div>
                  </div>

                  <div className="w-8 h-8 rounded-xl bg-neutral-50 dark:bg-neutral-800 flex items-center justify-center text-neutral-400 dark:text-neutral-500 group-hover:text-black dark:group-hover:text-white group-hover:bg-neutral-100 dark:group-hover:bg-neutral-700 transition flex-shrink-0">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </a>
              );
            })
          )}
        </div>
      </div>

      {/* Footer Branding */}
      <footer className="mt-12 text-center text-xs text-neutral-400 dark:text-neutral-600">
        <a
          href="/"
          className="inline-flex items-center gap-1.5 font-semibold text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white transition text-[11px]"
        >
          <Link2 className="w-3 h-3 text-black dark:text-white" />
          <span>domainyourlink</span>
        </a>
      </footer>

      {/* Profile Photo Lightbox Modal */}
      {isPreviewOpen && avatar && (
        <div
          onClick={() => setIsPreviewOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-sm sm:max-w-md w-full flex flex-col items-center cursor-default animate-in zoom-in-95 duration-200"
          >
            <button
              type="button"
              onClick={() => setIsPreviewOpen(false)}
              className="absolute -top-12 right-0 p-2 rounded-full bg-white/10 hover:bg-white/25 text-white transition cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>

            <img
              src={avatar}
              alt={cleanUsername}
              className="w-72 h-72 sm:w-96 sm:h-96 rounded-full object-cover shadow-2xl ring-4 ring-white/20"
            />

            <div className="mt-5 text-center space-y-1">
              <span className="text-sm font-bold text-white block">
                @{cleanUsername}
              </span>
              <p className="text-xs text-white/50">Click outside to close</p>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
