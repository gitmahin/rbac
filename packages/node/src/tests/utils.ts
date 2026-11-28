import type { RedisClientType } from "@/type";
import { createClient } from "redis";
import { vi, type Mock } from "vitest";

type MockRedisResult = {
  redis: RedisClientType;
  scan: Mock;
  multi: { sMembers: Mock; exec: Mock };
};

export const mockRedis = (
  keys: string[] = [],
  members: string[][] = []
): MockRedisResult => {
  const multi = {
    sMembers: vi.fn().mockReturnThis(),
    exec: vi.fn().mockResolvedValue(members),
  };
  const scan = vi.fn().mockResolvedValue({ cursor: "0", keys });
  const redis = { scan, multi: vi.fn().mockReturnValue(multi) };

  return { redis: redis as unknown as RedisClientType, scan, multi };
};

export const USE_REAL = process.env.USE_REAL_REDIS === "1";
export const PREFIX = process.env.REDIS_TEST_PREFIX ?? "rbac-test";

export const redis: any = USE_REAL
  ? createClient({
      url: process.env.REDIS_URL ?? "redis://localhost:6379",
      username: process.env.REDIS_USERNAME ?? "default",
      password: process.env.REDIS_PASSWORD ?? "default",
    })
  : createMockRedis().redis;

// * This Mock is Created By Claude. I have reviewed it and it Works same as Real Redis Client
export function createMockRedis() {
  const sets = new Map<string, Set<string>>();
  const hashes = new Map<string, Map<string, string>>();
  const strings = new Map<string, string>();

  const toRegex = (pattern: string) =>
    new RegExp(
      "^" +
        pattern
          .replace(/[.+^${}()|[\]\\]/g, "\\$&")
          .replace(/\*/g, ".*")
          .replace(/\?/g, ".") +
        "$"
    );

  const allKeys = () => [
    ...new Set([...sets.keys(), ...hashes.keys(), ...strings.keys()]),
  ];
  const flat = (m: string | string[]) => (Array.isArray(m) ? m : [m]);

  const client: any = {
    connect: async () => {},
    quit: async () => "OK",
    scanIterator: async function* (opts?: { MATCH?: string }) {
      const re = toRegex(opts?.MATCH ?? "*");
      yield allKeys().filter((k) => re.test(k));
    },
    // sets
    sAdd: vi.fn(async (key: string, members: string | string[]) => {
      const s = sets.get(key) ?? new Set<string>();
      let added = 0;
      for (const m of flat(members)) {
        if (!s.has(m)) {
          s.add(m);
          added++;
        }
      }
      sets.set(key, s);
      return added;
    }),
    sRem: vi.fn(async (key: string, members: string | string[]) => {
      const s = sets.get(key);
      if (!s) return 0;
      let removed = 0;
      for (const m of flat(members)) if (s.delete(m)) removed++;
      if (s.size === 0) sets.delete(key);
      return removed;
    }),
    sMembers: vi.fn(async (key: string) => [...(sets.get(key) ?? [])]),
    sIsMember: vi.fn(
      async (key: string, member: string) => sets.get(key)?.has(member) ?? false
    ),
    smIsMember: vi.fn(async (key: string, members: string[]) =>
      members.map((m) => (sets.get(key)?.has(m) ? 1 : 0))
    ),
    sCard: vi.fn(async (key: string) => sets.get(key)?.size ?? 0),

    // hashes
    hSet: vi.fn(async (key: string, field: string, value: string) => {
      const h = hashes.get(key) ?? new Map<string, string>();
      const isNew = !h.has(field);
      h.set(field, value);
      hashes.set(key, h);
      return isNew ? 1 : 0;
    }),
    hGet: vi.fn(async (key: string, field: string) =>
      hashes.get(key)?.get(field)
    ),
    hGetAll: vi.fn(async (key: string) =>
      Object.fromEntries(hashes.get(key) ?? [])
    ),
    hDel: vi.fn(async (key: string, fields: string | string[]) => {
      const h = hashes.get(key);
      if (!h) return 0;
      let n = 0;
      for (const f of flat(fields)) if (h.delete(f)) n++;
      return n;
    }),

    // strings
    set: vi.fn(async (key: string, value: string) => {
      strings.set(key, value);
      return "OK";
    }),
    get: vi.fn(async (key: string) => strings.get(key) ?? null),

    // keys
    exists: vi.fn(
      async (keys: string | string[]) =>
        flat(keys).filter((k) => sets.has(k) || hashes.has(k) || strings.has(k))
          .length
    ),
    del: vi.fn(async (keys: string | string[]) => {
      let n = 0;
      for (const k of flat(keys)) {
        if (sets.delete(k) || hashes.delete(k) || strings.delete(k)) n++;
      }
      return n;
    }),
    keys: vi.fn(async (pattern: string) => {
      const re = toRegex(pattern);
      return allKeys().filter((k) => re.test(k));
    }),
    scan: vi.fn(async (_cursor: string | number, opts?: { MATCH?: string }) => {
      const re = toRegex(opts?.MATCH ?? "*");
      return { cursor: 0, keys: allKeys().filter((k) => re.test(k)) };
    }),
    flushAll: vi.fn(async () => {
      sets.clear();
      hashes.clear();
      strings.clear();
      return "OK";
    }),

    // multi
    multi: vi.fn(() => {
      const queue: Array<() => Promise<unknown>> = [];
      const p: any = new Proxy(
        {},
        {
          get: (_t, cmd: string) => {
            if (cmd === "exec")
              return async () => Promise.all(queue.map((q) => q()));
            return (...args: any[]) => {
              queue.push(() => client[cmd](...args));
              return p;
            };
          },
        }
      );
      return p;
    }),
  };

  return { redis: client, sets, hashes, strings };
}
