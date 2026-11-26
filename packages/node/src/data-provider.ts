import type { AccessDataType } from "@rbac/types";

export class RbacDataProvider {
  protected access: AccessDataType | null = null;
  constructor() {
    this.access = new Map();
  }
}
