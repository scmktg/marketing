import { createSupabaseServerClient } from "@/lib/supabase/server";
import { db, schema } from "@/lib/db/client";
import { eq } from "drizzle-orm";

export type AppUser = {
  id: string;
  email: string;
  role: "manager" | "marketing";
};

// Returns the current authenticated app user with their app-level role,
// or null if not authenticated. Always re-validates the Supabase session.
export async function getCurrentUser(): Promise<AppUser | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const rows = await db
    .select({
      id: schema.users.id,
      email: schema.users.email,
      role: schema.users.role,
    })
    .from(schema.users)
    .where(eq(schema.users.id, user.id))
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  return { id: row.id, email: row.email, role: row.role };
}
