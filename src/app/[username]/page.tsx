"use client";

import { use, useEffect, useState } from "react";
import { UserProfileView } from "./components/UserProfileView";

interface UserProfilePageProps {
  params: Promise<{ username: string }>;
}

export default function UserProfilePage({ params }: UserProfilePageProps) {
  const { username } = use(params);
  const cleanUsername = username?.trim().toLowerCase() || "siddu";

  const [links, setLinks] = useState<Array<{
    id: number;
    username: string;
    webname: string;
    destinationUrl: string;
    expiresAt: Date | string | null;
    showOnProfile: boolean;
    clickCount: number;
  }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUserLinks() {
      try {
        setLoading(true);
        const res = await fetch(`/api/profile/${cleanUsername}?t=${Date.now()}`, {
          cache: "no-store",
          headers: { "Cache-Control": "no-cache" },
        });

        if (res.ok) {
          const data = await res.json();
          setLinks(data.links || []);
        } else {
          setLinks([]);
        }
      } catch {
        setLinks([]);
      } finally {
        setLoading(false);
      }
    }

    loadUserLinks();
  }, [cleanUsername]);

  if (loading && links.length === 0) {
    return (
      <main className="min-h-screen bg-white text-neutral-900 font-sans flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-neutral-200 border-t-black rounded-full animate-spin mx-auto" />
          <p className="text-xs text-neutral-400 font-medium">Loading @{cleanUsername}&apos;s profile...</p>
        </div>
      </main>
    );
  }

  return (
    <UserProfileView
      username={cleanUsername}
      links={links}
    />
  );
}
