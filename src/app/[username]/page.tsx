import { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { redirects } from "@/lib/db/schema";
import { and, eq, desc } from "drizzle-orm";
import { getLocalFallbackLinks } from "@/app/api/redirects/route";
import { UserProfileView } from "./components/UserProfileView";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface UserProfilePageProps {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({
  params,
}: UserProfilePageProps): Promise<Metadata> {
  const { username } = await params;
  const cleanUsername = username?.trim().toLowerCase() || "User";
  return {
    title: `@${cleanUsername} — PermanentLink`,
    description: `All permanent and shared links for @${cleanUsername}`,
  };
}

export default async function UserProfilePage({ params }: UserProfilePageProps) {
  const { username } = await params;

  if (!username) {
    notFound();
  }

  const cleanUsername = username.trim().toLowerCase();
  let userLinks: Array<{
    id: number;
    username: string;
    webname: string;
    destinationUrl: string;
    expiresAt: Date | string | null;
    showOnProfile: boolean;
    clickCount: number;
  }> = [];

  try {
    const records = await db
      .select({
        id: redirects.id,
        username: redirects.username,
        webname: redirects.webname,
        destinationUrl: redirects.destinationUrl,
        expiresAt: redirects.expiresAt,
        showOnProfile: redirects.showOnProfile,
        clickCount: redirects.clickCount,
      })
      .from(redirects)
      .where(
        and(
          eq(redirects.username, cleanUsername),
          eq(redirects.showOnProfile, true)
        )
      )
      .orderBy(desc(redirects.createdAt));

    userLinks = records;
  } catch {
    // Fallback store
    const fallbackList = getLocalFallbackLinks();
    userLinks = fallbackList.filter(
      (l) => l.username === cleanUsername && l.showOnProfile !== false
    );
  }

  // Filter out any expired links
  const activeLinks = userLinks.filter((l) => {
    if (!l.expiresAt) return true;
    return new Date(l.expiresAt).getTime() > Date.now();
  });

  return (
    <UserProfileView
      username={cleanUsername}
      links={activeLinks}
    />
  );
}
