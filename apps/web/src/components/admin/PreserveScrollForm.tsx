"use client";

import type { FormHTMLAttributes, ReactNode } from "react";
import { useLayoutEffect } from "react";
import { useSearchParams } from "next/navigation";

const SCROLL_POSITION_KEY = "admin-settings-scroll-position";

type PreserveScrollFormProps = Omit<FormHTMLAttributes<HTMLFormElement>, "action"> & {
  action: (formData: FormData) => void | Promise<void>;
  children: ReactNode;
};

export default function PreserveScrollForm({ action, children, onSubmitCapture, ...props }: PreserveScrollFormProps) {
  const searchParams = useSearchParams();
  const query = searchParams.toString();

  useLayoutEffect(() => {
    const saved = sessionStorage.getItem(SCROLL_POSITION_KEY);
    if (!saved) return;

    try {
      const position = JSON.parse(saved) as { pathname: string; search: string; scrollY: number };
      if (position.pathname === window.location.pathname && position.search !== window.location.search) {
        window.scrollTo(0, position.scrollY);
      }
    } catch {
      sessionStorage.removeItem(SCROLL_POSITION_KEY);
      return;
    }

    sessionStorage.removeItem(SCROLL_POSITION_KEY);
  }, [query]);

  return (
    <form
      {...props}
      action={action}
      onSubmitCapture={(event) => {
        sessionStorage.setItem(
          SCROLL_POSITION_KEY,
          JSON.stringify({ pathname: window.location.pathname, search: window.location.search, scrollY: window.scrollY }),
        );
        onSubmitCapture?.(event);
      }}
    >
      {children}
    </form>
  );
}