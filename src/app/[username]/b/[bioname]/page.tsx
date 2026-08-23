"use client";

import { use, useEffect, useState } from "react";
import { Link2, ArrowRight, Clock } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

interface LinkItem {
  id: number;
  username: string;
  webname: string;
  destinationUrl: string;
  expiresAt: Date | string | null;
  showOnProfile: boolean;
  clickCount: number;
}

interface BioData {
  id: number;
  username: string;
  bioname: string;
  title: string | null;
  description: string | null;
  linkIds: string;
  expiresAt: Date | string | null;
}

interface SubBioPageProps {
  params: Promise<{ username: string; bioname: string }>;
}

export default function SubBioPage({ params }: SubBioPageProps) {
  const { username, bioname } = use(params);
  const cleanUsername = username?.trim().toLowerCase() || "user";
  const cleanBioname = bioname?.trim().toLowerCase() || "main";

  const [bio, setBio] = useState<BioData | null>(null);
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    async function loadBioAndLinks() {
      try {
        setLoading(true);

        const res = await fetch(
          `/api/public/profile?username=${encodeURIComponent(cleanUsername)}&bioname=${encodeURIComponent(cleanBioname)}&t=${Date.now()}`,
          { cache: "no-store", headers: { "Cache-Control": "no-cache" } }
        );

        if (res.ok) {
          const data = await res.json();
          setBio(data.bio || null);
          setIsExpired(Boolean(data.isExpired));
          setLinks(data.links || []);
        } else {
          setLinks([]);
        }
      } catch (err) {
        console.error("Load bio error:", err);
        setLinks([]);
      } finally {
        setLoading(false);
      }
    }

    loadBioAndLinks();
  }, [cleanUsername, cleanBioname]);

  const initial = cleanUsername.charAt(0).toUpperCase();

  if (isExpired) {
    return (
      <main className="min-h-screen bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 font-sans flex items-center justify-center p-6 transition-colors duration-200">
        <div className="text-center max-w-sm p-8 rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xl space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-black dark:text-white mx-auto">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-neutral-900 dark:text-white">This Link Has Expired</h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">This bio is no longer active.</p>
          </div>
          <a
            href={`/${cleanUsername}`}
            className="inline-block px-5 py-2.5 bg-black dark:bg-white text-white dark:text-black text-xs font-semibold rounded-xl hover:bg-neutral-800 dark:hover:bg-neutral-200 transition"
          >
            Visit Profile
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 font-sans selection:bg-black dark:selection:bg-white selection:text-white dark:selection:text-black flex flex-col justify-between py-12 px-4 sm:px-6 transition-colors duration-200">
      {/* Top Floating Theme Toggle */}
      <div className="w-full max-w-md mx-auto flex justify-end">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md mx-auto space-y-8 animate-in fade-in duration-300">
        {/* Clean Avatar & Header */}
        <div className="text-center space-y-3">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-black dark:bg-white text-white dark:text-black flex items-center justify-center font-bold text-2xl sm:text-3xl shadow-xl mx-auto ring-4 ring-neutral-100 dark:ring-neutral-900">
            {initial}
          </div>

          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-white tracking-tight">
              {bio?.title || `@${cleanUsername}`}
            </h1>
            {bio?.description && (
              <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 max-w-xs mx-auto leading-relaxed">
                {bio.description}
              </p>
            )}
            <div className="text-xs font-mono text-neutral-400 dark:text-neutral-500">
              @{cleanUsername}/{cleanBioname}
            </div>
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
                No links attached to this bio.
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
                        /{link.webname}
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
    </main>
  );
}
