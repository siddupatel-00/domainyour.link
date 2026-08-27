import { LinkGroup } from "./db/schema";

// Shared in-memory store for link groups fallback
declare global {
  // eslint-disable-next-line no-var
  var fallbackLinkGroupsStore: LinkGroup[] | undefined;
}

if (!global.fallbackLinkGroupsStore) {
  global.fallbackLinkGroupsStore = [];
}

export function getSharedLinkGroups(username: string): LinkGroup[] {
  const clean = username.trim().toLowerCase();
  return (global.fallbackLinkGroupsStore || []).filter(
    (g) => g.username.toLowerCase() === clean
  );
}

export function addSharedLinkGroup(group: LinkGroup) {
  if (!global.fallbackLinkGroupsStore) global.fallbackLinkGroupsStore = [];
  global.fallbackLinkGroupsStore.push(group);
}

export function updateSharedLinkGroup(
  id: number,
  updates: Partial<LinkGroup>
): LinkGroup | undefined {
  if (!global.fallbackLinkGroupsStore) return undefined;
  const item = global.fallbackLinkGroupsStore.find((g) => g.id === id);
  if (item) {
    Object.assign(item, updates, { updatedAt: new Date() });
    return item;
  }
  return undefined;
}

export function deleteSharedLinkGroup(id: number): boolean {
  if (!global.fallbackLinkGroupsStore) return false;
  const idx = global.fallbackLinkGroupsStore.findIndex((g) => g.id === id);
  if (idx !== -1) {
    global.fallbackLinkGroupsStore.splice(idx, 1);
    return true;
  }
  return false;
}

export function reorderSharedLinkGroups(username: string, orderedIds: number[]): void {
  if (!global.fallbackLinkGroupsStore) return;
  const clean = username.trim().toLowerCase();
  const userGroups = global.fallbackLinkGroupsStore.filter(
    (g) => g.username.toLowerCase() === clean
  );
  const otherGroups = global.fallbackLinkGroupsStore.filter(
    (g) => g.username.toLowerCase() !== clean
  );

  const groupMap = new Map<number, LinkGroup>();
  userGroups.forEach((g) => groupMap.set(g.id, g));

  const reordered: LinkGroup[] = [];
  orderedIds.forEach((id) => {
    const found = groupMap.get(id);
    if (found) {
      reordered.push(found);
      groupMap.delete(id);
    }
  });

  // Append any groups not in orderedIds
  groupMap.forEach((g) => reordered.push(g));

  global.fallbackLinkGroupsStore = [...otherGroups, ...reordered];
}

export function findSharedGroupByShareCode(shareCode: string): LinkGroup | undefined {
  if (!global.fallbackLinkGroupsStore) return undefined;
  const clean = shareCode.trim().toLowerCase();
  return global.fallbackLinkGroupsStore.find(
    (g) => (g.shareCode || "").toLowerCase() === clean
  );
}
