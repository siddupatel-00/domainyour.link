import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { linkGroups, LinkGroup } from "@/lib/db/schema";
import { isAuthenticated, getSessionUser } from "@/lib/auth";
import { eq, desc } from "drizzle-orm";
import {
  isTursoEnabled,
  tursoGetLinkGroups,
  tursoCreateLinkGroup,
  tursoReorderLinkGroups,
} from "@/lib/tursoDb";
import {
  getSharedLinkGroups,
  addSharedLinkGroup,
  reorderSharedLinkGroups,
} from "@/lib/groupStore";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const noCacheHeaders = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

let nextGroupId = 1;

// GET /api/groups - List all groups for authenticated user
export async function GET() {
  const authed = await isAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: noCacheHeaders });
  }

  const user = await getSessionUser();
  const username = user?.username || "creator";

  try {
    let groups: LinkGroup[] = [];

    // 1. Try Turso
    if (isTursoEnabled) {
      try {
        groups = await tursoGetLinkGroups(username);
      } catch (err) {
        console.warn("Turso get groups error:", err);
      }
    }

    // 2. Try PostgreSQL / Neon
    if (groups.length === 0 && db) {
      try {
        groups = await db
          .select()
          .from(linkGroups)
          .where(eq(linkGroups.username, username))
          .orderBy(desc(linkGroups.createdAt));
      } catch {}
    }

    // 3. Fallback in-memory
    if (groups.length === 0) {
      groups = getSharedLinkGroups(username);
    }

    return NextResponse.json({ groups }, { headers: noCacheHeaders });
  } catch (error) {
    console.error("Get groups error:", error);
    return NextResponse.json({ error: "Failed to fetch groups" }, { status: 500, headers: noCacheHeaders });
  }
}

// POST /api/groups - Create a new link group
export async function POST(request: NextRequest) {
  const authed = await isAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: noCacheHeaders });
  }

  const user = await getSessionUser();
  const username = user?.username || "creator";

  try {
    const body = await request.json();
    const { name, color, linkIds } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Group name is required" }, { status: 400, headers: noCacheHeaders });
    }

    const cleanName = name.trim();
    const cleanColor = color?.trim() || "#000000";
    const formattedLinkIds = Array.isArray(linkIds)
      ? JSON.stringify(linkIds)
      : typeof linkIds === "string"
      ? linkIds
      : "[]";

    // 1. Try Turso
    if (isTursoEnabled) {
      try {
        const created = await tursoCreateLinkGroup({
          username,
          name: cleanName,
          color: cleanColor,
          linkIds: formattedLinkIds,
        });
        addSharedLinkGroup(created);
        return NextResponse.json({ success: true, group: created }, { status: 201, headers: noCacheHeaders });
      } catch (err) {
        console.warn("Turso create group error:", err);
      }
    }

    // 2. Try PostgreSQL / Neon
    if (db) {
      try {
        const [createdRecord] = await db
          .insert(linkGroups)
          .values({
            username,
            name: cleanName,
            color: cleanColor,
            linkIds: formattedLinkIds,
          })
          .returning();

        if (createdRecord) {
          addSharedLinkGroup(createdRecord);
          return NextResponse.json({ success: true, group: createdRecord }, { status: 201, headers: noCacheHeaders });
        }
      } catch {}
    }

    // 3. Fallback in-memory
    const fallbackGroup: LinkGroup = {
      id: nextGroupId++,
      username,
      name: cleanName,
      color: cleanColor,
      linkIds: formattedLinkIds,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    addSharedLinkGroup(fallbackGroup);

    return NextResponse.json({ success: true, group: fallbackGroup }, { status: 201, headers: noCacheHeaders });
  } catch (error) {
    console.error("Create group error:", error);
    return NextResponse.json({ error: "Failed to create group" }, { status: 500, headers: noCacheHeaders });
  }
}

// PUT /api/groups - Reorder groups
export async function PUT(request: NextRequest) {
  const authed = await isAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: noCacheHeaders });
  }

  const user = await getSessionUser();
  const username = user?.username || "creator";

  try {
    const body = await request.json();
    const { orderedIds } = body;

    if (!Array.isArray(orderedIds)) {
      return NextResponse.json({ error: "Invalid orderedIds array" }, { status: 400, headers: noCacheHeaders });
    }

    const numericIds = orderedIds.map(Number).filter((id) => !isNaN(id));

    // 1. Try Turso
    if (isTursoEnabled) {
      try {
        await tursoReorderLinkGroups(username, numericIds);
      } catch (err) {
        console.warn("Turso reorder groups error:", err);
      }
    }

    // 2. Reorder in-memory fallback
    reorderSharedLinkGroups(username, numericIds);

    return NextResponse.json(
      { success: true, message: "Groups reordered successfully" },
      { headers: noCacheHeaders }
    );
  } catch (error) {
    console.error("Reorder groups error:", error);
    return NextResponse.json({ error: "Failed to reorder groups" }, { status: 500, headers: noCacheHeaders });
  }
}
