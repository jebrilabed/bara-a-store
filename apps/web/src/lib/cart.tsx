"use client";
import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useToast } from "@/components/ui/ToastProvider";
function cartPerfTraceEnabled() {
  try {
    return localStorage.getItem("cartPerfTrace") === "1";
  } catch {
    return false;
  }
}
export type Line = {
  id: string;
  name: string;
  price: number;
  qty: number;
  stock?: number;
  image?: string | null;
  available?: boolean;
  currentPrice?: number;
  priceChanged?: boolean;
};

type CartContextValue = {
  lines: Line[];
  mutating: boolean;
  add: (product: Pick<Line, "id" | "name" | "price"> & Partial<Pick<Line, "stock" | "image">>) => Promise<void>;
  set: (id: string, quantity: number) => Promise<void>;
  refresh: (id: string) => Promise<void>;
  reload: () => Promise<void>;
  clear: () => Promise<void>;
  clearLocal: () => void;
  count: number;
  total: number;
  error: string;
};

const Ctx = createContext<CartContextValue | null>(null);
export function useCart() {
  const context = useContext(Ctx);
  if (!context) throw new Error("useCart must be used inside CartProvider");
  return context;
}

const STORAGE_KEY = "cart";

function readCachedCart(): Line[] {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    if (!Array.isArray(value)) return [];
    return value
      .filter((line) => line && typeof line.id === "string" && Number.isInteger(line.qty) && line.qty > 0 && line.qty <= 99)
      .map((line) => ({ id: line.id, name: String(line.name ?? ""), price: Number(line.price) || 0, qty: line.qty }));
  } catch {
    return [];
  }
}

async function requestCart(action: string, payload: Record<string, unknown> = {}, eventStartedAt = performance.now()) {
  const requestStartedAt = performance.now();
  const traceEnabled = cartPerfTraceEnabled();
  const correlationId = traceEnabled && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : null;
  const headers = new Headers({ "Content-Type": "application/json" });
  if (correlationId) headers.set("X-Cart-Perf-Id", correlationId);
  const response = await fetch("/api/cart", {
    method: "POST",
    headers,
    credentials: "same-origin",
    cache: "no-store",
    body: JSON.stringify({ action, ...payload }),
  });
  const responseReceivedAt = performance.now();
  const data = await response.json().catch(() => ({}));
  if (traceEnabled) {
    console.info("[cart-client-perf]", JSON.stringify({
      correlationId,
      action,
      eventToRequestMs: Math.round(requestStartedAt - eventStartedAt),
      fetchToResponseMs: Math.round(responseReceivedAt - requestStartedAt),
      responseBodyMs: Math.round(performance.now() - responseReceivedAt),
      status: response.status,
    }));
  }
  if (!response.ok) throw new Error(data.error || "تعذر تحديث السلة");
  return data as { items: Line[] };
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { showToast } = useToast();
  const [lines, setLines] = useState<Line[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [mutating, setMutating] = useState(false);
  const linesRef = useRef<Line[]>([]);
  const mutationInFlight = useRef(false);
  const pendingRender = useRef<{ phase: string; startedAt: number } | null>(null);

  function replaceLines(nextLines: Line[]) {
    linesRef.current = nextLines;
    setLines(nextLines);
  }

  useEffect(() => {
    const pending = pendingRender.current;
    if (!pending) return;
    pendingRender.current = null;
    if (!cartPerfTraceEnabled()) return;
    console.info("[cart-render-perf]", JSON.stringify({
      phase: pending.phase,
      commitMs: Math.round(performance.now() - pending.startedAt),
    }));
  }, [lines]);

  useEffect(() => {
    let active = true;
    async function load() {
      const cached = readCachedCart();
      if (active && cached.length) replaceLines(cached);
      try {
        const response = await fetch("/api/cart", { credentials: "same-origin", cache: "no-store" });
        const serverCart = await response.json();
        if (!response.ok) throw new Error(serverCart.error || "تعذر تحميل السلة");
        let items: Line[] = serverCart.items ?? [];
        if (items.length === 0 && cached.length) {
          const migrated = await requestCart("sync", {
            items: cached.map((line) => ({ productId: line.id, quantity: line.qty })),
          });
          items = migrated.items;
        }
        if (active) replaceLines(items);
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : "تعذر تحميل السلة");
      } finally {
        if (active) setReady(true);
      }
    }
    void load();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (ready) {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(lines)); } catch {}
    }
  }, [lines, ready]);

  async function mutate(
    action: string,
    payload: Record<string, unknown> = {},
    optimisticallyUpdate: (current: Line[]) => Line[] = (current) => current,
  ) {
    if (mutationInFlight.current) throw new Error("CART_BUSY");
    const eventStartedAt = performance.now();
    mutationInFlight.current = true;
    setMutating(true);
    const previousLines = linesRef.current;
    setError("");
    pendingRender.current = { phase: "optimistic", startedAt: performance.now() };
    replaceLines(optimisticallyUpdate(previousLines));
    try {
      const data = await requestCart(action, payload, eventStartedAt);
      pendingRender.current = { phase: "confirmed", startedAt: performance.now() };
      replaceLines(data.items);
      if (action === "add") showToast("تمت إضافة المنتج إلى السلة.");
      else if (action === "set" && payload.quantity === 0) showToast("تم حذف المنتج من السلة.");
      else if (action === "set") showToast("تم تحديث كمية المنتج.");
      else if (action === "refresh") showToast("تم اعتماد السعر الجديد.");
      else if (action === "clear") showToast("تم إفراغ السلة.");
    } catch (mutationError) {
      pendingRender.current = { phase: "rollback", startedAt: performance.now() };
      replaceLines(previousLines);
      setError(mutationError instanceof Error ? mutationError.message : "تعذر تحديث السلة");
      throw mutationError;
    } finally {
      mutationInFlight.current = false;
      setMutating(false);
    }
  }

  const add = async (product: Pick<Line, "id" | "name" | "price"> & Partial<Pick<Line, "stock" | "image">>) => {
    await mutate("add", { productId: product.id }, (current) => {
      const existing = current.find((line) => line.id === product.id);
      if (existing) {
        return current.map((line) => line.id === product.id
          ? { ...line, qty: line.qty + 1, currentPrice: product.price, priceChanged: line.price !== product.price }
          : line);
      }
      return [...current, {
        id: product.id,
        name: product.name,
        price: product.price,
        currentPrice: product.price,
        stock: product.stock,
        image: product.image,
        qty: 1,
        available: true,
        priceChanged: false,
      }];
    });
  };
  const set = async (id: string, quantity: number) => {
    await mutate("set", { productId: id, quantity }, (current) => quantity === 0
      ? current.filter((line) => line.id !== id)
      : current.map((line) => line.id === id ? { ...line, qty: quantity } : line));
  };
  const refresh = async (id: string) => {
    await mutate("refresh", { productId: id }, (current) => current.map((line) => line.id === id
      ? { ...line, price: line.currentPrice ?? line.price, priceChanged: false }
      : line));
  };
  const reload = async () => {
    setError("");
    const response = await fetch("/api/cart", { credentials: "same-origin", cache: "no-store" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "تعذر تحميل السلة");
    replaceLines(data.items ?? []);
  };
  const clear = async () => mutate("clear", {}, () => []);
  const clearLocal = () => {
    replaceLines([]);
    setError("");
  };

  const value = useMemo(() => ({
    lines,
    mutating,
    add,
    set,
    refresh,
    reload,
    clear,
    clearLocal,
    count: lines.reduce((sum, line) => sum + line.qty, 0),
    total: lines.reduce((sum, line) => sum + line.qty * line.price, 0),
    error,
  }), [lines, mutating, error]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
