"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export default function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const routeKey = `${pathname}?${searchParams.toString()}`;
  const previousRoute = useRef(routeKey);
  const timeout = useRef<number | null>(null);
  const [status, setStatus] = useState<"idle" | "pending" | "complete">("idle");

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (!(event.target instanceof Element)) return;
      const anchor = event.target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement) || anchor.hasAttribute("download") || (anchor.target && anchor.target !== "_self")) return;

      const destination = new URL(anchor.href, window.location.href);
      const current = `${window.location.pathname}${window.location.search}`;
      const next = `${destination.pathname}${destination.search}`;
      if (destination.origin !== window.location.origin || next === current) return;

      if (timeout.current !== null) window.clearTimeout(timeout.current);
      setStatus("pending");
      timeout.current = window.setTimeout(() => setStatus("idle"), 15000);
    }

    document.addEventListener("click", handleClick, true);
    return () => {
      document.removeEventListener("click", handleClick, true);
      if (timeout.current !== null) window.clearTimeout(timeout.current);
    };
  }, []);

  useEffect(() => {
    if (previousRoute.current === routeKey) return;
    previousRoute.current = routeKey;
    if (status !== "pending") return;

    setStatus("complete");
    if (timeout.current !== null) window.clearTimeout(timeout.current);
    timeout.current = window.setTimeout(() => setStatus("idle"), 180);
  }, [routeKey, status]);

  return (
    <div className={`navigation-progress is-${status}`} role="status" aria-live="polite" aria-label={status === "idle" ? undefined : "جار الانتقال إلى الصفحة"}>
      <span />
    </div>
  );
}
