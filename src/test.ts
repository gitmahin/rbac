import { createRbacStorage } from "./createRbacStorage";
import { LocalStorage, RedisStorage } from "./storage";
import { createClient } from 'redis';
const client = createClient({
  url: `redis://default:default@localhost:6379`,
});

await client.connect()
const storage = createRbacStorage(LocalStorage)

const result = await storage.loadFromRedis(client, "user:")
console.log(result)
const user = storage.getPermissions("user")
const admin = storage.getPermissions("admin")

console.log("user: ", user)
console.log("admin: ", admin)


