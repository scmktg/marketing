"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { db, schema } from "@/lib/db/client";
import { eq } from "drizzle-orm";

export async function login(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const redirectTo = String(formData.get("redirect_to") ?? "") || "/dashboard";

  if (!email || !password) {
    redirect(`/login?error=${encodeURIComponent("Email and password are required")}`);
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    const message = error?.message ?? "Sign in failed";
    redirect(`/login?error=${encodeURIComponent(message)}`);
  }

  // Mirror last_login_at in our app users table for quick UI display.
  // The actual users row is created via the Supabase Auth → DB sync trigger
  // (see supabase/migrations/9998_users_sync.sql).
  await db
    .update(schema.users)
    .set({ lastLoginAt: new Date() })
    .where(eq(schema.users.id, data.user.id));

  redirect(redirectTo);
}

export async function logout() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
