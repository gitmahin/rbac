<div align="center">

<a href="https://github.com/gitmahin/rbac-kit">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="./public/logo-dark.png">
    <img src="./public/logo.png" alt="RBAC Kit logo" width="350">
  </picture>
</a>

# RBAC Kit

<div align="center">

**Type-safe role-based access control for Node.js, with in-memory and Redis storage.**

[![npm version](https://img.shields.io/npm/v/@rbac-kit/node?style=for-the-badge&logo=npm&color=cb3837)](https://www.npmjs.com/package/@rbac-kit/node)
[![npm downloads](https://img.shields.io/npm/dm/@rbac-kit/node?style=for-the-badge&logo=npm&color=blue)](https://www.npmjs.com/package/@rbac-kit/node)
[![License](https://img.shields.io/github/license/gitmahin/rbac-kit?style=for-the-badge&color=green)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-3178c6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

[![Stars](https://img.shields.io/github/stars/gitmahin/rbac-kit?style=flat-square&logo=github)](https://github.com/gitmahin/rbac-kit/stargazers)
[![Forks](https://img.shields.io/github/forks/gitmahin/rbac-kit?style=flat-square&logo=github)](https://github.com/gitmahin/rbac-kit/network/members)
[![Issues](https://img.shields.io/github/issues/gitmahin/rbac-kit?style=flat-square)](https://github.com/gitmahin/rbac-kit/issues)
[![Pull Requests](https://img.shields.io/github/issues-pr/gitmahin/rbac-kit?style=flat-square)](https://github.com/gitmahin/rbac-kit/pulls)
[![Last Commit](https://img.shields.io/github/last-commit/gitmahin/rbac-kit?style=flat-square)](https://github.com/gitmahin/rbac-kit/commits)

</div>

<br />

[**Documentation**](https://github.com/gitmahin/rbac-kit/tree/main/packages/node#readme) &nbsp;•&nbsp;
[**Report Bug**](https://github.com/gitmahin/rbac-kit/issues/new?labels=bug) &nbsp;•&nbsp;
[**Request Feature**](https://github.com/gitmahin/rbac-kit/issues/new?labels=enhancement)

<br />

<a href="https://github.com/gitmahin/rbac-kit/stargazers"><img src="https://img.shields.io/badge/%E2%AD%90_Star_this_repo-yellow?style=for-the-badge" alt="Star this repo" /></a>
<a href="https://github.com/gitmahin/rbac-kit/fork"><img src="https://img.shields.io/badge/%F0%9F%8D%B4_Fork-blue?style=for-the-badge" alt="Fork" /></a>

</div>

---

## Features

- **Roles and permissions** with single and bulk checks
- **Pluggable storage**: in-memory `LocalStorage` or `RedisStorage`
- **Fully typed** API written in TypeScript
- **Tested** against a real Redis instance

## Quick Start

```bash
pnpm add @rbac-kit/node
```

```typescript
import { createRbacStorage } from "@rbac-kit/node";
import { LocalStorage } from "@rbac-kit/node";

const rbac = createRbacStorage(LocalStorage);

rbac.addPermission("admin", "post:delete");
rbac.hasPermission("admin", "post:delete"); // true
```

Using Redis:

```typescript
import { createClient } from "redis";
import { createRbacStorage, RedisStorage } from "@rbac-kit/node";

const redis = createClient({ url: "redis://localhost:6379", username: "default", password: "default" });
await redis.connect();

const rbac = createRbacStorage(RedisStorage, redis, "user");
await rbac.addPermission("admin", "post:delete");
```
[**See Full Documentation**](https://github.com/gitmahin/rbac-kit/tree/main/packages/node#readme)
