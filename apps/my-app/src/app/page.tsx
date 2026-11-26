"use client";
import { observer } from "mobx-react";
import { RbacStore } from "@rbac/react";

const rbacStore = new RbacStore();
function Home() {
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6 p-6">
      <div className="flex flex-wrap gap-2">
        <button
          className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-500"
          onClick={() => rbacStore.addRole("admin")}
        >
          Add role
        </button>
        <button
          className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-500"
          onClick={() =>
            rbacStore.addMPermissions("admin", [
              "product:create",
              "product:update",
              "product:delete",
            ])
          }
        >
          Add permissions
        </button>
        <button
          className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-500"
          onClick={() => rbacStore.addPermission("admin", "product:draft")}
        >
          Add single permission
        </button>
        <button
          className="rounded bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-500"
          onClick={() =>
            rbacStore.removePermissions("admin", ["product:delete"])
          }
        >
          Delete permissions
        </button>
        <button
          className="rounded bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-500"
          onClick={() => rbacStore.deleteRole("admin")}
        >
          Delete role
        </button>
      </div>

      <p className="text-yellow-500">{rbacStore.message}</p>

      <div>
        <h3 className="mb-2 font-semibold text-zinc-400">Permissions</h3>
        <div className="flex flex-wrap gap-2">
          {Array.from(rbacStore.getPermissions("admin") ?? []).map((item) => (
            <span
              key={item}
              className="rounded bg-purple-500/20 px-2 py-1 font-mono text-xs text-purple-300"
            >
              {item}
            </span>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <h3 className="mb-1 font-semibold text-zinc-400">Checks</h3>
        <p>
          Has "admin" role:{" "}
          <b
            className={
              rbacStore.hasRole("admin") ? "text-green-400" : "text-red-400"
            }
          >
            {rbacStore.hasRole("admin") ? "True" : "False"}
          </b>
        </p>
        <p>
          Has "product:delete":{" "}
          <b
            className={
              rbacStore.hasPermission("admin", "product:delete")
                ? "text-green-400"
                : "text-red-400"
            }
          >
            {rbacStore.hasPermission("admin", "product:delete")
              ? "True"
              : "False"}
          </b>
        </p>
        <p>
          Has both "product:create" and "product:update":{" "}
          <b
            className={
              rbacStore.hasBulkPermissions("admin", [
                "product:create",
                "product:update",
              ])
                ? "text-green-400"
                : "text-red-400"
            }
          >
            {rbacStore.hasBulkPermissions("admin", [
              "product:create",
              "product:update",
            ])
              ? "True"
              : "False"}
          </b>
        </p>
        <p>
          Existing from "product:create", "product:delete":{" "}
          <b className="font-mono text-purple-300">
            {Array.from(
              rbacStore.getHasPermissions("admin", [
                "product:create",
                "product:delete",
              ])
            ).join(", ")}
          </b>
        </p>
      </div>
    </div>
  );
}

export default observer(Home);
