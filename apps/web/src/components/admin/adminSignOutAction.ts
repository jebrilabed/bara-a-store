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

  const targetCookieNames = new Set<string>([
    "authjs.session-token",
    "__Secure-authjs.session-token",
    "authjs.session-token.0",
    "authjs.session-token.1",
    "authjs.session-token.2",
    "__Secure-authjs.session-token.0",
    "__Secure-authjs.session-token.1",
    "__Secure-authjs.session-token.2",
    "next-auth.session-token",
    "__Secure-next-auth.session-token",
    "next-auth.session-token.0",
    "next-auth.session-token.1",
    "next-auth.session-token.2",
    "__Secure-next-auth.session-token.0",
    "__Secure-next-auth.session-token.1",
    "__Secure-next-auth.session-token.2",
    "authjs.csrf-token",
    "__Host-authjs.csrf-token",
    "authjs.callback-url",
    "__Secure-authjs.callback-url",
    "next-auth.csrf-token",
    "__Host-next-auth.csrf-token",
    "next-auth.callback-url",
    "__Secure-next-auth.callback-url",
  ]);

  for (const cookie of allCookies) {
    if (
      cookie.name.includes("session-token") ||
      cookie.name.includes("authjs") ||
      cookie.name.includes("next-auth")
    ) {
      targetCookieNames.add(cookie.name);
    }
  }

  for (const name of targetCookieNames) {
    cookieStore.set(name, "", {
      path: "/",
      maxAge: 0,
      expires: new Date(0),
      httpOnly: true,
      sameSite: "lax",
    });
    cookieStore.set(name, "", {
      path: "/",
      maxAge: 0,
      expires: new Date(0),
      httpOnly: true,
      sameSite: "lax",
      secure: true,
    });
    try {
      cookieStore.delete({ name, path: "/" });
    } catch {
      // ignore
    }
    try {
      cookieStore.delete(name);
    } catch {
      // ignore
    }
  }

  return { success: true };
}

export const signOutAction = adminSignOutAction;
