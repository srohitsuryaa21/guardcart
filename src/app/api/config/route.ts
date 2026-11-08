import { connection } from "next/server";
import { PAYPAL_ENVIRONMENT } from "@/lib/paypal";

// Exposes only public values: the PayPal client ID is meant for the browser.
export async function GET() {
  await connection(); // read env at request time, not at build time
  return Response.json({
    paypalClientId: process.env.PAYPAL_CLIENT_ID ?? null,
    paypalEnvironment: PAYPAL_ENVIRONMENT,
    aiConfigured: Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN),
  });
}
