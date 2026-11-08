import { NextResponse } from "next/server";
import { z } from "zod";
import { CartSchema, MandateSchema, evaluateCart } from "@/lib/mandate";
import { createOrder, PayPalError } from "@/lib/paypal";

const Body = z.object({ cart: CartSchema, mandate: MandateSchema });

// Creates the PayPal order. The cart is re-priced from the catalog and
// re-checked against the mandate here, so a tampered browser cannot create an
// order the mandate would not allow.
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const { cart, mandate } = parsed.data;

  const evaluation = evaluateCart(cart, mandate);
  if (!evaluation.lines.length) return NextResponse.json({ error: "Cart is empty" }, { status: 422 });
  if (!evaluation.ok) {
    return NextResponse.json({ error: "Cart violates your mandate", violations: evaluation.violations }, { status: 422 });
  }

  try {
    const order = await createOrder(evaluation, mandate);
    return NextResponse.json({ orderId: order.id, total: evaluation.total });
  } catch (e) {
    if (e instanceof PayPalError) {
      console.error("PayPal create order failed", e.status, JSON.stringify(e.details));
      return NextResponse.json({ error: e.message, details: e.details }, { status: e.status >= 500 ? 502 : e.status });
    }
    throw e;
  }
}
