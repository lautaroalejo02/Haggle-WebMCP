import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "@/db/schema";

export function createDatabase(databaseUrl: string) {
  return drizzle(new Pool({ connectionString: databaseUrl }), { schema });
}

let cachedDatabase: ReturnType<typeof createDatabase> | undefined;
let cachedDatabaseUrl: string | undefined;

export function getDatabase() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is not configured. Link the Vercel project and add the Neon connection string.",
    );
  }

  if (!cachedDatabase || cachedDatabaseUrl !== databaseUrl) {
    cachedDatabase = createDatabase(databaseUrl);
    cachedDatabaseUrl = databaseUrl;
  }

  return cachedDatabase;
}

export type Database = ReturnType<typeof createDatabase>;
