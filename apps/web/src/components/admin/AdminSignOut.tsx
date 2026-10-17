import { signOut } from "@/auth";
import { LogOut } from "lucide-react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default function AdminSignOut() {
  return (
    <form
      action={async () => {
        "use server";
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
        redirect("/ar/login");
      }}
    >
      <button
        type="submit"
        className="admin-signout-btn"
        title="تسجيل الخروج"
        aria-label="تسجيل الخروج"
      >
        <LogOut size={15} aria-hidden="true" />
        <span>تسجيل الخروج</span>
      </button>
    </form>
  );
}
