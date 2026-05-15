import { redirect } from "next/navigation";
import { getCurrentUser, type AppUser } from "./get-user";

// Server-side role guard. Use at the top of any route handler or Server
// Component that requires authentication.
export async function requireUser(): Promise<AppUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

// Server-side role guard that requires manager role. Returns 403 redirect
// (to /dashboard) if not manager.
export async function requireManager(): Promise<AppUser> {
  const user = await requireUser();
  if (user.role !== "manager") redirect("/dashboard");
  return user;
}
