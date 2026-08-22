"use client";

import { use, useEffect, useState } from "react";
import { Link2, Copy, Check, ArrowRight, Share2, Sparkles, Clock, AlertCircle } from "lucide-react";

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
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [copiedProfile, setCopiedProfile] = useState(false);

  useEffect(() => {
    async function loadBioAndLinks() {
      try {
        setLoading(true);

        // Fetch all bios and redirects
        const [biosRes, redirectsRes] = await Promise.all([
          fetch(`/api/bios?t=${Date.now()}`, { cache: "no-store", headers: { "Cache-Control": "no-cache" } }),
          fetch(`/api/redirects?t=${Date.now()}`, { cache: "no-store", headers: { "Cache-Control": "no-cache" } }),
        ]);

        let targetBio: BioData | null = null;
        if (biosRes.ok) {
          const biosData = await biosRes.json();
          const allBios: BioData[] = biosData.bios || [];
          targetBio = allBios.find(
            (b) => b.username.toLowerCase() === cleanUsername && b.bioname.toLowerCase() === cleanBioname
          ) || null;
        }

        let allRedirects: LinkItem[] = [];
        if (redirectsRes.ok) {
          const redData = await redirectsRes.json();
          allRedirects = redData.redirects || [];
        }

        if (targetBio) {
          setBio(targetBio);

          // Check if bio is expired
          if (targetBio.expiresAt && new Date(targetBio.expiresAt).getTime() <= Date.now()) {
            setIsExpired(true);
            return;
          }

          let selectedIds: number[] = [];
          try {
            selectedIds = JSON.parse(targetBio.linkIds);
          } catch {}

          const matchedLinks = allRedirects.filter((r) => {
            const isUser = r.username.toLowerCase() === cleanUsername;
            const isNotExpired = !r.expiresAt || new Date(r.expiresAt).getTime() > Date.now();
            const isInBio = selectedIds.length === 0 || selectedIds.includes(r.id);
            return isUser && isNotExpired && isInBio;
          });

          setLinks(matchedLinks);
        } else {
          // If not found as custom bio, show all user active links
          const userLinks = allRedirects.filter(
            (r) => r.username.toLowerCase() === cleanUsername && (!r.expiresAt || new Date(r.expiresAt).getTime() > Date.now())
          );
          setLinks(userLinks);
        }
      } catch (err) {
        console.error("Load bio error:", err);
      } finally {
        setLoading(false);
      }
    }

    loadBioAndLinks();
  }, [cleanUsername, cleanBioname]);

  const initial = cleanUsername.charAt(0).toUpperCase();

  const handleCopyLink = (e: React.MouseEvent, id: number, webname: string) => {
    e.stopPropagation();
    e.preventDefault();
    const url = `${window.location.origin}/${cleanUsername}/${webname}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleShareProfile = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({
        title: `${bio?.title || `@${cleanUsername}`} • PermanentLink`,
        url,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url);
      setCopiedProfile(true);
      setTimeout(() => setCopiedProfile(false), 2000);
    }
  };

  if (isExpired) {
    return (
      <main className="min-h-screen bg-white text-neutral-900 font-sans flex items-center justify-center p-6">
        <div className="text-center max-w-sm p-8 rounded-3xl border border-neutral-200 bg-white shadow-xl space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-neutral-100 flex items-center justify-center text-black mx-auto">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-neutral-900">This Bio Page Has Expired</h2>
            <p className="text-xs text-neutral-500 mt-1">This temporary bio is no longer active.</p>
          </div>
          <a
            href={`/${cleanUsername}`}
            className="inline-block px-5 py-2.5 bg-black text-white text-xs font-semibold rounded-xl hover:bg-neutral-800 transition"
          >
            Visit Main Profile
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white text-neutral-900 font-sans selection:bg-black selection:text-white flex flex-col justify-between py-12 px-4 sm:px-6">
      <div className="w-full max-w-md mx-auto space-y-8 animate-in fade-in duration-300">
        {/* Profile Header */}
        <div className="text-center space-y-4">
          <div className="relative inline-block">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-black text-white flex items-center justify-center font-bold text-2xl sm:text-3xl shadow-xl mx-auto ring-4 ring-neutral-100">
              {initial}
            </div>
            <div className="absolute -bottom-1 -right-1 bg-white p-1 rounded-full shadow border border-neutral-100">
              <Sparkles className="w-4 h-4 text-black" />
            </div>
          </div>

          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-100 border border-neutral-200 text-xs font-semibold text-neutral-800 mb-2 font-mono">
              <span>/{cleanUsername}</span>
              <span className="text-neutral-400">/</span>
              <span className="text-black font-bold">{cleanBioname}</span>
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 tracking-tight">
              {bio?.title || `@${cleanUsername}`}
            </h1>
            {bio?.description && (
              <p className="text-xs text-neutral-600 mt-1 max-w-xs mx-auto">
                {bio.description}
              </p>
            )}
          </div>

          {/* Share Profile Button */}
          <div className="flex items-center justify-center gap-2 pt-1">
            <button
              onClick={handleShareProfile}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-neutral-200 bg-neutral-50 hover:bg-neutral-100 hover:border-neutral-300 text-xs font-semibold text-neutral-700 transition cursor-pointer"
            >
              {copiedProfile ? (
                <>
                  <Check className="w-3.5 h-3.5 text-black" />
                  <span>Bio Link Copied!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5 text-neutral-600" />
                  <span>Share Bio Link</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Links List */}
        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-12 text-neutral-400 text-xs font-medium">
              Loading links...
            </div>
          ) : links.length === 0 ? (
            <div className="text-center py-16 px-4 rounded-3xl border border-neutral-100 bg-neutral-50/50 space-y-2">
              <Link2 className="w-8 h-8 text-neutral-400 mx-auto stroke-[1.8]" />
              <h3 className="text-sm font-bold text-neutral-800">No links in this bio</h3>
              <p className="text-xs text-neutral-500 max-w-xs mx-auto">
                No active links have been assigned to this bio page yet.
              </p>
            </div>
          ) : (
            links.map((link) => {
              const directRedirectUrl = `/${cleanUsername}/${link.webname}`;
              const isCopied = copiedId === link.id;

              return (
                <a
                  key={link.id}
                  href={directRedirectUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block p-4 sm:p-5 rounded-2xl border border-neutral-200 bg-white hover:border-black hover:shadow-md transition-all duration-200 relative"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-neutral-100 text-black flex items-center justify-center font-bold flex-shrink-0 group-hover:bg-black group-hover:text-white transition">
                        <Link2 className="w-4 h-4 stroke-[2]" />
                      </div>
                      <div className="min-w-0">
                        <h2 className="text-sm font-bold text-neutral-900 group-hover:text-black transition truncate">
                          /{link.webname}
                        </h2>
                        <div className="flex items-center gap-1 text-[11px] text-neutral-400 truncate mt-0.5 font-mono">
                          <span className="truncate max-w-[200px] sm:max-w-xs">
                            {link.destinationUrl}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions: Copy & Open */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        type="button"
                        onClick={(e) => handleCopyLink(e, link.id, link.webname)}
                        title="Copy direct link"
                        className="p-2 rounded-xl text-neutral-400 hover:text-black hover:bg-neutral-100 transition"
                      >
                        {isCopied ? (
                          <Check className="w-4 h-4 text-black" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>

                      <div className="w-8 h-8 rounded-xl bg-neutral-50 flex items-center justify-center text-neutral-400 group-hover:text-black group-hover:bg-neutral-100 transition">
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </a>
              );
            })
          )}
        </div>
      </div>

      {/* Footer Branding */}
      <footer className="mt-12 text-center text-xs text-neutral-400 space-y-2">
        <a
          href="/"
          className="inline-flex items-center gap-1.5 font-semibold text-neutral-700 hover:text-black transition"
        >
          <Link2 className="w-3.5 h-3.5 text-black" />
          <span>PermanentLink</span>
        </a>
        <p className="text-[11px] text-neutral-400">
          Fast, permanent & temporary link routing
        </p>
      </footer>
    </main>
  );
}
