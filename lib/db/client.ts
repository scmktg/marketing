import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Server-only Drizzle client. Reads from DATABASE_URL (Supabase Postgres).
// Lazy-initialised so `next build` does not require DATABASE_URL at
// module-load time (CI builds with placeholder env).
//
// In serverless runtimes (Vercel functions) prefer prepared:false and a
// short idle_timeout so connections don't pile up.

type DB = PostgresJsDatabase<typeof schema>;

let cached: DB | null = null;

function init(): DB {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is required to use the database. " +
        "Set it in .env.local for local dev; see .env.example.",
    );
  }
  const queryClient = postgres(connectionString, {
    prepare: false,
    idle_timeout: 20,
    max: 10,
  });
  return drizzle(queryClient, { schema });
}

// Proxy delegates every property/method access to the lazily-initialised
// drizzle instance. Means `import { db } from "@/lib/db/client"` is free
// at module load — the first `db.select(...)` triggers init.
export const db = new Proxy({} as DB, {
  get(_target, prop, receiver) {
    if (!cached) cached = init();
    return Reflect.get(cached as object, prop, receiver);
  },
});

export { schema };
