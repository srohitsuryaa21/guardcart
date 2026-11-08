// The spending mandate: hard rules the shopper sets for the agent.
// These are enforced in code on every cart change, again when the PayPal
// order is created, and again before capture. The model is told the rules so
// it can plan, but it cannot talk its way past them.

import { z } from "zod";
import { CATEGORIES, getMerchant, getProduct, type Product } from "./catalog";

export const MandateSchema = z.object({
  budget: z.number().positive().max(10000),
  perItemMax: z.number().positive().max(10000),
  maxQuantityPerItem: z.number().int().min(1).max(20),
  blockedCategories: z.array(z.enum(CATEGORIES as [string, ...string[]])),
  minMerchantRating: z.number().min(0).max(5),
  deliverWithinDays: z.number().int().min(0).max(60).nullable(),
});
export type Mandate = z.infer<typeof MandateSchema>;

export const DEFAULT_MANDATE: Mandate = {
  budget: 150,
  perItemMax: 100,
  maxQuantityPerItem: 3,
  blockedCategories: ["gift_cards", "alcohol"],
  minMerchantRating: 4.0,
  deliverWithinDays: 7,
};

export const CartLineSchema = z.object({
  productId: z.string(),
  quantity: z.number().int().min(1).max(99),
});
export const CartSchema = z.array(CartLineSchema).max(50);
export type CartLine = z.infer<typeof CartLineSchema>;
export type Cart = CartLine[];

export interface Violation {
  rule:
    | "unknown_product"
    | "blocked_category"
    | "per_item_max"
    | "max_quantity"
    | "merchant_rating"
    | "delivery_window"
    | "budget"
    | "empty_cart";
  message: string;
  productId?: string;
}

export interface PricedLine {
  product: Product;
  quantity: number;
  lineTotal: number;
}

export interface CartEvaluation {
  lines: PricedLine[];
  itemTotal: number;
  shipping: number;
  total: number;
  remaining: number;
  violations: Violation[];
  ok: boolean;
}

export const round2 = (n: number) => Math.round(n * 100) / 100;

/** Rules that apply to a single product regardless of the rest of the cart. */
export function checkProduct(product: Product, quantity: number, m: Mandate): Violation[] {
  const v: Violation[] = [];
  const merchant = getMerchant(product.merchantId);
  if (m.blockedCategories.includes(product.category)) {
    v.push({ rule: "blocked_category", productId: product.id, message: `Category "${product.category}" is blocked by your mandate.` });
  }
  if (product.price > m.perItemMax) {
    v.push({ rule: "per_item_max", productId: product.id, message: `$${product.price.toFixed(2)} exceeds your per-item limit of $${m.perItemMax.toFixed(2)}.` });
  }
  if (quantity > m.maxQuantityPerItem) {
    v.push({ rule: "max_quantity", productId: product.id, message: `Quantity ${quantity} exceeds your limit of ${m.maxQuantityPerItem} per item.` });
  }
  if (merchant.rating < m.minMerchantRating) {
    v.push({ rule: "merchant_rating", productId: product.id, message: `Seller "${merchant.name}" is rated ${merchant.rating}, below your minimum of ${m.minMerchantRating}.` });
  }
  if (m.deliverWithinDays != null && product.shipDays > m.deliverWithinDays) {
    v.push({ rule: "delivery_window", productId: product.id, message: `Ships in ${product.shipDays} days; you need it within ${m.deliverWithinDays}.` });
  }
  return v;
}

/** Price the cart from the catalog (never from client input) and check every rule. */
export function evaluateCart(cart: Cart, m: Mandate): CartEvaluation {
  const violations: Violation[] = [];
  const lines: PricedLine[] = [];
  const merchants = new Set<string>();

  for (const line of cart) {
    const product = getProduct(line.productId);
    if (!product) {
      violations.push({ rule: "unknown_product", productId: line.productId, message: `Unknown product ${line.productId}.` });
      continue;
    }
    merchants.add(product.merchantId);
    lines.push({ product, quantity: line.quantity, lineTotal: round2(product.price * line.quantity) });
    violations.push(...checkProduct(product, line.quantity, m));
  }

  const itemTotal = round2(lines.reduce((s, l) => s + l.lineTotal, 0));
  const shipping = round2([...merchants].reduce((s, id) => s + getMerchant(id).shipping, 0));
  const total = round2(itemTotal + shipping);

  if (total > m.budget) {
    violations.push({ rule: "budget", message: `Cart total $${total.toFixed(2)} (incl. $${shipping.toFixed(2)} shipping) exceeds your budget of $${m.budget.toFixed(2)}.` });
  }

  return {
    lines,
    itemTotal,
    shipping,
    total,
    remaining: round2(m.budget - total),
    violations,
    ok: violations.length === 0,
  };
}

/** Try a cart change; returns the new cart only if the result passes every rule. */
export function tryUpdateCart(
  cart: Cart,
  productId: string,
  quantity: number,
  m: Mandate,
): { ok: true; cart: Cart; evaluation: CartEvaluation } | { ok: false; violations: Violation[]; evaluation: CartEvaluation } {
  const next: Cart = cart.filter((l) => l.productId !== productId);
  if (quantity > 0) next.push({ productId, quantity });
  const evaluation = evaluateCart(next, m);
  if (!evaluation.ok) return { ok: false, violations: evaluation.violations, evaluation };
  return { ok: true, cart: next, evaluation };
}

export function describeMandate(m: Mandate): string {
  return [
    `Total budget: $${m.budget.toFixed(2)} (items + shipping)`,
    `Max price per item: $${m.perItemMax.toFixed(2)}`,
    `Max quantity per item: ${m.maxQuantityPerItem}`,
    `Blocked categories: ${m.blockedCategories.length ? m.blockedCategories.join(", ") : "none"}`,
    `Minimum seller rating: ${m.minMerchantRating}`,
    `Must arrive within: ${m.deliverWithinDays == null ? "no limit" : `${m.deliverWithinDays} days`}`,
  ].join("\n");
}
