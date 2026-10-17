"use client";

import { useState } from "react";
import { LogOut, LoaderCircle } from "lucide-react";
import { adminSignOutAction } from "./adminSignOutAction";
import { signOut } from "next-auth/react";

export default function AdminSignOut() {
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
    // Hard navigate to completely reset the client router and root layout
    window.location.href = "/ar/login";
  }

  return (
    <form onSubmit={handleSignOut}>
      <button
        type="submit"
        className="admin-signout-btn"
        title="تسجيل الخروج"
        aria-label="تسجيل الخروج"
        disabled={loading}
      >
        {loading ? (
          <LoaderCircle size={15} className="loading-button__spinner" aria-hidden="true" />
        ) : (
          <LogOut size={15} aria-hidden="true" />
        )}
        <span>{loading ? "جارٍ الخروج..." : "تسجيل الخروج"}</span>
      </button>
    </form>
  );
}
