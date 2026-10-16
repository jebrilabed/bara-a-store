"use client";

import { createContext, Suspense, useCallback, useContext, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, X } from "lucide-react";
import styles from "./ToastProvider.module.css";

type ToastContextValue = { showToast: (message: string) => void };
type ToastState = { id: number; message: string };

const ToastContext = createContext<ToastContextValue | null>(null);

const TOAST_MESSAGES: Record<string, string> = {
  "product-created": "تمت إضافة المنتج بنجاح.",
  "product-updated": "تم تعديل المنتج بنجاح.",
  "product-deleted": "تم حذف المنتج.",
  "product-activated": "تم تفعيل المنتج.",
  "product-deactivated": "تم إيقاف المنتج.",
  "category-created": "تمت إضافة القسم بنجاح.",
  "category-updated": "تم تعديل القسم بنجاح.",
  "category-deleted": "تم حذف القسم.",
  "order-status-updated": "تم تحديث حالة الطلب.",
};

function ToastRouteListener({ showToast }: ToastContextValue) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const toastKey = searchParams.get("toast");

  useEffect(() => {
    const message = toastKey ? TOAST_MESSAGES[toastKey] : null;
    if (!message) return;

    showToast(message);
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete("toast");
    const query = nextParams.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [pathname, router, searchParams, showToast, toastKey]);

  return null;
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside ToastProvider");
  return context;
}

export default function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const toastId = useRef(0);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismissToast = useCallback(() => {
    if (timeout.current) clearTimeout(timeout.current);
    timeout.current = null;
    setToast(null);
  }, []);

  const showToast = useCallback((message: string) => {
    if (timeout.current) clearTimeout(timeout.current);
    toastId.current += 1;
    setToast({ id: toastId.current, message });
    timeout.current = setTimeout(() => setToast(null), 4000);
  }, []);

  useEffect(() => () => {
    if (timeout.current) clearTimeout(timeout.current);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <Suspense fallback={null}>
        <ToastRouteListener showToast={showToast} />
      </Suspense>
      <div className={styles.viewport}>
        {toast && (
          <div key={toast.id} className={styles.toast} role="status" aria-live="polite">
            <CheckCircle2 size={20} aria-hidden="true" />
            <span>{toast.message}</span>
            <button type="button" onClick={dismissToast} aria-label="إغلاق الإشعار"><X size={17} aria-hidden="true" /></button>
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}
