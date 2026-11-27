export interface IStorage {
  // Only create role
  addRole(role: string): string | Promise<string>;

  //   Add permissions to the existed role.
  // If role not exists, create and then add permissions
  addMPermissions(
    role: string,
    permissions: string[]
  ): string | Promise<string>;

  //   Add permission to the existed role.
  // If role not exists, create and then add permission
  addPermission(role: string, permission: string): string | Promise<string>;

  hasRole(role: string): boolean | Promise<boolean>;
  getPermissions(
    role: string
  ): string[] | undefined | Promise<string[]>;
  hasPermission(role: string, permission: string): boolean | Promise<boolean>;
  // Performs AND Operation
  hasBulkPermissions(
    role: string,
    permissions: string[]
  ): boolean | Promise<boolean>;
  getHasPermissions(
    role: string,
    permissions: string[],
    output: "number" | "string"
  ): string[] | Promise<string[] | number[]> | number[];
  removePermissions(
    role: string,
    permissions: string[]
  ): Promise<string> | string;
  deleteRole(role: string): Promise<string> | string;
  getRoles(): string[] | Promise<string[] | string>;
}
