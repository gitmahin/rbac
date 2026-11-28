import { createRbacStorage } from "@/createRbacStorage";
import { LocalStorage } from "@/storage";
import { MESSAGE } from "@rbac/constants";
import { beforeAll, beforeEach, describe, expect, test, vi } from "vitest";
import { mockRedis } from "./utils";

describe("LocalStorage", () => {
  describe("Check hasRole method", () => {
    let local: LocalStorage;
    beforeAll(() => {
      local = createRbacStorage(LocalStorage);
    });

    test("it should call properly with role argument", () => {
      const spy = vi.spyOn(local, "hasRole");
      local.hasRole("admin");

      expect(spy).toHaveBeenCalledWith("admin");
    });

    test("it should return false if no role has been created", () => {
      const res = local.hasRole("admin");
      expect(res).toBe(false);
    });

    test("it should return false with empty string passed", () => {
      const res = local.hasRole("");
      expect(res).toBe(false);
    });
  });

  describe("Create Admin role", () => {
    let local: LocalStorage;
    beforeAll(() => {
      local = createRbacStorage(LocalStorage);
    });

    test("it should call properly with role argument", () => {
      const spy = vi.spyOn(local, "addRole");
      local.addRole("user");
      expect(spy).toHaveBeenCalledWith("user");
    });

    test("it should return success response after creating new role", () => {
      const res = local.addRole("admin");
      expect(res).toBe(MESSAGE.success);
    });

    test("it should return failed if empty string passed in role argument to create new role", () => {
      const res = local.addRole("");
      expect(res).toBe(MESSAGE.failed);
    });

    test("returns nochange when the same role is created twice", () => {
      const res = local.addRole("admin");
      expect(res).toBe(MESSAGE.nochange);
    });

    test("it should return true if role is created", () => {
      const res = local.hasRole("admin");
      expect(res).toBe(true);
    });

    test("addPermission should creates the role if role is missing and adds the permission", () => {
      expect(local.addPermission("admin", "post:delete")).toBe(MESSAGE.success);
      expect(local.hasRole("admin")).toBe(true);
      expect(local.getPermissions("admin")).toEqual(["none", "post:delete"]);
    });
  });

  describe("Create Permissions", () => {
    let local: LocalStorage;
    beforeEach(() => {
      local = createRbacStorage(LocalStorage);
      local.addRole("admin");
    });

    describe("Check Getting All Permissions in Array", () => {
      let local: LocalStorage;
      beforeEach(() => {
        local = createRbacStorage(LocalStorage);
      });

      test("it should call properly with role argument", () => {
        const spy = vi.spyOn(local, "getPermissions");
        local.getPermissions("admin");

        expect(spy).toHaveBeenCalledWith("admin");
      });

      test("it should return only none item in array if no permission has been added", () => {
        local.addRole("admin");
        const res = local.getPermissions("admin");
        expect(res).toEqual(["none"]);
      });

      test("it should return empty array of string if no role has been created", () => {
        const res = local.getPermissions("admin");
        expect(res).toEqual([]);
      });

      test("it should return empty array if emtpy string is given in role argument", () => {
        const res = local.getPermissions("");
        expect(res).toEqual([]);
      });
    });

    describe("Creating One Permission at a Time", () => {
      test("it should create one permission", () => {
        const spy = vi.spyOn(local, "addPermission");
        const res = local.addPermission("admin", "post:delete");

        expect(spy).toHaveBeenCalledWith("admin", "post:delete");
        expect(res).toBe(MESSAGE.success);
        expect(local.getPermissions("admin")).toEqual(["none", "post:delete"]);
      });

      test("it should return failed if empty string passed as role but permission is given", () => {
        const res = local.addPermission("", "post:delete");
        expect(res).toBe(MESSAGE.failed);
      });

      test("it should return failed if empty string passed as permission", () => {
        const res = local.addPermission("admin", "");
        expect(res).toBe(MESSAGE.failed);
        expect(local.getPermissions("admin")).toEqual(["none"]);
      });

      test("it should return nochange when the same permission is created twice", () => {
        local.addPermission("admin", "post:delete");
        const res = local.addPermission("admin", "post:delete");
        expect(res).toBe(MESSAGE.nochange);
      });
    });

    describe("Creating Multiple Permission at Once", () => {
      test("it should call properly with role and multiple permissions in argument", () => {
        const spy = vi.spyOn(local, "addMPermissions");
        local.addMPermissions("admin", ["post:create", "post:update"]);
        expect(spy).toHaveBeenCalledWith("admin", [
          "post:create",
          "post:update",
        ]);
      });

      test("it should create multiple permissions at once", () => {
        const res = local.addMPermissions("admin", [
          "post:create",
          "post:update",
        ]);
        expect(local.getPermissions("admin")).toEqual([
          "none",
          "post:create",
          "post:update",
        ]);
        expect(res).toBe(MESSAGE.success);
      });

      test("it should return success for creating same permissions twice for multiple permissions", () => {
        local.addMPermissions("admin", ["post:create", "post:update"]);
        const res = local.addMPermissions("admin", [
          "post:create",
          "post:update",
        ]);
        expect(res).toBe(MESSAGE.success);
      });

      test("it should return failed if empty permissions passed in argument", () => {
        const res = local.addMPermissions("admin", []);
        expect(res).toBe(MESSAGE.failed);
      });

      test("it should return failed if empty string passed in role argument but permissions are given", () => {
        const res = local.addMPermissions("", ["post:create", "post:update"]);
        expect(res).toBe(MESSAGE.failed);
      });

      test("it should stop adding permission and return failed if empty string passed as permission for multiple permissions", () => {
        const res = local.addMPermissions("admin", ["post:update", ""]);
        expect(res).toBe(MESSAGE.failed);
        expect(local.getPermissions("admin")).toEqual(["none", "post:update"]);
      });
    });
  });

  describe("Get Roles", () => {
    let local: LocalStorage;
    beforeEach(() => {
      local = createRbacStorage(LocalStorage);
    });

    test("it should return all roles as array of string", () => {
      local.addRole("admin");
      local.addRole("user");

      expect(local.getRoles()).toEqual(["admin", "user"]);
    });

    test("it should return empty array if no role has been created", () => {
      expect(local.getRoles()).toEqual([]);
    });
  });

  describe("Checking Permissions Membership", () => {
    let local: LocalStorage;
    beforeEach(() => {
      local = createRbacStorage(LocalStorage);
      local.addRole("admin");
    });

    describe("Checking Single Permission Membership", () => {
      test("it should return true if permission exists", () => {
        local.addPermission("admin", "post:create");
        expect(local.hasPermission("admin", "post:create")).toBe(true);
      });

      test("it should return false if permission doesn't exist", () => {
        local.addPermission("admin", "post:create");
        expect(local.hasPermission("admin", "post:delete")).toBe(false);
      });

      test("it should return false if no permission has passed in the argument", () => {
        expect(local.hasPermission("admin", "")).toBe(false);
      });
    });

    describe("Checking Bulk Permission Membership", () => {
      test("it should return true if both permissions exists", () => {
        local.addMPermissions("admin", ["post:create", "post:delete"]);
        expect(
          local.hasBulkPermissions("admin", ["post:create", "post:delete"])
        ).toBe(true);
      });

      test("it should return false when any one of the permissions doesn't exist", () => {
        local.addMPermissions("admin", ["post:create", "post:delete"]);
        expect(
          local.hasBulkPermissions("admin", ["post:create", "post:update"])
        ).toBe(false);
      });

      test("it should return false when no permission provided", () => {
        local.addMPermissions("admin", ["post:create", "post:delete"]);
        expect(local.hasBulkPermissions("admin", [])).toBe(false);
      });

      test("it should return false if emtpy role is provided but permissions are given", () => {
        local.addMPermissions("admin", ["post:create", "post:delete"]);
        expect(
          local.hasBulkPermissions("", ["post:create", "post:delete"])
        ).toBe(false);
      });
    });
  });

  describe("Checking Role Membership", () => {
    let local: LocalStorage;
    beforeEach(() => {
      local = createRbacStorage(LocalStorage);
    });

    test("it should return true if role exists", () => {
      local.addRole("admin");
      expect(local.hasRole("admin")).toBe(true);
    });

    test("it should return false if role doesn't exist", () => {
      expect(local.hasRole("admin")).toBe(false);
    });
  });

  describe("Getting Permissions by Membership", () => {
    let local: LocalStorage;
    beforeEach(() => {
      local = createRbacStorage(LocalStorage);
    });

    describe("Checking When Permissions Exist", () => {
      let local: LocalStorage;
      beforeAll(() => {
        local = createRbacStorage(LocalStorage);
        local.addRole("admin");
        local.addMPermissions("admin", [
          "post:create",
          "post:delete",
          "post:update",
        ]);
      });

      test("it should return only the permissions the role has, as strings", () => {
        expect(
          local.getHasPermissions("admin", [
            "post:create",
            "post:update",
            "post:edit",
          ])
        ).toEqual(["post:create", "post:update"]);
      });

      test("it should return only the permissions the role has, as number", () => {
        expect(
          local.getHasPermissions(
            "admin",
            ["post:create", "post:update", "post:edit"],
            "number"
          )
        ).toEqual([1, 1, 0]);
      });

      test("it should return empty array if role is passed but permissions are not given to match", () => {
        expect(local.getHasPermissions("admin", [])).toEqual([]);
      });

      test("it should return empty array if permissions are passed but role is not given to match", () => {
        expect(
          local.getHasPermissions("", ["post:create", "post:update"])
        ).toEqual([]);
      });

      test("it should return empty array if both role and permissions are not given to match", () => {
        expect(local.getHasPermissions("", [])).toEqual([]);
      });
    });

    describe("Check When Permissions not Exist", () => {
      test("it should return empty array if no role has been created, as strings", () => {
        expect(
          local.getHasPermissions("admin", ["post:create", "post:delete"])
        ).toEqual([]);
      });

      test("it should return array of Zeroes if no role has been created, as number", () => {
        expect(
          local.getHasPermissions(
            "admin",
            ["post:create", "post:delete"],
            "number"
          )
        ).toEqual([0, 0]);
      });
    });
  });

  describe("Deleting Roles", () => {
    let local: LocalStorage;
    beforeEach(() => {
      local = createRbacStorage(LocalStorage);
    });

    test("it should return success after deleting an existed role", () => {
      local.addRole("admin");
      const res = local.deleteRole("admin");
      expect(res).toBe(MESSAGE.success);
    });

    test("it should return nochange after deleting a non-existed role", () => {
      const res = local.deleteRole("admin");
      expect(res).toBe(MESSAGE.nochange);
    });
  });

  describe("Removing Permissions", () => {
    let local: LocalStorage;
    beforeEach(() => {
      local = createRbacStorage(LocalStorage);
    });

    describe("Remove When Role Exists", () => {
      let local: LocalStorage;
      beforeAll(() => {
        local = createRbacStorage(LocalStorage);
        local.addRole("admin");
        local.addMPermissions("admin", [
          "post:create",
          "post:delete",
          "post:update",
        ]);
      });

      test("it should return success after deleting permissions", () => {
        const res = local.removePermissions("admin", [
          "post:create",
          "post:delete",
        ]);
        expect(res).toBe(MESSAGE.success);
      });

      test("it should return nochange after deleting permissions which have been already deleted or not exist", () => {
        const res = local.removePermissions("admin", [
          "post:create",
          "post:delete",
        ]);
        expect(res).toBe(MESSAGE.nochange);
      });

      test("it should return failed if role is provided but permissions are not given", () => {
        const res = local.removePermissions("admin", []);
        expect(res).toBe(MESSAGE.failed);
      });

      test("it should return failed if role is not provided but permissions are given", () => {
        expect(local.hasPermission("admin", "post:update")).toBe(true);
        const res = local.removePermissions("", ["post:update"]);
        expect(res).toBe(MESSAGE.failed);
      });

      test("it should return failed if both role and permissions are not given", () => {
        const res = local.removePermissions("", []);
        expect(res).toBe(MESSAGE.failed);
      });
    });

    describe("Remove When Role Doesn't Exist", () => {
      test("it should return nochange if role doesn't exists", () => {
        const res = local.removePermissions("admin", [
          "post:create",
          "post:delete",
        ]);
        expect(res).toBe(MESSAGE.nochange);
      });
    });
  });

  describe("Loading Permissions From Redis", () => {
    let local: LocalStorage;
    beforeEach(() => {
      local = createRbacStorage(LocalStorage);
    });

    test("loads roles and permissions, stripping the prefix", async () => {
      const { redis } = mockRedis(
        ["user:admin", "user:editor"],
        [["post:read", "post:write"], ["post:read"]]
      );

      const res = await local.loadFromRedis(redis, "user");

      expect(res).toBe(MESSAGE.success);
      expect(local.getRoles()).toEqual(
        expect.arrayContaining(["admin", "editor"])
      );
      expect(
        local.hasBulkPermissions("admin", ["post:read", "post:write"])
      ).toBe(true);
      expect(local.hasPermission("editor", "post:write")).toBe(false);
    });

    test("returns failed when no keys match", async () => {
      const { redis } = mockRedis([], []);
      expect(await local.loadFromRedis(redis, "user")).toBe(MESSAGE.failed);
      expect(local.getRoles()).toEqual([]);
    });
  });
});
