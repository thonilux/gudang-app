export type AuthPermission = string;

export type AuthRole = {
  key: string;
  name: string;
  description: string | null;
};

export type AuthUser = {
  id: string;
  name: string;
  email: string;
};

export type AuthContext = {
  user: AuthUser;
  roles: AuthRole[];
  permissions: string[];
};

export function hasPermission(context: AuthContext | null, permission: string): boolean {
  if (!context) {
    return false;
  }

  return context.permissions.includes(permission) || context.permissions.includes("*");
}

export function isAdmin(context: AuthContext | null): boolean {
  return Boolean(context?.roles.some((role) => role.key === "admin"));
}

