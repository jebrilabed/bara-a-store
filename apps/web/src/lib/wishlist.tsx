"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/ui/ToastProvider";

export type WishlistItem = {
  id: string;
  name: string;
  price: number | string;
  compareAtPrice?: number | string | null;
  image?: string | null;
  slug?: string;
  stock?: number;
};

type WishlistContextValue = {
  items: WishlistItem[];
  count: number;
  isFavorite: (id: string) => boolean;
  toggle: (product: WishlistItem) => void;
  add: (product: WishlistItem) => void;
  remove: (id: string) => void;
  clear: () => void;
};

const WishlistContext = createContext<WishlistContextValue | null>(null);

const STORAGE_KEY = "baraa_wishlist";

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const { showToast } = useToast();
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setItems(parsed.filter((item) => item && typeof item.id === "string"));
        }
      }
    } catch {}
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      } catch {}
    }
  }, [items, ready]);

  const isFavorite = (id: string) => items.some((item) => item.id === id);

  const add = (product: WishlistItem) => {
    if (isFavorite(product.id)) return;
    setItems((prev) => [...prev, product]);
    showToast("تمت إضافة المنتج إلى المفضلة ❤️");
  };

  const remove = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
    showToast("تمت إزالة المنتج من المفضلة");
  };

  const toggle = (product: WishlistItem) => {
    if (isFavorite(product.id)) {
      remove(product.id);
    } else {
      add(product);
    }
  };

  const clear = () => {
    setItems([]);
  };

  const value = useMemo(
    () => ({
      items,
      count: items.length,
      isFavorite,
      toggle,
      add,
      remove,
      clear,
    }),
    [items],
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error("useWishlist must be used within a WishlistProvider");
  }
  return context;
}
