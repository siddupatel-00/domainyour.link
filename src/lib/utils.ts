import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Slugify string (lowercase, alphanumeric and hyphens/underscores only)
export function sanitizeSlug(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

// Slugify multi-segment paths (preserves forward slashes for sub-links)
export function sanitizePathSlug(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .split("/")
    .map((segment) => sanitizeSlug(segment))
    .filter(Boolean)
    .join("/");
}

// Validate URL format
export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}
