import { createRbacStorage } from "@/createRbacStorage";
import { RedisStorage } from "@/storage";
import { MESSAGE } from "@rbac/constants";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
  vi,
} from "vitest";
import { PREFIX, redis } from "./utils";

const clearTestKeys = async () => {
  const keys: string[] = [];
  for await (const batch of redis.scanIterator({
    MATCH: `${PREFIX}:*`,
    COUNT: 100,
  })) {
    Array.isArray(batch) ? keys.push(...batch) : keys.push(batch);
  }
  if (keys.length) await redis.del(keys);
};

const sorted = (arr: string[] | string) =>
  Array.isArray(arr) ? [...arr].sort() : arr;

beforeAll(async () => {
  await redis.connect();
});

afterAll(async () => {
  await clearTestKeys();
  await redis.quit();
});

describe("RedisStorage", () => {
  let storage: RedisStorage;

  beforeEach(async () => {
    await clearTestKeys();
    storage = createRbacStorage(
      RedisStorage,
      redis as any,
      PREFIX
    ) as RedisStorage;
  });

  describe("Check hasRole method", () => {
    test("it should call properly with role argument", async () => {
      const spy = vi.spyOn(storage, "hasRole");
      await storage.hasRole("admin");

      expect(spy).toHaveBeenCalledWith("admin");
    });

    test("it should return false if no role has been created", async () => {
      expect(await storage.hasRole("admin")).toBe(false);
    });

    test("it should return false with empty string passed", async () => {
      expect(await storage.hasRole("")).toBe(false);
    });
  });

  describe("Create Admin role", () => {
    test("it should call properly with role argument", async () => {
      const spy = vi.spyOn(storage, "addRole");
      await storage.addRole("user");

      expect(spy).toHaveBeenCalledWith("user");
    });

    test("it should return success response after creating new role", async () => {
      expect(await storage.addRole("admin")).toBe(MESSAGE.success);
    });

    test("it should return failed if empty string passed in role argument to create new role", async () => {
      expect(await storage.addRole("")).toBe(MESSAGE.failed);
    });

    test("returns nochange when the same role is created twice", async () => {
      await storage.addRole("admin");
      expect(await storage.addRole("admin")).toBe(MESSAGE.nochange);
    });

    test("it should return true if role is created", async () => {
      await storage.addRole("admin");
      expect(await storage.hasRole("admin")).toBe(true);
    });
  });

  describe("Create Permissions", () => {
    beforeEach(async () => {
      await storage.addRole("admin");
    });

    describe("Check Getting All Permissions in Array", () => {
      test("it should call properly with role argument", async () => {
        const spy = vi.spyOn(storage, "getPermissions");
        await storage.getPermissions("admin");

        expect(spy).toHaveBeenCalledWith("admin");
      });

      test("it should return only none item in array if no permission has been added", async () => {
        expect(await storage.getPermissions("admin")).toEqual(["none"]);
      });

      test("it should return empty array of string if no role has been created", async () => {
        expect(await storage.getPermissions("ghost")).toEqual([]);
      });

      test("it should return empty array if emtpy string is given in role argument", async () => {
        expect(await storage.getPermissions("")).toEqual([]);
      });
    });

    describe("Creating One Permission at a Time", () => {
      test("it should create one permission", async () => {
        const spy = vi.spyOn(storage, "addPermission");
        const res = await storage.addPermission("admin", "post:delete");

        expect(spy).toHaveBeenCalledWith("admin", "post:delete");
        expect(res).toBe(MESSAGE.success);
        expect(sorted(await storage.getPermissions("admin"))).toEqual(
          sorted(["none", "post:delete"])
        );
      });

      test("it should return failed if empty string passed as role but permission is given", async () => {
        expect(await storage.addPermission("", "post:delete")).toBe(
          MESSAGE.failed
        );
      });

      test("it should return failed if empty string passed as permission", async () => {
        expect(await storage.addPermission("admin", "")).toBe(MESSAGE.failed);
        expect(await storage.getPermissions("admin")).toEqual(["none"]);
      });

      test("it should return nochange when the same permission is created twice", async () => {
        await storage.addPermission("admin", "post:delete");
        expect(await storage.addPermission("admin", "post:delete")).toBe(
          MESSAGE.nochange
        );
      });
    });

    describe("Creating Multiple Permission at Once", () => {
      test("it should call properly with role and multiple permissions in argument", async () => {
        const spy = vi.spyOn(storage, "addMPermissions");
        await storage.addMPermissions("admin", ["post:create", "post:update"]);

        expect(spy).toHaveBeenCalledWith("admin", [
          "post:create",
          "post:update",
        ]);
      });

      test("it should create multiple permissions at once", async () => {
        const res = await storage.addMPermissions("admin", [
          "post:create",
          "post:update",
        ]);

        expect(sorted(await storage.getPermissions("admin"))).toEqual(
          sorted(["none", "post:create", "post:update"])
        );
        expect(res).toBe(MESSAGE.success);
      });

      test("it should return nochange for creating same permissions twice for multiple permissions", async () => {
        await storage.addMPermissions("admin", ["post:create", "post:update"]);
        const res = await storage.addMPermissions("admin", [
          "post:create",
          "post:update",
        ]);
        expect(res).toBe(MESSAGE.nochange);
      });

      test("it should return failed if empty permissions passed in argument", async () => {
        expect(await storage.addMPermissions("admin", [])).toBe(MESSAGE.failed);
      });

      test("it should return failed if empty string passed in role argument but permissions are given", async () => {
        expect(
          await storage.addMPermissions("", ["post:create", "post:update"])
        ).toBe(MESSAGE.failed);
      });
    });
  });

  describe("Redis-specific behavior (no role pre-creation required)", () => {
    test("addPermission creates the role implicitly, without the 'none' placeholder", async () => {
      expect(await storage.hasRole("admin")).toBe(false);

      expect(await storage.addPermission("admin", "post:create")).toBe(
        MESSAGE.success
      );

      expect(await storage.hasRole("admin")).toBe(true);
      expect(await storage.getPermissions("admin")).toEqual(["post:create"]);
    });

    test("addMPermissions creates the role implicitly, without the 'none' placeholder", async () => {
      const res = await storage.addMPermissions("admin", [
        "post:create",
        "post:update",
      ]);

      expect(res).toBe(MESSAGE.success);
      expect(await storage.hasRole("admin")).toBe(true);
      expect(sorted(await storage.getPermissions("admin"))).toEqual(
        sorted(["post:create", "post:update"])
      );
    });

    test("addRole on an implicitly created role adds 'none' and returns success", async () => {
      await storage.addPermission("admin", "post:create");

      expect(await storage.addRole("admin")).toBe(MESSAGE.success);
      expect(sorted(await storage.getPermissions("admin"))).toEqual(
        sorted(["none", "post:create"])
      );
    });

    test("removing the last member deletes the role", async () => {
      await storage.addPermission("admin", "post:create");

      expect(await storage.removePermissions("admin", ["post:create"])).toBe(
        MESSAGE.success
      );
      expect(await storage.hasRole("admin")).toBe(false);
      expect(await storage.getRoles()).toEqual([]);
    });

    test("hasPermission returns false for a role that doesn't exist", async () => {
      expect(await storage.hasPermission("ghost", "post:create")).toBe(false);
    });

    test("hasBulkPermissions returns false for a role that doesn't exist", async () => {
      expect(await storage.hasBulkPermissions("ghost", ["post:create"])).toBe(
        false
      );
    });
  });

  describe("Get Roles", () => {
    test("it should return all roles as array of string", async () => {
      await storage.addRole("admin");
      await storage.addRole("user");

      expect(sorted(await storage.getRoles())).toEqual(["admin", "user"]);
    });

    test("it should include roles created implicitly through addPermission", async () => {
      await storage.addRole("admin");
      await storage.addPermission("editor", "post:update");

      expect(sorted(await storage.getRoles())).toEqual(["admin", "editor"]);
    });

    test("it should return empty array if no role has been created", async () => {
      expect(await storage.getRoles()).toEqual([]);
    });
  });

  describe("Checking Permissions Membership", () => {
    beforeEach(async () => {
      await storage.addRole("admin");
    });

    describe("Checking Single Permission Membership", () => {
      test("it should return true if permission exists", async () => {
        await storage.addPermission("admin", "post:create");
        expect(await storage.hasPermission("admin", "post:create")).toBe(true);
      });

      test("it should return false if permission doesn't exist", async () => {
        await storage.addPermission("admin", "post:create");
        expect(await storage.hasPermission("admin", "post:delete")).toBe(false);
      });

      test("it should return false if no permission has passed in the argument", async () => {
        expect(await storage.hasPermission("admin", "")).toBe(false);
      });
    });

    describe("Checking Bulk Permission Membership", () => {
      beforeEach(async () => {
        await storage.addMPermissions("admin", ["post:create", "post:delete"]);
      });

      test("it should return true if both permissions exists", async () => {
        expect(
          await storage.hasBulkPermissions("admin", [
            "post:create",
            "post:delete",
          ])
        ).toBe(true);
      });

      test("it should return false when any one of the permissions doesn't exist", async () => {
        expect(
          await storage.hasBulkPermissions("admin", [
            "post:create",
            "post:update",
          ])
        ).toBe(false);
      });

      test("it should return false when no permission provided", async () => {
        expect(await storage.hasBulkPermissions("admin", [])).toBe(false);
      });

      test("it should return false if emtpy role is provided but permissions are given", async () => {
        expect(
          await storage.hasBulkPermissions("", ["post:create", "post:delete"])
        ).toBe(false);
      });
    });
  });

  describe("Checking Role Membership", () => {
    test("it should return true if role exists", async () => {
      await storage.addRole("admin");
      expect(await storage.hasRole("admin")).toBe(true);
    });

    test("it should return false if role doesn't exist", async () => {
      expect(await storage.hasRole("admin")).toBe(false);
    });
  });

  describe("Getting Permissions by Membership", () => {
    describe("Checking When Permissions Exist", () => {
      beforeEach(async () => {
        await storage.addMPermissions("admin", [
          "post:create",
          "post:delete",
          "post:update",
        ]);
      });

      test("it should return only the permissions the role has, as strings", async () => {
        expect(
          await storage.getHasPermissions("admin", [
            "post:create",
            "post:update",
            "post:edit",
          ])
        ).toEqual(["post:create", "post:update"]);
      });

      test("it should return only the permissions the role has, as number", async () => {
        expect(
          await storage.getHasPermissions(
            "admin",
            ["post:create", "post:update", "post:edit"],
            "number"
          )
        ).toEqual([1, 1, 0]);
      });

      test("it should return empty array if role is passed but permissions are not given to match", async () => {
        expect(await storage.getHasPermissions("admin", [])).toEqual([]);
      });

      test("it should return empty array if permissions are passed but role is not given to match", async () => {
        expect(
          await storage.getHasPermissions("", ["post:create", "post:update"])
        ).toEqual([]);
      });

      test("it should return empty array if both role and permissions are not given to match", async () => {
        expect(await storage.getHasPermissions("", [])).toEqual([]);
      });
    });

    describe("Check When Permissions not Exist", () => {
      test("it should return empty array if no role has been created, as strings", async () => {
        expect(
          await storage.getHasPermissions("admin", [
            "post:create",
            "post:delete",
          ])
        ).toEqual([]);
      });

      test("it should return array of Zeroes if no role has been created, as number", async () => {
        expect(
          await storage.getHasPermissions(
            "admin",
            ["post:create", "post:delete"],
            "number"
          )
        ).toEqual([0, 0]);
      });
    });
  });

  describe("Deleting Roles", () => {
    test("it should return success after deleting an existed role", async () => {
      await storage.addRole("admin");
      expect(await storage.deleteRole("admin")).toBe(MESSAGE.success);
    });

    test("it should return success after deleting an implicitly created role", async () => {
      await storage.addPermission("admin", "post:create");
      expect(await storage.deleteRole("admin")).toBe(MESSAGE.success);
      expect(await storage.hasRole("admin")).toBe(false);
    });

    test("it should return nochange after deleting a non-existed role", async () => {
      expect(await storage.deleteRole("admin")).toBe(MESSAGE.nochange);
    });
  });

  describe("Removing Permissions", () => {
    describe("Remove When Role Exists", () => {
      beforeEach(async () => {
        await storage.addMPermissions("admin", [
          "post:create",
          "post:delete",
          "post:update",
        ]);
      });

      test("it should return success after deleting permissions", async () => {
        const res = await storage.removePermissions("admin", [
          "post:create",
          "post:delete",
        ]);
        expect(res).toBe(MESSAGE.success);
        expect(await storage.getPermissions("admin")).toEqual(["post:update"]);
      });

      test("it should return nochange after deleting permissions which have been already deleted or not exist", async () => {
        await storage.removePermissions("admin", [
          "post:create",
          "post:delete",
        ]);
        const res = await storage.removePermissions("admin", [
          "post:create",
          "post:delete",
        ]);
        expect(res).toBe(MESSAGE.nochange);
      });

      test("it should return failed if role is provided but permissions are not given", async () => {
        expect(await storage.removePermissions("admin", [])).toBe(
          MESSAGE.failed
        );
      });

      test("it should return failed if role is not provided but permissions are given", async () => {
        expect(await storage.hasPermission("admin", "post:update")).toBe(true);
        expect(await storage.removePermissions("", ["post:update"])).toBe(
          MESSAGE.failed
        );
      });

      test("it should return failed if both role and permissions are not given", async () => {
        expect(await storage.removePermissions("", [])).toBe(MESSAGE.failed);
      });
    });

    describe("Remove When Role Doesn't Exist", () => {
      test("it should return nochange if role doesn't exists", async () => {
        const res = await storage.removePermissions("admin", [
          "post:create",
          "post:delete",
        ]);
        expect(res).toBe(MESSAGE.nochange);
      });
    });
  });
});
