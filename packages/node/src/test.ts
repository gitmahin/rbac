import { createRbacStorage } from "./createRbacStorage";
import { LocalStorage, RedisStorage } from "./storage";
import { createClient } from "redis";
const client = createClient({
  url: `redis://default:default@localhost:6379`,
});

await client.connect();
const storage = createRbacStorage(RedisStorage, client, "user");

await storage.addRole("hello");
await storage.addRole("admin");
await storage.addRole("user");
const result = await storage.getRoles();
console.log(result);
