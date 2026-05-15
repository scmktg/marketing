import { pgTable, pgEnum, uuid, text, timestamp } from "drizzle-orm/pg-core";

export const userRole = pgEnum("user_role", ["manager", "marketing"]);

// One row per app user. `id` matches `auth.users.id` from Supabase Auth.
// Role-based access is enforced at the API layer (see lib/auth/require.ts).
// RLS policies on this table back that up as defence-in-depth.
export const users = pgTable("users", {
  id: uuid("id").primaryKey(),
  email: text("email").notNull().unique(),
  role: userRole("role").notNull().default("marketing"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
});

export type User = typeof users.$inferSelect;
export type UserRole = (typeof userRole.enumValues)[number];
