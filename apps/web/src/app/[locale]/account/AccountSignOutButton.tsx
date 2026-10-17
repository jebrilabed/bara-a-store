"use client";

import { useState } from "react";
import { LogOut, LoaderCircle } from "lucide-react";
import { adminSignOutAction } from "@/components/admin/adminSignOutAction";

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
    window.location.href = "/ar";
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
