export type Permissions = Record<string, undefined | PermissionAccess>;
export type PermissionAccess = "none" | "read" | "write" | "admin";
