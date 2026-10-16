"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { LoaderCircle } from "lucide-react";

type LoadingButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  loading?: boolean;
  pendingText?: string;
};

export default function LoadingButton({
  children,
  loading = false,
  pendingText = "جارٍ التنفيذ...",
  className,
  disabled,
  type = "submit",
  ...props
}: LoadingButtonProps) {
  const { pending } = useFormStatus();
  const isLoading = loading || pending;

  return (
    <button
      {...props}
      className={["loading-button", className].filter(Boolean).join(" ")}
      type={type}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
    >
      {isLoading ? (
        <>
          <LoaderCircle className="loading-button__spinner" size={16} aria-hidden="true" />
          <span>{pendingText}</span>
        </>
      ) : children}
    </button>
  );
}