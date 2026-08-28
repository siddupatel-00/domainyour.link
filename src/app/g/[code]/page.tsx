"use client";

import { use, useEffect, useState } from "react";
import { Link2, ArrowRight, Clock, Lock, ExternalLink, Copy, Check, Sparkles, Folder, X } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

interface GroupLinkItem {
  id: number;
  username: string;
  webname: string;
  title: string;
  destinationUrl: string;
  redirectUrl?: string;
  expiresAt: Date | string | null;
  clickCount: number;
}

interface GroupData {
  id?: number;
  name: string;
  color?: string;
  shareCode?: string;
  isShared?: boolean;
  expiresAt?: Date | string | null;
}

interface CreatorData {
  username: string;
  avatar: string | null;
}

interface PublicGroupPageProps {
  params: Promise<{ code: string }>;
}

export default function PublicGroupPage({ params }: PublicGroupPageProps) {
  const { code } = use(params);
  const cleanCode = code?.trim().toLowerCase() || "";

  const [creator, setCreator] = useState<CreatorData | null>(null);
  const [group, setGroup] = useState<GroupData | null>(null);
  const [links, setLinks] = useState<GroupLinkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPrivate, setIsPrivate] = useState(false);
  const [isExpired, setIsExpired] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [allOpened, setAllOpened] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  useEffect(() => {
    async function loadGroup() {
      if (!cleanCode) return;
      try {
        setLoading(true);
        const res = await fetch(`/api/public/group?code=${encodeURIComponent(cleanCode)}&t=${Date.now()}`, {
          cache: "no-store",
          headers: { "Cache-Control": "no-cache" },
        });

        if (res.ok) {
          const data = await res.json();
          setCreator(data.creator || null);
          setGroup(data.group || null);
          setLinks(data.links || []);
          setIsPrivate(Boolean(data.isPrivate));
          setIsExpired(Boolean(data.isExpired));
        } else {
          setCreator(null);
          setGroup(null);
          setLinks([]);
        }
      } catch (err) {
        console.error("Failed to load public group:", err);
        setCreator(null);
        setGroup(null);
        setLinks([]);
      } finally {
        setLoading(false);
      }
    }

    loadGroup();
  }, [cleanCode]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isPreviewOpen) setIsPreviewOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPreviewOpen]);

  const handleCopyLink = (id: number, pathOrUrl: string) => {
    const fullUrl = pathOrUrl.startsWith("http") ? pathOrUrl : `${window.location.origin}${pathOrUrl}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleOpenAll = () => {
    links.forEach((l) => {
      const targetUrl = l.redirectUrl || `/${l.username}/${l.webname}`;
      window.open(targetUrl, "_blank", "noopener,noreferrer");
    });
    setAllOpened(true);
    setTimeout(() => setAllOpened(false), 2000);
  };

  // Loading State
  if (loading) {
    return (
      <main className="min-h-screen bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 font-sans flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-neutral-300 dark:border-neutral-700 border-t-black dark:border-t-white animate-spin" />
          <p className="text-xs text-neutral-400 dark:text-neutral-500 font-mono">Loading group...</p>
        </div>
      </main>
    );
  }

  // Expired State
  if (isExpired) {
    return (
      <main className="min-h-screen bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 font-sans flex items-center justify-center p-6 transition-colors duration-200">
        <div className="text-center max-w-sm w-full p-8 rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xl space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-black dark:text-white mx-auto">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-neutral-900 dark:text-white">This Link Has Expired</h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              This shared group link is no longer active.
            </p>
          </div>
          <a
            href="/"
            className="inline-block px-5 py-2.5 bg-black dark:bg-white text-white dark:text-black text-xs font-semibold rounded-xl hover:bg-neutral-800 dark:hover:bg-neutral-200 transition"
          >
            Go Home
          </a>
        </div>
      </main>
    );
  }

  // Private / Disabled Sharing State
  if (isPrivate) {
    return (
      <main className="min-h-screen bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 font-sans flex items-center justify-center p-6 transition-colors duration-200">
        <div className="text-center max-w-sm w-full p-8 rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xl space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-black dark:text-white mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-neutral-900 dark:text-white">This Group is Private</h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              Public sharing has been disabled by the creator.
            </p>
          </div>
          <a
            href="/"
            className="inline-block px-5 py-2.5 bg-black dark:bg-white text-white dark:text-black text-xs font-semibold rounded-xl hover:bg-neutral-800 dark:hover:bg-neutral-200 transition"
          >
            Go Home
          </a>
        </div>
      </main>
    );
  }

  // Not Found State
  if (!group) {
    return (
      <main className="min-h-screen bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 font-sans flex items-center justify-center p-6 transition-colors duration-200">
        <div className="text-center max-w-sm w-full p-8 rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xl space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-black dark:text-white mx-auto">
            <Folder className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-neutral-900 dark:text-white">Group Not Found</h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              This shared link collection does not exist or has been removed.
            </p>
          </div>
          <a
            href="/"
            className="inline-block px-5 py-2.5 bg-black dark:bg-white text-white dark:text-black text-xs font-semibold rounded-xl hover:bg-neutral-800 dark:hover:bg-neutral-200 transition"
          >
            Go Home
          </a>
        </div>
      </main>
    );
  }

  // Active Shared Group State
  const initial = creator?.username ? creator.username.charAt(0).toUpperCase() : "U";

  return (
    <main className="min-h-screen bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 font-sans selection:bg-black dark:selection:bg-white selection:text-white dark:selection:text-black flex flex-col justify-between py-12 px-4 sm:px-6 transition-colors duration-200">
      {/* Top Floating Theme Toggle */}
      <div className="w-full max-w-md mx-auto flex justify-end">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md mx-auto my-auto space-y-7 animate-in fade-in zoom-in-95 duration-200">
        {/* Creator Profile Avatar & Header */}
        <div className="text-center space-y-3">
          {creator?.avatar ? (
            <button
              type="button"
              onClick={() => setIsPreviewOpen(true)}
              className="group/avatar block mx-auto rounded-full focus:outline-none focus:ring-4 focus:ring-black dark:focus:ring-white transition cursor-pointer"
              title="Click to view full photo"
            >
              <img
                src={creator.avatar}
                alt={creator.username}
                className="w-28 h-28 sm:w-32 sm:h-32 rounded-full object-cover shadow-xl mx-auto ring-4 ring-neutral-100 dark:ring-neutral-900 group-hover/avatar:opacity-90 group-hover/avatar:scale-105 transition-all duration-200"
              />
            </button>
          ) : (
            <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-black dark:bg-white text-white dark:text-black flex items-center justify-center font-bold text-3xl sm:text-4xl shadow-xl mx-auto ring-4 ring-neutral-100 dark:ring-neutral-900">
              {initial}
            </div>
          )}

          {creator?.username && (
            <div className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
              @{creator.username}
            </div>
          )}

          {/* Group Badge & Name */}
          <div className="pt-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 shadow-sm">
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: group.color || "#000000" }}
              />
              <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                {group.name}
              </span>
            </div>
          </div>

          {/* Open All Action Button */}
          {links.length > 1 && (
            <div className="pt-2">
              <button
                type="button"
                onClick={handleOpenAll}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-black dark:bg-white text-white dark:text-black text-xs font-bold hover:bg-neutral-800 dark:hover:bg-neutral-200 transition cursor-pointer shadow-sm"
              >
                {allOpened ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Opened All Tabs!</span>
                  </>
                ) : (
                  <>
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open All ({links.length} links)</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Links List */}
        <div className="space-y-3">
          {links.length === 0 ? (
            <div className="p-8 text-center rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-neutral-400 dark:text-neutral-500 text-xs">
              No active links in this collection yet.
            </div>
          ) : (
            links.map((link) => {
              const redirectPath = link.redirectUrl || `/${link.username}/${link.webname}`;

              return (
                <div
                  key={link.id}
                  className="group relative flex items-center justify-between p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-black dark:hover:border-white shadow-sm hover:shadow-md transition duration-150"
                >
                  <a
                    href={redirectPath}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 min-w-0 pr-3 cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-neutral-900 dark:text-white truncate group-hover:underline">
                        {link.title || link.webname}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-neutral-400 dark:text-neutral-500 font-mono truncate mt-0.5">
                      <ArrowRight className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{link.destinationUrl}</span>
                    </div>
                  </a>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => handleCopyLink(link.id, redirectPath)}
                      title="Copy permanent link"
                      className="p-2 rounded-xl text-neutral-400 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
                    >
                      {copiedId === link.id ? (
                        <Check className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>

                    <a
                      href={redirectPath}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Open permanent link"
                      className="p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition cursor-pointer"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Footer Branding */}
      <footer className="w-full max-w-md mx-auto text-center mt-12">
        <a
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition duration-150 font-medium cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Powered by domainyourlink</span>
        </a>
      </footer>

      {/* Profile Photo Lightbox Modal */}
      {isPreviewOpen && creator?.avatar && (
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
              src={creator.avatar}
              alt={creator.username}
              className="w-72 h-72 sm:w-96 sm:h-96 rounded-full object-cover shadow-2xl ring-4 ring-white/20"
            />

            {creator.username && (
              <div className="mt-5 text-center space-y-1">
                <a
                  href={`/${creator.username}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-bold text-white hover:underline transition"
                >
                  <span>@{creator.username}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <p className="text-xs text-white/50">Click outside to close</p>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
