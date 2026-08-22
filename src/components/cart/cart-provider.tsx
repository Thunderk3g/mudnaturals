"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { CartItem } from "@/content/checkout-copy";
import { MiniCart } from "@/components/cart/mini-cart";

/**
 * The cart holds references and nothing else: a variant id and a quantity.
 * No price, no name, no image. Everything else is recomputed from the database
 * on every view, so a stale localStorage entry can never decide what an object
 * costs.
 *
 * Versioned key: bump the suffix and every old cart is ignored rather than
 * mis-parsed.
 */
const STORAGE_KEY = "mud.cart.v1";
const MAX_PER_LINE = 99;

type CartApi = {
  items: CartItem[];
  count: number;
  add(variantId: string, quantity?: number): void;
  setQuantity(variantId: string, quantity: number): void;
  remove(variantId: string): void;
  clear(): void;
  open(): void;
  close(): void;
  isOpen: boolean;
  /** Additive: false until localStorage has been read, so views can hold their
   *  skeleton instead of flashing "your cart is empty". */
  mounted: boolean;
};

const CartContext = createContext<CartApi | null>(null);

function isItem(value: unknown): value is CartItem {
  if (typeof value !== "object" || value === null) return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.variantId === "string" &&
    item.variantId.length > 0 &&
    typeof item.quantity === "number" &&
    Number.isInteger(item.quantity) &&
    item.quantity > 0
  );
}

function readStored(): CartItem[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isItem) : [];
  } catch {
    // A corrupt or blocked store is an empty cart, never a crash.
    return [];
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Hydration: the server renders an empty cart, so the first client render
  // must match it. Storage is read only after that.
  useEffect(() => {
    setItems(readStored());
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Private mode or a full quota: the session still works, it just forgets.
    }
  }, [items, mounted]);

  const add = useCallback((variantId: string, quantity = 1) => {
    const qty = Math.max(1, Math.trunc(quantity));
    setItems((prev) => {
      const existing = prev.find((item) => item.variantId === variantId);
      if (!existing) return [...prev, { variantId, quantity: Math.min(qty, MAX_PER_LINE) }];
      return prev.map((item) =>
        item.variantId === variantId
          ? { ...item, quantity: Math.min(item.quantity + qty, MAX_PER_LINE) }
          : item,
      );
    });
    setIsOpen(true); // Slide-in on add. Never a redirect to checkout.
  }, []);

  const setQuantity = useCallback((variantId: string, quantity: number) => {
    const qty = Math.trunc(quantity);
    setItems((prev) =>
      qty <= 0
        ? prev.filter((item) => item.variantId !== variantId)
        : prev.map((item) =>
            item.variantId === variantId
              ? { ...item, quantity: Math.min(qty, MAX_PER_LINE) }
              : item,
          ),
    );
  }, []);

  const remove = useCallback((variantId: string) => {
    setItems((prev) => prev.filter((item) => item.variantId !== variantId));
  }, []);

  const clear = useCallback(() => setItems([]), []);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  const value = useMemo<CartApi>(
    () => ({
      items,
      count: items.reduce((total, item) => total + item.quantity, 0),
      add,
      setQuantity,
      remove,
      clear,
      open,
      close,
      isOpen,
      mounted,
    }),
    [items, add, setQuantity, remove, clear, open, close, isOpen, mounted],
  );

  return (
    <CartContext.Provider value={value}>
      {children}
      <MiniCart />
    </CartContext.Provider>
  );
}

export function useCart(): CartApi {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside <CartProvider>");
  return context;
}
