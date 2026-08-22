import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { employees, Employee } from "@/lib/db/schema";
import { isCeoAuthenticated } from "@/lib/auth";
import { desc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

// In-memory fallback store for local development
const localFallbackEmployees: Employee[] = [
  {
    id: 1,
    name: "Alex Vance",
    email: "alex@company.com",
    role: "Support Moderator",
    status: "active",
    permissions: "[\"view_links\", \"manage_support\"]",
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
  },
  {
    id: 2,
    name: "Jordan Lee",
    email: "jordan@company.com",
    role: "Link Manager",
    status: "active",
    permissions: "[\"view_links\", \"edit_links\", \"manage_redirects\"]",
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
  },
];
let nextEmployeeId = 3;

export function getLocalFallbackEmployees() {
  return localFallbackEmployees;
}

const noCacheHeaders = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

// GET /api/ceo/employees - List employees
export async function GET() {
  const authed = await isCeoAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: "Unauthorized: CEO Master Access Required" }, { status: 401, headers: noCacheHeaders });
  }

  try {
    const list = await db.select().from(employees).orderBy(desc(employees.createdAt));
    return NextResponse.json({ employees: list }, { headers: noCacheHeaders });
  } catch (error) {
    console.warn("Using local fallback for employees:", error);
    return NextResponse.json({ employees: localFallbackEmployees }, { headers: noCacheHeaders });
  }
}

// POST /api/ceo/employees - Add new employee
export async function POST(request: NextRequest) {
  const authed = await isCeoAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: "Unauthorized: CEO Master Access Required" }, { status: 401, headers: noCacheHeaders });
  }

  try {
    const body = await request.json();
    const { name, email, role, permissions } = body;

    if (!name || !email) {
      return NextResponse.json(
        { error: "Name and email are required" },
        { status: 400, headers: noCacheHeaders }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();
    const employeeRole = role?.trim() || "Support Moderator";
    const permissionsJson = Array.isArray(permissions)
      ? JSON.stringify(permissions)
      : typeof permissions === "string"
      ? permissions
      : JSON.stringify(["view_links", "manage_support"]);

    try {
      const existing = await db
        .select({ id: employees.id })
        .from(employees)
        .where(eq(employees.email, cleanEmail))
        .limit(1);

      if (existing.length > 0) {
        return NextResponse.json(
          { error: `An employee with email "${cleanEmail}" already exists.` },
          { status: 409, headers: noCacheHeaders }
        );
      }

      const [newRecord] = await db
        .insert(employees)
        .values({
          name: cleanName,
          email: cleanEmail,
          role: employeeRole,
          status: "active",
          permissions: permissionsJson,
        })
        .returning();

      return NextResponse.json({ success: true, employee: newRecord }, { status: 201, headers: noCacheHeaders });
    } catch {
      // Fallback
      const exists = localFallbackEmployees.some((e) => e.email === cleanEmail);
      if (exists) {
        return NextResponse.json(
          { error: `An employee with email "${cleanEmail}" already exists.` },
          { status: 409, headers: noCacheHeaders }
        );
      }

      const newRecord: Employee = {
        id: nextEmployeeId++,
        name: cleanName,
        email: cleanEmail,
        role: employeeRole,
        status: "active",
        permissions: permissionsJson,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      localFallbackEmployees.unshift(newRecord);
      return NextResponse.json({ success: true, employee: newRecord }, { status: 201, headers: noCacheHeaders });
    }
  } catch (error) {
    console.error("Create employee error:", error);
    return NextResponse.json(
      { error: "Failed to add employee" },
      { status: 500, headers: noCacheHeaders }
    );
  }
}
