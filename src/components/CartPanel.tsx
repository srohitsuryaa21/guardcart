"use client";

import { forwardRef, useState } from "react";
import { INSTANCE_LOADING_STATE, PayPalOneTimePaymentButton, usePayPal } from "@paypal/react-paypal-js/sdk-v6";
import { getMerchant } from "@/lib/catalog";
import { evaluateCart, type Cart, type Mandate } from "@/lib/mandate";
import type { Receipt } from "./types";

function BudgetMeter({ total, budget }: { total: number; budget: number }) {
  const pct = Math.min(100, (total / budget) * 100);
  const over = total > budget;
  const color = over ? "bg-rose-500" : pct > 80 ? "bg-amber-400" : "bg-emerald-500";
  return (
    <div>
      <div className="flex items-baseline justify-between text-xs">
        <span className="text-slate-500">Budget used</span>
        <span className={`font-medium ${over ? "text-rose-600" : "text-slate-700"}`}>
          ${total.toFixed(2)} / ${budget.toFixed(2)}
        </span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function PayPalCheckout({
  cart,
  mandate,
  simulateDecline,
  onPaid,
  onError,
}: {
  cart: Cart;
  mandate: Mandate;
  simulateDecline: boolean;
  onPaid: (r: Receipt) => void;
  onError: (msg: string) => void;
}) {
  const { loadingStatus, error } = usePayPal();
  const [busy, setBusy] = useState(false);

  if (loadingStatus === INSTANCE_LOADING_STATE.PENDING) {
    return <div className="h-11 animate-pulse rounded-full bg-slate-100" />;
  }
  if (loadingStatus === INSTANCE_LOADING_STATE.REJECTED) {
    return <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-800">PayPal failed to load: {error?.message}</p>;
  }

  return (
    <div className={busy ? "pointer-events-none opacity-60" : ""}>
      <PayPalOneTimePaymentButton
        type="pay"
        createOrder={async () => {
          const res = await fetch("/api/orders", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ cart, mandate }),
          });
          const data = await res.json();
          if (!res.ok) {
            const msg = data.violations?.map((v: { message: string }) => v.message).join(" ") || data.error || "Could not create order";
            onError(msg);
            throw new Error(msg);
          }
          return { orderId: data.orderId };
        }}
        onApprove={async ({ orderId }) => {
          setBusy(true);
          try {
            const res = await fetch(`/api/orders/${orderId}/capture`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ mandate, simulateDecline }),
            });
            const data = await res.json();
            if (!res.ok) {
              const declined = data.error === "INSTRUMENT_DECLINED";
              onError(
                declined
                  ? "PayPal declined the funding source (sandbox decline simulation). Nothing was charged. Untick the simulation or pick another funding source and try again."
                  : `Capture failed: ${data.error}`,
              );
              return;
            }
            const e = evaluateCart(cart, mandate);
            onPaid({ ...data, items: e.lines.map((l) => ({ name: l.product.name, quantity: l.quantity })) });
          } finally {
            setBusy(false);
          }
        }}
        onCancel={() => onError("You closed PayPal before approving. Nothing was charged.")}
        onError={(err) => {
          console.error("PayPal error", err);
        }}
      />
    </div>
  );
}

export const CartPanel = forwardRef<
  HTMLElement,
  {
    cart: Cart;
    mandate: Mandate;
    onRemove: (productId: string) => void;
    paypalReady: boolean;
    paypalMissing: boolean;
    highlight: boolean;
    simulateDecline: boolean;
    onPaid: (r: Receipt) => void;
    onError: (msg: string) => void;
  }
>(function CartPanel(props, ref) {
  const { cart, mandate } = props;
  const e = evaluateCart(cart, mandate);
  const empty = e.lines.length === 0;

  return (
    <section
      ref={ref}
      className={`rounded-2xl border bg-white p-4 shadow-sm transition ${props.highlight ? "border-blue-400 ring-4 ring-blue-100" : "border-slate-200"}`}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900">Cart</h2>
        <span className="text-xs text-slate-500">{e.lines.reduce((s, l) => s + l.quantity, 0)} items</span>
      </div>

      <div className="mt-3">
        <BudgetMeter total={e.total} budget={mandate.budget} />
      </div>

      {empty ? (
        <p className="mt-4 rounded-xl border border-dashed border-slate-200 px-3 py-6 text-center text-xs text-slate-400">The agent will add items here.</p>
      ) : (
        <ul className="mt-4 divide-y divide-slate-100">
          {e.lines.map((l) => (
            <li key={l.product.id} className="flex items-center gap-3 py-2.5">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-slate-50 text-xl">{l.product.emoji}</span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-slate-900">{l.product.name}</div>
                <div className="truncate text-xs text-slate-500">
                  {l.quantity} × ${l.product.price.toFixed(2)} · {getMerchant(l.product.merchantId).name}
                </div>
              </div>
              <div className="text-sm font-medium text-slate-900">${l.lineTotal.toFixed(2)}</div>
              <button
                type="button"
                aria-label={`Remove ${l.product.name}`}
                onClick={() => props.onRemove(l.product.id)}
                className="rounded-md px-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      {!empty && (
        <dl className="mt-2 space-y-1 border-t border-slate-100 pt-3 text-sm">
          <div className="flex justify-between text-slate-600">
            <dt>Items</dt>
            <dd>${e.itemTotal.toFixed(2)}</dd>
          </div>
          <div className="flex justify-between text-slate-600">
            <dt>Shipping</dt>
            <dd>{e.shipping === 0 ? "Free" : `$${e.shipping.toFixed(2)}`}</dd>
          </div>
          <div className="flex justify-between font-semibold text-slate-900">
            <dt>Total</dt>
            <dd>${e.total.toFixed(2)}</dd>
          </div>
        </dl>
      )}

      {!empty && !e.ok && (
        <div className="mt-3 rounded-xl bg-rose-50 p-3 text-xs text-rose-800">
          <div className="font-semibold">🛡️ Checkout locked by your mandate</div>
          <ul className="mt-1 list-disc pl-5">
            {e.violations.map((v, i) => (
              <li key={i}>{v.message}</li>
            ))}
          </ul>
        </div>
      )}

      {!empty && e.ok && (
        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-1.5 text-xs text-emerald-700">
            <span>✓</span> Fits your mandate. Approve to pay.
          </div>
          {props.paypalMissing ? (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">PAYPAL_CLIENT_ID is not set on the server.</p>
          ) : props.paypalReady ? (
            <PayPalCheckout cart={cart} mandate={mandate} simulateDecline={props.simulateDecline} onPaid={props.onPaid} onError={props.onError} />
          ) : (
            <div className="h-11 animate-pulse rounded-full bg-slate-100" />
          )}
          <p className="text-center text-[11px] text-slate-400">The agent can&apos;t pay. Only you can, here.</p>
        </div>
      )}
    </section>
  );
});
