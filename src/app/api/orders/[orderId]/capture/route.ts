import { NextResponse } from "next/server";
import { z } from "zod";
import { MandateSchema } from "@/lib/mandate";
import { captureOrder, getOrder, PayPalError } from "@/lib/paypal";

const Body = z.object({
  mandate: MandateSchema,
  // Sandbox negative testing: force a decline to demo error recovery.
  simulateDecline: z.boolean().optional(),
});

export async function POST(req: Request, ctx: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await ctx.params;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const { mandate, simulateDecline } = parsed.data;

  try {
    // Last line of defence: re-read the order from PayPal and check the amount
    // the buyer approved still fits the mandate before taking the money.
    const order = await getOrder(orderId);
    const unit = order.purchase_units?.[0];
    const amount = Number(unit?.amount?.value ?? NaN);
    if (order.status !== "APPROVED") {
      return NextResponse.json({ error: `Order is ${order.status}, not APPROVED` }, { status: 409 });
    }
    if (unit?.amount?.currency_code !== "USD" || !(amount <= mandate.budget)) {
      return NextResponse.json(
        { error: `Order amount ${unit?.amount?.value} ${unit?.amount?.currency_code} exceeds the mandate budget of $${mandate.budget}` },
        { status: 422 },
      );
    }

    const result = await captureOrder(
      orderId,
      simulateDecline ? JSON.stringify({ mock_application_codes: "INSTRUMENT_DECLINED" }) : undefined,
    );
    const capture = result.purchase_units?.[0]?.payments?.captures?.[0];
    return NextResponse.json({
      orderId: result.id,
      status: result.status,
      captureId: capture?.id ?? null,
      captureStatus: capture?.status ?? null,
      amount: capture?.amount?.value ?? unit?.amount?.value,
      currency: capture?.amount?.currency_code ?? "USD",
      invoiceId: unit?.invoice_id ?? null,
      payerEmail: result.payer?.email_address ?? null,
      payerName: [result.payer?.name?.given_name, result.payer?.name?.surname].filter(Boolean).join(" ") || null,
    });
  } catch (e) {
    if (e instanceof PayPalError) {
      console.error("PayPal capture failed", e.status, JSON.stringify(e.details));
      return NextResponse.json({ error: e.message, details: e.details }, { status: e.status >= 500 ? 502 : e.status });
    }
    throw e;
  }
}
