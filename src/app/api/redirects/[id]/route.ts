import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { redirects } from "@/lib/db/schema";
import { isAuthenticated } from "@/lib/auth";
import { isValidUrl, sanitizePathSlug } from "@/lib/utils";
import { eq } from "drizzle-orm";
import { getLocalFallbackLinks, calculateExpiration } from "../route";
import {
  isTursoEnabled,
  tursoUpdateRedirect,
  tursoDeleteRedirect,
} from "@/lib/tursoDb";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const noCacheHeaders = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

// PATCH /api/redirects/[id] - Update destination URL, expiration, or showOnProfile
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authed = await isAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: noCacheHeaders });
  }

  try {
    const { id } = await params;
    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400, headers: noCacheHeaders });
    }

    const body = await request.json();
    const { destinationUrl, duration, expiresAt, showOnProfile, webname } = body;

    const updateFields: {
      destinationUrl?: string;
      expiresAt?: Date | null;
      showOnProfile?: boolean;
      webname?: string;
      updatedAt: Date;
    } = {
      updatedAt: new Date(),
    };

    if (webname !== undefined) {
      const cleanW = sanitizePathSlug(webname);
      if (cleanW) {
        updateFields.webname = cleanW;
      }
    }

    if (destinationUrl !== undefined) {
      let formattedDestination = destinationUrl.trim();
      if (
        !formattedDestination.startsWith("http://") &&
        !formattedDestination.startsWith("https://")
      ) {
        formattedDestination = `https://${formattedDestination}`;
      }

      if (!isValidUrl(formattedDestination)) {
        return NextResponse.json(
          { error: "Please enter a valid destination URL" },
          { status: 400, headers: noCacheHeaders }
        );
      }
      updateFields.destinationUrl = formattedDestination;
    }

    if (duration !== undefined || expiresAt !== undefined) {
      updateFields.expiresAt = expiresAt !== undefined
        ? (expiresAt ? new Date(expiresAt) : null)
        : calculateExpiration(duration);
    }

    if (showOnProfile !== undefined) {
      updateFields.showOnProfile = Boolean(showOnProfile);
    }

    // 1. Try Turso Database
    if (isTursoEnabled) {
      try {
        const updated = await tursoUpdateRedirect(numericId, updateFields);
        if (updated) {
          return NextResponse.json({ success: true, redirect: updated }, { headers: noCacheHeaders });
        }
      } catch (err) {
        console.error("Turso update redirect error:", err);
      }
    }

    // 2. Try PostgreSQL / Neon Database
    if (db) {
      try {
        const [updatedRecord] = await db
          .update(redirects)
          .set(updateFields)
          .where(eq(redirects.id, numericId))
          .returning();

        if (updatedRecord) {
          return NextResponse.json({ success: true, redirect: updatedRecord }, { headers: noCacheHeaders });
        }
      } catch {}
    }

    // 3. Fallback in-memory store
    const fallbackList = getLocalFallbackLinks();
    const item = fallbackList.find((l) => l.id === numericId);
    if (item) {
      if (updateFields.destinationUrl !== undefined) item.destinationUrl = updateFields.destinationUrl;
      if (updateFields.expiresAt !== undefined) item.expiresAt = updateFields.expiresAt;
      if (updateFields.showOnProfile !== undefined) item.showOnProfile = updateFields.showOnProfile;
      if (updateFields.webname !== undefined) item.webname = updateFields.webname;
      item.updatedAt = new Date();
      return NextResponse.json({ success: true, redirect: item }, { headers: noCacheHeaders });
    }

    return NextResponse.json(
      { error: "Link not found" },
      { status: 404, headers: noCacheHeaders }
    );
  } catch (error) {
    console.error("Update redirect error:", error);
    return NextResponse.json(
      { error: "Failed to update link" },
      { status: 500, headers: noCacheHeaders }
    );
  }
}

// DELETE /api/redirects/[id] - Remove redirect
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authed = await isAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: noCacheHeaders });
  }

  try {
    const { id } = await params;
    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400, headers: noCacheHeaders });
    }

    // 1. Try Turso Database
    if (isTursoEnabled) {
      try {
        const ok = await tursoDeleteRedirect(numericId);
        if (ok) {
          return NextResponse.json({ success: true, message: "Link deleted" }, { headers: noCacheHeaders });
        }
      } catch (err) {
        console.error("Turso delete redirect error:", err);
      }
    }

    // 2. Try PostgreSQL / Neon Database
    if (db) {
      try {
        const [deletedRecord] = await db
          .delete(redirects)
          .where(eq(redirects.id, numericId))
          .returning();

        if (deletedRecord) {
          return NextResponse.json({ success: true, message: "Link deleted" }, { headers: noCacheHeaders });
        }
      } catch {}
    }

    // 3. Fallback in-memory store
    const fallbackList = getLocalFallbackLinks();
    const index = fallbackList.findIndex((l) => l.id === numericId);
    if (index !== -1) {
      fallbackList.splice(index, 1);
      return NextResponse.json({ success: true, message: "Link deleted" }, { headers: noCacheHeaders });
    }

    return NextResponse.json(
      { error: "Link not found" },
      { status: 404, headers: noCacheHeaders }
    );
  } catch (error) {
    console.error("Delete redirect error:", error);
    return NextResponse.json(
      { error: "Failed to delete link" },
      { status: 500, headers: noCacheHeaders }
    );
  }
}
