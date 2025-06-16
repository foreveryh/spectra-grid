import { drizzle } from "drizzle-orm/d1";

export function getDb(env: Env) {
  return drizzle(env.DB as any);
} 