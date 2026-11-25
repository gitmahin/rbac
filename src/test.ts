import { createRbacStorage } from "./createRbacStorage";
import { LocalStorage, RedisStorage } from "./storage";
import { createClient } from 'redis';
const client = createClient({
  url: `redis://default:default@localhost:6379`,
});

await client.connect()
const storage = createRbacStorage(LocalStorage)

await storage.loadFromRedis(client, "user:")
const permissions = await storage.getPermissions("user")

console.log(permissions)


