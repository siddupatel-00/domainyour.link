import { Employee } from "./db/schema";

// Shared in-memory store for development/offline fallback
declare global {
  // eslint-disable-next-line no-var
  var fallbackEmployeesStore: Employee[] | undefined;
}

if (!global.fallbackEmployeesStore) {
  global.fallbackEmployeesStore = [
    {
      id: 1,
      name: "Alex Vance",
      email: "alex@company.com",
      username: "alex",
      password: "password123",
      role: "Insights Viewer",
      status: "active",
      inviteToken: null,
      permissions: "[\"view_insights\"]",
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    },
  ];
}

export function getSharedEmployees(): Employee[] {
  return global.fallbackEmployeesStore!;
}

export function addSharedEmployee(emp: Employee) {
  global.fallbackEmployeesStore!.unshift(emp);
}

export function findSharedEmployeeByToken(token: string): Employee | undefined {
  return global.fallbackEmployeesStore!.find((e) => e.inviteToken === token);
}

export function findSharedEmployeeByEmailOrUser(identifier: string): Employee | undefined {
  const clean = identifier.trim().toLowerCase();
  return global.fallbackEmployeesStore!.find(
    (e) => e.email.toLowerCase() === clean || (e.username && e.username.toLowerCase() === clean)
  );
}

export function updateSharedEmployee(id: number, updates: Partial<Employee>): Employee | undefined {
  const item = global.fallbackEmployeesStore!.find((e) => e.id === id);
  if (item) {
    Object.assign(item, updates, { updatedAt: new Date() });
    return item;
  }
  return undefined;
}

export function deleteSharedEmployee(id: number): boolean {
  const idx = global.fallbackEmployeesStore!.findIndex((e) => e.id === id);
  if (idx !== -1) {
    global.fallbackEmployeesStore!.splice(idx, 1);
    return true;
  }
  return false;
}
