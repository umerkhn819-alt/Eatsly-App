import React, { createContext, useContext, useMemo, useState } from "react";

export type CartItem = {
  id: string;
  name: string;
  amount?: string;
  category: "Produce" | "Protein" | "Dairy" | "Pantry" | "Spices" | "Other";
  checked: boolean;
  qty: number;
};

type CartContextValue = {
  items: CartItem[];
  addItemsFromRecipe: (recipeTitle: string, ingredients: Array<{ name: string; amount?: string }>) => void;
  toggleItem: (id: string) => void;
  incrementQty: (id: string) => void;
  decrementQty: (id: string) => void;
  clearChecked: () => void;
  clearAll: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

function inferCategory(name: string): CartItem["category"] {
  const s = name.toLowerCase();
  if (/(chicken|beef|fish|salmon|tofu|egg|shrimp|turkey|pork|tuna)/.test(s)) return "Protein";
  if (/(milk|cheese|yogurt|butter|cream|cheddar|feta|parmesan)/.test(s)) return "Dairy";
  if (/(salt|pepper|cumin|paprika|chili|garlic powder|oregano|basil|turmeric|ginger)/.test(s)) return "Spices";
  if (/(rice|pasta|flour|oil|sauce|bean|lentil|oat|noodle|bread|stock|soy sauce|mirin|oyster sauce|cornstarch)/.test(s)) return "Pantry";
  if (/(onion|tomato|potato|pepper|spinach|lettuce|carrot|lemon|apple|banana|cucumber|avocado|broccoli|zucchini|edamame)/.test(s)) return "Produce";
  return "Other";
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      addItemsFromRecipe: (_recipeTitle, ingredients) => {
        setItems((prev) => {
          const next = [...prev];
          for (const ingredient of ingredients) {
            const key = ingredient.name.trim().toLowerCase();
            if (!key) continue;
            const existing = next.find((i) => i.name.toLowerCase() === key);
            if (existing) {
              existing.qty += 1;
              continue;
            }
            next.push({
              id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              name: ingredient.name.trim(),
              amount: ingredient.amount,
              category: inferCategory(ingredient.name),
              checked: false,
              qty: 1,
            });
          }
          return [...next];
        });
      },
      toggleItem: (id) =>
        setItems((prev) =>
          prev.map((item) => (item.id === id ? { ...item, checked: !item.checked } : item)),
        ),
      incrementQty: (id) =>
        setItems((prev) =>
          prev.map((item) => (item.id === id ? { ...item, qty: item.qty + 1 } : item)),
        ),
      decrementQty: (id) =>
        setItems((prev) =>
          prev
            .map((item) => (item.id === id ? { ...item, qty: Math.max(0, item.qty - 1) } : item))
            .filter((item) => item.qty > 0),
        ),
      clearChecked: () => setItems((prev) => prev.filter((item) => !item.checked)),
      clearAll: () => setItems([]),
    }),
    [items],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
