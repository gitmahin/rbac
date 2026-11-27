# @rbac/node

Lightweight, type-safe RBAC (Role-Based Access Control) with pluggable storage: in-memory or Redis.

## Features

- Two interchangeable backends: `LocalStorage` (sync) and `RedisStorage` (async)
- Redis Sets under the hood: O(1) membership checks, bulk checks via `SMISMEMBER`
- Bulk permission checks (AND semantics)
- Warm a local cache from Redis with `loadFromRedis`
- Written in TypeScript, ships with types

## Installation

```bash
npm install @rbac/node
# Redis backend only:
npm install redis
```

## Quick start

### Redis storage

```typescript
import { createClient } from "redis";
import { createRbacStorage, RedisStorage } from "@rbac/node";

const client = createClient({ url: "redis://localhost:6379" });
await client.connect();

// "user" is a key prefix: roles are stored as `user:<role>`
const storage = createRbacStorage(RedisStorage, client, "user");

await storage.addRole("admin");
await storage.addMPermissions("admin", ["read", "write", "delete"]);

await storage.hasPermission("admin", "read"); // true
await storage.hasBulkPermissions("admin", ["read", "write"]); // true
await storage.getHasPermissions("admin", ["read", "ban"]); // ["read"]
await storage.getHasPermissions("admin", ["read", "ban"], "number"); // [1, 0]
```

### Local (in-memory) storage

```typescript
import { createRbacStorage, LocalStorage } from "@rbac/node";

const storage = createRbacStorage(LocalStorage);

storage.addRole("editor");
storage.addMPermissions("editor", ["read", "write"]);
storage.hasPermission("editor", "write"); // true
```

### Hybrid: Redis as source of truth, local as cache

```typescript
const local = createRbacStorage(LocalStorage);
await local.loadFromRedis(client, "user");

local.hasPermission("admin", "read"); // sync, no network call
```

## API

All methods on `RedisStorage` return Promises. `LocalStorage` methods are synchronous.
Mutating methods return `"success"` or `"nochange"` (see `MESSAGE` constants).

| Method | Description |
|---|---|
| `addRole(role)` | Create a role |
| `addPermission(role, permission)` | Add one permission |
| `addMPermissions(role, permissions[])` | Add many permissions |
| `hasRole(role)` | Check if a role exists |
| `getPermissions(role)` | Get all permissions of a role |
| `hasPermission(role, permission)` | Check one permission |
| `hasBulkPermissions(role, permissions[])` | True only if **all** permissions exist (AND) |
| `getHasPermissions(role, permissions[], output?)` | Returns matching permissions (`"string"`, default) or `1/0` flags (`"number"`) |
| `removePermissions(role, permissions[])` | Remove permissions |
| `deleteRole(role)` | Delete a role |
| `getRoles()` | List all roles |
| `loadFromRedis(client, accessKey)` | `LocalStorage` only: load roles from Redis |

### Factory

```typescript
createRbacStorage(StorageClass, ...constructorArgs);
```

- `RedisStorage`: `(redisClient, prefix)`
- `LocalStorage`: no arguments

## Complexity

`k` = permissions passed in, `p` = permissions in the role, `r` = roles stored, `N` = keys in Redis.

| Method | LocalStorage | RedisStorage |
|---|---|---|
| `addRole` | O(1) | O(1) |
| `addPermission` | O(1) | O(1) |
| `addMPermissions` | O(k) | O(k) |
| `hasRole` | O(1) | O(1) |
| `getPermissions` | O(1) | O(p) |
| `hasPermission` | O(1) | O(1) |
| `hasBulkPermissions` | O(k) | O(k) |
| `getHasPermissions` | O(k) | O(k) |
| `removePermissions` | O(k) | O(k) |
| `deleteRole` | O(1) | O(p) |
| `getRoles` | O(r) | O(N) full scan |

Each `RedisStorage` call is one network round trip; latency is dominated by RTT.

## When to use which

| | LocalStorage | RedisStorage |
|---|---|---|
| Latency | Nanoseconds | Network RTT |
| Shared across instances | No | Yes |
| Persistence | No | Yes (per Redis config) |
| Best for | Single process, hot-path checks | Multi-instance services, shared state |

## License

MIT