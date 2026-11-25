import { MESSAGE } from "../constant";
import { RbacDataProvider, type PermissionsType } from "../data-provider";
import type { IStorage } from "../interfaces";
import type { RedisClientType } from "../type";

export class LocalStorage extends RbacDataProvider implements IStorage {
  addRole(role: string): string {
    if (!this.access?.get(role)) {
      this.access?.set(role, {
        can: new Set(["none"]),
      });

      return MESSAGE.success;
    }
    return MESSAGE.nochange;
  }

  addMPermissions(role: string, permissions: string[]): string {
    const existed_role = this.access?.get(role);
    if (!existed_role) {
      this.addRole(role);
    }
    for (const permission of permissions) {
      this.access?.get(role)!.can.add(permission);
    }
    return MESSAGE.success;
  }

  addPermission(role: string, permission: string): string {
    const existed_role = this.access?.get(role);
    if (!existed_role) {
      this.addRole(role);
    }
    if (existed_role?.can.has(permission)) return MESSAGE.nochange;
    existed_role?.can.add(permission);
    return MESSAGE.success;
  }

  hasRole(role: string): boolean {
    return this.access?.has(role) ?? false;
  }

  getPermissions(role: string): string[] | Set<string> | undefined {
    return this.access?.get(role)?.can ?? undefined;
  }

  hasPermission(role: string, permission: string): boolean {
    return this.access?.get(role)?.can.has(permission) ?? false;
  }

  // Performs AND Operation
  hasBulkPermissions(role: string, permissions: string[]): boolean {
    let is_has_permission: boolean | null = null;
    for (const permission of permissions) {
      is_has_permission = this.access?.get(role)?.can.has(permission) ?? false;
      if (is_has_permission === false) {
        break;
      }
    }
    return is_has_permission ?? false;
  }

  getHasPermissions(
    role: string,
    permissions: string[],
    output: "number" | "string" = "string",
  ): string[] | number[] {
    const arr_num: number[] = [];
    const arr_str: string[] = [];

    for (const permission of permissions) {
      const hasPermission: boolean =
        this.access?.get(role)?.can.has(permission) ?? false;

      if (output == "number") arr_num.push(hasPermission ? 1 : 0);
      if (output == "string") hasPermission && arr_str.push(permission);
    }

    if (output == "number") return arr_num;
    if (output == "string") return arr_str;
    return [];
  }

  async loadFromRedis(
    redis: RedisClientType,
    access_key: string,
  ): Promise<string> {
    const data = await redis.scan("0", {
      MATCH: `${access_key}*`,
      TYPE: "set",
    });
    if (!data) return MESSAGE.failed;

    const roles = data.keys;
    if (!roles.length) return MESSAGE.failed;

    const multi = redis.multi();
    for (const role of roles) {
      multi.sMembers(role);
    }
    const merged_permissions = await multi.exec();

    for (let i = 0; i < merged_permissions.length; i++) {
      const role_without_access_key = String(roles[i]).replace(access_key, "");
      this.addRole(role_without_access_key);
      this.addMPermissions(
        role_without_access_key,
        merged_permissions[i] as unknown as string[],
      );
    }
    return MESSAGE.success;
  }

  deleteRole(role: string): string {
    const res = this.access?.delete(role);
    if (res) return MESSAGE.success;
    else return MESSAGE.nochange;
  }

  removePermissions(role: string, permissions: string[]): string {
    let num_of_deletes = 0;
    for (const permission of permissions) {
      const res = this.access?.get(role)?.can.delete(permission);
      if (res) {
        num_of_deletes++;
      }
    }

    if (num_of_deletes > 0) return MESSAGE.success;
    else return MESSAGE.nochange;
  }
}
