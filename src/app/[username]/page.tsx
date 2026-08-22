"use client";

import { use, useEffect, useState } from "react";
import { Link2, ArrowRight } from "lucide-react";

interface LinkItem {
  id: number;
  username: string;
  webname: string;
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUserLinks() {
      try {
        setLoading(true);
        const res = await fetch(`/api/redirects?t=${Date.now()}`, {
          cache: "no-store",
          headers: { "Cache-Control": "no-cache" },
        });

        if (res.ok) {
          const data = await res.json();
          const allRedirects: LinkItem[] = data.redirects || [];
          const userActiveVisible = allRedirects.filter((r) => {
            const isUser = r.username.toLowerCase() === cleanUsername;
            const isNotExpired = !r.expiresAt || new Date(r.expiresAt).getTime() > Date.now();
            const isVisible = r.showOnProfile !== false;
            return isUser && isNotExpired && isVisible;
          });
          setLinks(userActiveVisible);
        }
      } catch (err) {
        console.error("Load user links error:", err);
      } finally {
        setLoading(false);
      }
    }

    loadUserLinks();
  }, [cleanUsername]);

  const initial = cleanUsername.charAt(0).toUpperCase();

  return (
    <main className="min-h-screen bg-white text-neutral-900 font-sans selection:bg-black selection:text-white flex flex-col justify-between py-12 px-4 sm:px-6">
      <div className="w-full max-w-md mx-auto space-y-8 animate-in fade-in duration-300">
        {/* Clean Avatar Header */}
        <div className="text-center space-y-3">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-black text-white flex items-center justify-center font-bold text-2xl sm:text-3xl shadow-xl mx-auto ring-4 ring-neutral-100">
            {initial}
          </div>

          <div>
            <h1 className="text-lg sm:text-xl font-bold text-neutral-900 tracking-tight">
              @{cleanUsername}
            </h1>
          </div>
        </div>

        {/* Clean Links List */}
        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-12 text-neutral-400 text-xs font-medium">
              Loading links...
            </div>
          ) : links.length === 0 ? (
            <div className="text-center py-16 px-4 rounded-3xl border border-neutral-100 bg-neutral-50/50 space-y-2">
              <Link2 className="w-8 h-8 text-neutral-400 mx-auto stroke-[1.8]" />
              <p className="text-xs text-neutral-500 max-w-xs mx-auto">
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
                  className="group flex items-center justify-between p-4 sm:p-5 rounded-2xl border border-neutral-200 bg-white hover:border-black hover:shadow-md transition-all duration-200"
                >
                  <div className="min-w-0 flex items-center gap-3.5">
                    <div className="w-9 h-9 rounded-xl bg-neutral-100 text-black flex items-center justify-center font-bold flex-shrink-0 group-hover:bg-black group-hover:text-white transition">
                      <Link2 className="w-4 h-4 stroke-[2]" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-sm font-bold text-neutral-900 group-hover:text-black transition truncate block">
                        /{link.webname}
                      </span>
                    </div>
                  </div>

                  <div className="w-8 h-8 rounded-xl bg-neutral-50 flex items-center justify-center text-neutral-400 group-hover:text-black group-hover:bg-neutral-100 transition flex-shrink-0">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </a>
              );
            })
          )}
        </div>
      </div>

      {/* Footer Branding */}
      <footer className="mt-12 text-center text-xs text-neutral-400">
        <a
          href="/"
          className="inline-flex items-center gap-1.5 font-semibold text-neutral-600 hover:text-black transition text-[11px]"
        >
          <Link2 className="w-3 h-3 text-black" />
          <span>PermanentLink</span>
        </a>
      </footer>
    </main>
  );
}
