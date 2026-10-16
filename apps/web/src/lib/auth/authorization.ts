import { auth } from "@/auth";
import { cache } from "react";
import { redirect } from "next/navigation";

export const getCurrentUser = cache(async function getCurrentUser() {
  const session = await auth();
  const user = session?.user as { id?: string; name?: string | null; email?: string | null; role?: string } | undefined;
  if (typeof user?.id !== "string" || !user.id || !user.role) return null;
  return { id: user.id, name: user.name ?? "", email: user.email ?? "", role: user.role };
});

export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect("/ar/login?error=admin");
  return user;
}
