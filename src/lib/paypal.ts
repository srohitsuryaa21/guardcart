// Minimal PayPal REST client (Orders v2) for the sandbox.
// Server-only: uses the client secret.

import "server-only";
import { randomUUID } from "crypto";
import type { CartEvaluation, Mandate } from "./mandate";
import { getMerchant } from "./catalog";

const ENV = (process.env.PAYPAL_ENVIRONMENT ?? "sandbox").toLowerCase();
export const PAYPAL_ENVIRONMENT: "sandbox" | "production" = ENV === "production" ? "production" : "sandbox";
const BASE = PAYPAL_ENVIRONMENT === "production" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";

export class PayPalError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: unknown,
  ) {
    super(message);
  }
}

export function getClientId(): string {
  const id = process.env.PAYPAL_CLIENT_ID;
  if (!id) throw new PayPalError("PAYPAL_CLIENT_ID is not set", 500);
  return id;
}

let cachedToken: { token: string; expiresAt: number } | null = null;

export async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.token;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  if (!secret) throw new PayPalError("PAYPAL_CLIENT_SECRET is not set", 500);
  const auth = Buffer.from(`${getClientId()}:${secret}`).toString("base64");
  const res = await fetch(`${BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });
  const data = await res.json();
  if (!res.ok) throw new PayPalError("PayPal auth failed", res.status, data);
  cachedToken = { token: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return cachedToken.token;
}

async function paypalFetch(path: string, init: RequestInit & { mockResponse?: string } = {}) {
  const token = await getAccessToken();
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "PayPal-Request-Id": randomUUID(),
    Prefer: "return=representation",
  };
  // Sandbox negative testing: https://developer.paypal.com/tools/sandbox/negative-testing/
  if (init.mockResponse && PAYPAL_ENVIRONMENT === "sandbox") headers["PayPal-Mock-Response"] = init.mockResponse;
  const res = await fetch(`${BASE}${path}`, { ...init, headers, cache: "no-store" });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) {
    const issue = data?.details?.[0]?.issue ?? data?.name ?? "PAYPAL_ERROR";
    throw new PayPalError(issue, res.status, data);
  }
  return data;
}

const money = (n: number) => ({ currency_code: "USD", value: n.toFixed(2) });

/** Build an itemized Orders v2 order from an already-validated cart evaluation. */
export async function createOrder(evaluation: CartEvaluation, mandate: Mandate) {
  const invoiceId = `GC-${Date.now().toString(36).toUpperCase()}-${randomUUID().slice(0, 4).toUpperCase()}`;
  const merchants = [...new Set(evaluation.lines.map((l) => getMerchant(l.product.merchantId).name))];
  const body = {
    intent: "CAPTURE",
    purchase_units: [
      {
        reference_id: "guardcart",
        invoice_id: invoiceId,
        // custom_id travels with the payment so the mandate is auditable later
        custom_id: `budget=${mandate.budget};cap=${mandate.perItemMax}`.slice(0, 127),
        description: `GuardCart agent purchase from ${merchants.join(", ")}`.slice(0, 127),
        soft_descriptor: "GUARDCART",
        amount: {
          ...money(evaluation.total),
          breakdown: {
            item_total: money(evaluation.itemTotal),
            shipping: money(evaluation.shipping),
          },
        },
        items: evaluation.lines.map((l) => ({
          name: l.product.name.slice(0, 127),
          sku: l.product.id,
          quantity: String(l.quantity),
          unit_amount: money(l.product.price),
          category: "PHYSICAL_GOODS",
          description: `${l.product.brand} via ${getMerchant(l.product.merchantId).name}`.slice(0, 127),
        })),
      },
    ],
    payment_source: {
      paypal: {
        experience_context: {
          brand_name: "GuardCart",
          user_action: "PAY_NOW",
          shipping_preference: "GET_FROM_FILE",
        },
      },
    },
  };
  return paypalFetch("/v2/checkout/orders", { method: "POST", body: JSON.stringify(body) });
}

export async function getOrder(orderId: string) {
  return paypalFetch(`/v2/checkout/orders/${encodeURIComponent(orderId)}`, { method: "GET" });
}

export async function captureOrder(orderId: string, mockResponse?: string) {
  return paypalFetch(`/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, {
    method: "POST",
    body: "{}",
    mockResponse,
  });
}
