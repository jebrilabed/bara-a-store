"use client";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

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
  add: (product: Pick<Line, "id">) => Promise<void>;
  set: (id: string, quantity: number) => Promise<void>;
  refresh: (id: string) => Promise<void>;
  reload: () => Promise<void>;
  clear: () => Promise<void>;
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

async function requestCart(action: string, payload: Record<string, unknown> = {}) {
  const response = await fetch("/api/cart", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    cache: "no-store",
    body: JSON.stringify({ action, ...payload }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "تعذر تحديث السلة");
  return data as { items: Line[] };
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<Line[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      const cached = readCachedCart();
      if (active && cached.length) setLines(cached);
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
        if (active) setLines(items);
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

  async function mutate(action: string, payload: Record<string, unknown> = {}) {
    setError("");
    const data = await requestCart(action, payload);
    setLines(data.items);
  }

  const add = async (product: Pick<Line, "id">) => {
    try { await mutate("add", { productId: product.id }); }
    catch (mutationError) { setError(mutationError instanceof Error ? mutationError.message : "تعذر تحديث السلة"); throw mutationError; }
  };
  const set = async (id: string, quantity: number) => {
    try { await mutate("set", { productId: id, quantity }); }
    catch (mutationError) { setError(mutationError instanceof Error ? mutationError.message : "تعذر تحديث السلة"); throw mutationError; }
  };
  const refresh = async (id: string) => {
    try { await mutate("refresh", { productId: id }); }
    catch (mutationError) { setError(mutationError instanceof Error ? mutationError.message : "تعذر تحديث السلة"); throw mutationError; }
  };
  const reload = async () => {
    setError("");
    const response = await fetch("/api/cart", { credentials: "same-origin", cache: "no-store" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "تعذر تحميل السلة");
    setLines(data.items ?? []);
  };
  const clear = async () => {
    try { await mutate("clear"); }
    catch (mutationError) { setLines([]); setError(mutationError instanceof Error ? mutationError.message : "تعذر تحديث السلة"); }
  };

  const value = useMemo(() => ({
    lines,
    add,
    set,
    refresh,
    reload,
    clear,
    count: lines.reduce((sum, line) => sum + line.qty, 0),
    total: lines.reduce((sum, line) => sum + line.qty * line.price, 0),
    error,
  }), [lines, error]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
