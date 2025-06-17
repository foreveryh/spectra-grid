import { drizzle } from "drizzle-orm/d1";

export function getDb(env: any) {
  return drizzle(env.DB as any);
} 