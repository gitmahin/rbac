import { MESSAGE } from "@rbac/constants";
import type { AccessDataType, IStorage } from "@rbac/types";
import { action, makeObservable, observable } from "mobx";

type VoidReturn<T> = {
  [K in keyof T]: T[K] extends (...args: infer A) => any
    ? (...args: A) => void
    : T[K];
};

export class RbacStore implements VoidReturn<IStorage> {
  access: AccessDataType = new Map();
  message: MESSAGE | null = null;
  constructor() {
    makeObservable(this, {
      access: observable,
      message: observable,
      addRole: action,
      addMPermissions: action,
      addPermission: action,
      deleteRole: action,
      removePermissions: action,
    });
  }

  addRole(role: string): void {
    if (!this.access.get(role)) {
      this.access.set(role, {
        can: new Set(["none"]),
      });

      this.message = MESSAGE.success;
      return;
    }
    this.message = MESSAGE.nochange;
  }

  addMPermissions(role: string, permissions: string[]): void {
    const existed_role = this.access.get(role);
    if (!existed_role) {
      this.addRole(role);
    }
    for (const permission of permissions) {
      this.access.get(role)!.can.add(permission);
    }
    this.message = MESSAGE.success;
    return;
  }

  addPermission(role: string, permission: string): void {
    const existed_role = this.access.get(role);
    if (!existed_role) {
      this.addRole(role);
    }
    if (existed_role?.can.has(permission)) {
      this.message = MESSAGE.nochange;
      return;
    }
    existed_role?.can.add(permission);
    this.message = MESSAGE.success;
    return;
  }

  hasRole(role: string): boolean {
    return this.access.has(role) ?? false;
  }

  getPermissions(role: string): string[] | Set<string> | undefined {
    return this.access?.get(role)?.can ?? undefined;
  }

  hasPermission(role: string, permission: string): boolean {
    return this.access.get(role)?.can.has(permission) ?? false;
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
    output: "number" | "string" = "string"
  ): string[] | number[] {
    const arr_num: number[] = [];
    const arr_str: string[] = [];

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

  deleteRole(role: string): void {
    const res = this.access.delete(role);
    if (res) {
      this.message = MESSAGE.success;
      return;
    } else {
      this.message = MESSAGE.nochange;
    }
  }

  removePermissions(role: string, permissions: string[]): void {
    let num_of_deletes = 0;
    for (const permission of permissions) {
      const res = this.access.get(role)?.can.delete(permission);
      if (res) {
        num_of_deletes++;
      }
    }

    if (num_of_deletes > 0) {
      this.message = MESSAGE.success;
      return;
    } else {
      this.message = MESSAGE.nochange;
    }
  }
}
