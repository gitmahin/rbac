import { RbacDataProvider } from "../data-provider";
import type { IStorage } from "../interfaces";
import { MESSAGE } from "../constant";
import type { RedisClientType } from "../type";

export class RedisStorage extends RbacDataProvider implements IStorage {
  static redis: RedisClientType;
  uid: string = "";

  constructor(redis: RedisClientType, uid: string) {
    super();
    RedisStorage.redis = redis;
    this.uid = uid;
  }

  async addRole(role: string): Promise<string> {
    const res = await RedisStorage.redis.sAdd(this.uid + role, "none");
    if (res == 1) return MESSAGE.success;
    else return MESSAGE.nochange;
  }

  async addPermission(role: string, permission: string): Promise<string> {
    const res = await RedisStorage.redis.sAdd(this.uid + role, permission);
    if (res == 1) return MESSAGE.success;
    else return MESSAGE.nochange;
  }

  async addMPermissions(role: string, permissions: string[]): Promise<string> {
    const res = await RedisStorage.redis.sAdd(this.uid + role, permissions);
    if (Number(res) >= 1) return MESSAGE.success;
    else return MESSAGE.nochange;
  }

  async getPermissions(role: string): Promise<string[]> {
    // @ts-ignore
    return (await RedisStorage.redis.sMembers(this.uid + role)) ?? [];
  }

  async hasBulkPermissions(
    role: string,
    permissions: string[]
  ): Promise<boolean> {
    let is_has: boolean | null = null;
    const data = await RedisStorage.redis.smIsMember(
      this.uid + role,
      permissions
    );

    for (const permission of data) {
      is_has = permission === 1;

      if (is_has == false) {
        break;
      }
    }

    return is_has ?? false;
  }

  async hasPermission(role: string, permission: string): Promise<boolean> {
    return (
      Number(
        await RedisStorage.redis.sIsMember(this.uid + role, permission)
      ) === 1
    );
  }

  async hasRole(role: string): Promise<boolean> {
    return Number(await RedisStorage.redis.exists(this.uid + role)) === 1;
  }

  async getHasPermissions(
    role: string,
    permissions: string[],
    output: "number" | "string" = "string"
  ): Promise<string[] | number[]> {
    const arr_str: string[] = [];
    const data = await RedisStorage.redis.smIsMember(
      this.uid + role,
      permissions
    );
    // @ts-ignore
    if (output == "number") return data;
    if (output == "string") {
      for (let i = 0; i < data.length; i++) {
        if (Number(data[i]) === 1) {
          arr_str.push(permissions[i] as string);
        }
      }
    }

    if (arr_str.length > 0) return arr_str;
    return [];
  }

  async removePermissions(
    role: string,
    permissions: string[]
  ): Promise<string> {
    const res = await RedisStorage.redis.sRem(this.uid + role, permissions);
    if (Number(res) >= 1) return MESSAGE.success;
    else return MESSAGE.nochange;
  }

  async deleteRole(role: string): Promise<string> {
    const res = await RedisStorage.redis.del(this.uid + role);
    if (res == 1) return MESSAGE.success;
    else return MESSAGE.nochange;
  }
}
