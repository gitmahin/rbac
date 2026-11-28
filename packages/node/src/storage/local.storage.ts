import { MESSAGE } from "@rbac/constants";
import { RbacDataProvider } from "@/data-provider";
import type { IStorage } from "@rbac/types";
import type { RedisClientType } from "@/type";

export class LocalStorage extends RbacDataProvider implements IStorage {
  addRole(role: string): string {
    if (role == "") return MESSAGE.failed;
    if (!this.access.has(role)) {
      this.access.set(role, {
        can: new Set(["none"]),
      });

      return MESSAGE.success;
    }
    return MESSAGE.nochange;
  }

  addMPermissions(role: string, permissions: string[]): string {
    if (role == "" || !permissions.length) return MESSAGE.failed;
    const existed_role = this.access.has(role);
    if (!existed_role) {
      this.addRole(role);
    }
    for (const permission of permissions) {
      if (permission == "") return MESSAGE.failed;
      this.access.get(role)!.can.add(permission);
    }
    return MESSAGE.success;
  }

  addPermission(role: string, permission: string): string {
    if (role == "" || permission == "") return MESSAGE.failed;
    const existed_role = this.access.has(role);
    if (!existed_role) {
      this.addRole(role);
    }
    if (this.access.get(role)?.can.has(permission)) return MESSAGE.nochange;
    this.access.get(role)?.can.add(permission);
    return MESSAGE.success;
  }

  hasRole(role: string): boolean {
    return this.access.has(role) ?? false;
  }

  getPermissions(role: string): string[] | undefined {
    if (!this.access || role == "") return [];
    return [
      ...(this.access.get(role)?.can.values() ?? []),
    ] as unknown as string[];
  }

  hasPermission(role: string, permission: string): boolean {
    return this.access.get(role)?.can.has(permission) ?? false;
  }

  hasBulkPermissions(role: string, permissions: string[]): boolean {
    if (role == "" || !permissions.length) return false;
    let is_has_permission: boolean | null = null;
    for (const permission of permissions) {
      is_has_permission = this.access.get(role)?.can.has(permission) ?? false;
      if (is_has_permission === false) {
        break;
      }
    }
    return is_has_permission ?? false;
  }

  getHasPermissions(
    role: string,
    permissions: string[],
    output: "number" | "string" = "string"
  ): string[] | number[] {
    if (role == "" || !permissions.length) return [];
    const arr_num: number[] = [];
    const arr_str: string[] = [];

    if (output == "string" && !this.access.has(role)) return [];
    for (const permission of permissions) {
      const hasPermission: boolean =
        this.access.get(role)?.can.has(permission) ?? false;

      if (output == "number") arr_num.push(hasPermission ? 1 : 0);
      if (output == "string") hasPermission && arr_str.push(permission);
    }

    if (output == "number") return arr_num;
    if (output == "string") return arr_str;
    return [];
  }

  async loadFromRedis(redis: RedisClientType, uid: string): Promise<string> {
    const keys = new Set<string>();
    let cursor = "0";

    do {
      const res = await redis.scan(cursor, {
        MATCH: `${uid}*`,
        TYPE: "set",
        COUNT: 100,
      });
      cursor = String(res.cursor);
      for (const key of res.keys) keys.add(key as string);
    } while (cursor !== "0");

    const roles = [...keys];
    if (!roles.length) return MESSAGE.failed;

    const multi = redis.multi();
    for (const role of roles) {
      multi.sMembers(role);
    }
    const merged_permissions = await multi.exec();

    for (let i = 0; i < merged_permissions.length; i++) {
      const role_without_access_key = (roles[i] as string)
        .split(":")
        .at(-1) as string;

      this.addRole(role_without_access_key);
      this.addMPermissions(
        role_without_access_key,
        merged_permissions[i] as unknown as string[]
      );
    }

    return MESSAGE.success;
  }

  deleteRole(role: string): string {
    const res = this.access.delete(role);
    if (res) return MESSAGE.success;
    else return MESSAGE.nochange;
  }

  removePermissions(role: string, permissions: string[]): string {
    if (role == "" || !permissions.length) return MESSAGE.failed;
    let num_of_deletes = 0;
    if (!this.access.has(role)) return MESSAGE.nochange;
    for (const permission of permissions) {
      const res = this.access.get(role)?.can.delete(permission);
      if (res) {
        num_of_deletes++;
      }
    }

    if (num_of_deletes > 0) return MESSAGE.success;
    else return MESSAGE.nochange;
  }

  getRoles(): string[] {
    if (!this.access) return [];
    return [...this.access.keys()] as unknown as string[];
  }
}
