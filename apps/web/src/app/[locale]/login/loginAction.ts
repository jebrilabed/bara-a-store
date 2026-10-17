"use server";

import { signIn } from "@/auth";
import { db } from "@/lib/db";
import { AuthError } from "next-auth";

export async function loginAction(formData: FormData, callbackUrl?: string) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { success: false, error: "invalid" };
  }

  let destination = callbackUrl;
  if (!destination) {
    try {
      const u = await db.user.findFirst({
        where: { email: { equals: email, mode: "insensitive" } },
        select: { role: true },
      });
      destination = u?.role === "ADMIN" ? "/admin" : "/ar/account";
    } catch {
      destination = "/ar/account";
    }
  }

  try {
    const res = await signIn("credentials", {
      email,
      password,
      redirectTo: destination,
      redirect: false,
    });

    if (typeof res === "string" && res.includes("error=CredentialsSignin")) {
      return { success: false, error: "invalid" };
    }

    return { success: true, redirectUrl: destination };
  } catch (error) {
    if (error instanceof AuthError) {
      return { success: false, error: "invalid" };
    }
    if ((error as any)?.digest?.includes?.("NEXT_REDIRECT")) {
      return { success: true, redirectUrl: destination };
    }
    return { success: false, error: "invalid" };
  }
}
