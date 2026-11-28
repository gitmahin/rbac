# @rbac-kit/node

Lightweight, type-safe RBAC (Role-Based Access Control) with pluggable storage: in-memory or Redis.

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
  - [Redis storage](#redis-storage)
  - [Local (in-memory) storage](#local-in-memory-storage)
  - [Hybrid: Redis as source of truth, local as cache](#hybrid-redis-as-source-of-truth-local-as-cache)
- [Core Concepts](#core-concepts)
- [API Reference](#api-reference)
  - [Factory](#factory)
  - [Return values](#return-values)
  - [Methods](#methods)
  - [loadFromRedis](#loadfromredis)
- [Behavior Differences](#behavior-differences)
- [Redis Data Model](#redis-data-model)
- [Complexity](#complexity)
- [When to Use Which](#when-to-use-which)
- [Testing](#testing)
- [Known Limitations](#known-limitations)
- [License](#license)

## Features

- Two interchangeable backends: `LocalStorage` (sync) and `RedisStorage` (async)
- Redis Sets under the hood: O(1) membership checks, bulk checks via `SMISMEMBER`
- Bulk permission checks (AND semantics)
- Warm a local cache from Redis with `loadFromRedis`
- Written in TypeScript, ships with types

## Installation

```bash
npm install @rbac-kit/node
npm install redis   # only needed for RedisStorage
```

Requirements for `RedisStorage`:

- [`redis`](https://www.npmjs.com/package/redis) (node-redis) client with camelCase commands (`sAdd`, `sMembers`, `smIsMember`, ...)
- Redis server **6.2+** (`SMISMEMBER`)

## Quick Start

### Redis storage

```typescript
import { createClient } from "redis";
import { createRbacStorage, RedisStorage } from "@rbac-kit/node";

const client = createClient({
  url: "redis://localhost:6379",
  username: "default",
  password: "<password>",
});
await client.connect();

// "rbac:username" is a key prefix: roles are stored as `rbac:username:<role>`
const storage = createRbacStorage(RedisStorage, client, "rbac:username");

await storage.addRole("admin");
await storage.addMPermissions("admin", ["post:read", "post:write", "post:delete"]);

await storage.hasPermission("admin", "post:read");                       // true
await storage.hasBulkPermissions("admin", ["post:read", "post:write"]);  // true
await storage.getHasPermissions("admin", ["post:read", "post:ban"]);     // ["post:read"]
await storage.getHasPermissions("admin", ["post:read", "post:ban"], "number"); // [1, 0]
```

### Local (in-memory) storage

```typescript
import { createRbacStorage, LocalStorage } from "@rbac-kit/node";

const storage = createRbacStorage(LocalStorage);

storage.addRole("editor");
storage.addMPermissions("editor", ["post:read", "post:write"]);
storage.hasPermission("editor", "post:write"); // true

// Roles are created implicitly too
storage.addPermission("viewer", "post:read");  // "success", role "viewer" now exists
```

### Hybrid: Redis as source of truth, local as cache

```typescript
const local = createRbacStorage(LocalStorage);
await local.loadFromRedis(client, "rbac:username");

local.hasPermission("admin", "post:read"); // sync, no network call
```

## Core Concepts

- **Role**: a named set of permissions (`"admin"`, `"editor"`).
- **Permission**: a string, by convention `resource:action` (`"post:delete"`).
- **`"none"` placeholder**: `addRole` stores the permission `"none"` so an empty role still exists. It appears in `getPermissions` results.
- **Empty strings** are rejected as role names and (in most methods) as permissions.

## API Reference

### Factory

```typescript
createRbacStorage(StorageClass, ...constructorArgs);
```

| Class | Arguments |
|---|---|
| `RedisStorage` | `(redisClient, prefix)` |
| `LocalStorage` | none |

All `RedisStorage` methods return Promises. `LocalStorage` methods are synchronous, except `loadFromRedis`, which is async.

### Return values

Mutating methods return one of:

| Value | Meaning |
|---|---|
| `"success"` | State changed |
| `"nochange"` | Valid call, nothing to change (already exists / nothing removed) |
| `"failed"` | Invalid input (empty role, empty permission list, ...) |

These come from `MESSAGE` in `@rbac/constants`.

### Methods

| Method | Description | Returns |
|---|---|---|
| `addRole(role)` | Create a role (adds the `"none"` placeholder) | `success` / `nochange` / `failed` |
| `addPermission(role, permission)` | Add one permission. Creates the role if missing | `success` / `nochange` / `failed` |
| `addMPermissions(role, permissions[])` | Add many permissions. Creates the role if missing | `success` / `nochange` / `failed` |
| `hasRole(role)` | Does the role exist? | `boolean` |
| `getPermissions(role)` | All permissions of a role (includes `"none"` if present). `[]` for empty or unknown role | `string[]` |
| `hasPermission(role, permission)` | Check one permission | `boolean` |
| `hasBulkPermissions(role, permissions[])` | `true` only if **all** exist (AND). `false` for empty role or empty list | `boolean` |
| `getHasPermissions(role, permissions[], output?)` | Matching permissions (`"string"`, default) or `1`/`0` flags in input order (`"number"`). `[]` for empty role or list | `string[]` / `number[]` |
| `removePermissions(role, permissions[])` | Remove permissions | `success` / `nochange` / `failed` |
| `deleteRole(role)` | Delete a role and all its permissions | `success` / `nochange` |
| `getRoles()` | List all role names | `string[]` |
| `loadFromRedis(client, uid)` | `LocalStorage` only, see below | `Promise<success / failed>` |

Examples:

```typescript
await storage.addRole("admin");                          // "success"
await storage.addRole("admin");                          // "nochange"
await storage.addRole("");                               // "failed"

await storage.getHasPermissions("admin", ["a", "b"], "number"); // [1, 0]
await storage.removePermissions("admin", ["a"]);         // "success"
await storage.removePermissions("admin", ["a"]);         // "nochange"
```

### loadFromRedis

```typescript
await local.loadFromRedis(redisClient, "rbac:username");
```

Scans keys matching `rbac:username*` of type `set`, reads each with `SMEMBERS` in one `MULTI`, strips the `rbac:username:` prefix, and creates the roles and permissions locally.

- Returns `"failed"` if no matching keys are found.
- Every loaded role gets the `"none"` placeholder locally (via `addRole`), even if it has no `"none"` member in Redis.
- Existing local roles are merged, not replaced.
- Pass a prefix that is specific enough that no unrelated set keys start with it (for example `"rbac:username"`).
- It is a snapshot. Later changes in Redis are not reflected until you call it again.

## Behavior Differences

| Behavior | LocalStorage | RedisStorage |
|---|---|---|
| `addPermission` on a missing role | Creates the role (with `"none"`) and adds the permission | Creates the role **without** `"none"` |
| `addMPermissions` on a missing role | Creates the role (with `"none"`) | Creates the role **without** `"none"` |
| `addRole` on a role created implicitly | `nochange` (already has `"none"`) | `success`, adds `"none"` to the existing set |
| `addMPermissions` with an empty-string permission | Returns `failed` | Not validated, the empty string is stored |
| `addMPermissions` with permissions that all exist | `success` | `nochange` |
| Removing the last permission | Role remains (empty set) | Redis deletes the key, so the role disappears |
| `getRoles()` order | Insertion order | Unordered (do not rely on order) |
| `deleteRole("")`, `hasPermission("", ...)` | No guard | No guard |

## Redis Data Model

Each role is one Redis Set. The key is `<prefix>:<role>`:

```
rbac:username:admin  -> { "none", "post:read", "post:write" }
rbac:username:editor -> { "post:read" }
```

| Operation | Redis command |
|---|---|
| `addRole` | `SADD key none` |
| `addPermission` / `addMPermissions` | `SADD key member [member ...]` |
| `getPermissions` | `SMEMBERS key` |
| `hasPermission` | `SISMEMBER key member` |
| `hasBulkPermissions` / `getHasPermissions` | `SMISMEMBER key member [member ...]` |
| `hasRole` | `EXISTS key` |
| `removePermissions` | `SREM key member [member ...]` |
| `deleteRole` | `DEL key` |
| `getRoles` | `SCAN 0 MATCH <prefix>:*` |

## Complexity

`k` = permissions passed in, `p` = permissions in the role, `r` = roles stored, `N` = keys in Redis.

| Method | LocalStorage | RedisStorage |
|---|---|---|
| `addRole` | O(1) | O(1) |
| `addPermission` | O(1) | O(1) |
| `addMPermissions` | O(k) | O(k) |
| `hasRole` | O(1) | O(1) |
| `getPermissions` | O(p) | O(p) |
| `hasPermission` | O(1) | O(1) |
| `hasBulkPermissions` | O(k) | O(k) |
| `getHasPermissions` | O(k) | O(k) |
| `removePermissions` | O(k) | O(k) |
| `deleteRole` | O(1) | O(p) |
| `getRoles` | O(r) | O(N) per `SCAN` pass (single pass, see [limitations](#known-limitations)) |

Each `RedisStorage` call is one network round trip; latency is dominated by RTT.

## When to Use Which

| | LocalStorage | RedisStorage |
|---|---|---|
| Latency | Nanoseconds | Network RTT |
| Shared across instances | No | Yes |
| Persistence | No | Yes (per Redis config) |
| Best for | Single process, hot-path checks | Multi-instance services, shared state |

## Testing

The Redis test suite runs against an in-memory mock by default and against a real Redis when `USE_REAL_REDIS=1`.

```bash
# mock Redis (default)
pnpm --filter @rbac-kit/node run test

# real Redis
pnpm --filter @rbac-kit/node run test:real
```

| Variable | Default |
|---|---|
| `REDIS_URL` | `redis://localhost:6379` |
| `REDIS_USERNAME` | `default` |
| `REDIS_PASSWORD` | `default` |
| `REDIS_TEST_PREFIX` | `rbac-test` |

Tests delete only keys under `REDIS_TEST_PREFIX:*` before each test.

## Known Limitations

- **Redis `addMPermissions` doesn't reject empty-string permissions**, unlike `LocalStorage`.

## License

MIT