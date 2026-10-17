import { signOut } from "@/auth";
import { LogOut } from "lucide-react";

export default function AdminSignOut() {
  return (
    <form
      action={async () => {
        "use server";
        await signOut({ redirectTo: "/ar/login" });
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
