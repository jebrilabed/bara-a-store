"use client";

import { useState } from "react";
import { LogOut, LoaderCircle } from "lucide-react";
import { adminSignOutAction } from "@/components/admin/adminSignOutAction";
import { signOut } from "next-auth/react";

export default function AccountSignOutButton() {
  const [loading, setLoading] = useState(false);

  async function handleSignOut(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);

    try {
      await adminSignOutAction();
    } catch {
      // ignore
    }

    try {
      await signOut({ redirect: false });
    } catch {
      // ignore
    }

    // Hard navigate to login page to reset client router and confirm signout
    window.location.href = "/ar/login";
  }

  return (
    <form className="account-signout" onSubmit={handleSignOut}>
      <button
        type="submit"
        className="account-signout__button"
        disabled={loading}
        aria-busy={loading || undefined}
      >
        {loading ? (
          <LoaderCircle size={17} className="loading-button__spinner" aria-hidden="true" />
        ) : (
          <LogOut size={17} aria-hidden="true" />
        )}
        <span>{loading ? "جارٍ تسجيل الخروج..." : "تسجيل الخروج"}</span>
      </button>
    </form>
  );
}
