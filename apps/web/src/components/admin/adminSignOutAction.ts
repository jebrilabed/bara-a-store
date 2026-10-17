"use server";

import { signOut } from "@/auth";
import { cookies } from "next/headers";

export async function adminSignOutAction() {
  try {
    await signOut({ redirect: false });
  } catch {
    // ignore
  }

  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll();
  for (const cookie of allCookies) {
    if (
      cookie.name.includes("session-token") ||
      cookie.name.includes("authjs") ||
      cookie.name.includes("next-auth")
    ) {
      cookieStore.delete(cookie.name);
    }
  }

  return { success: true };
}
