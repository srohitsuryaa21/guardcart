"use client";

import { useEffect, useRef, useState } from "react";
import { getProduct } from "@/lib/catalog";
import type { Cart, Mandate } from "@/lib/mandate";
import { ProductCard } from "./ProductCard";
import type { ChatItem, Step } from "./types";

const SUGGESTIONS = [
  "Camping trip for 2 this weekend: tent, two sleeping bags and a headlamp. Eco-friendly if possible.",
  "Find a thoughtful gift for a coffee lover, around $50.",
  "Get me the cheapest wireless earbuds you can find.",
  "Buy a $100 gift card for my friend.",
];

const TOOL_META: Record<string, { icon: string; label: string }> = {
  search_products: { icon: "🔍", label: "Search" },
  add_to_cart: { icon: "🛒", label: "Add to cart" },
  remove_from_cart: { icon: "➖", label: "Remove" },
  view_cart: { icon: "🧾", label: "Check cart" },
  quote_cart: { icon: "🧮", label: "Price check" },
  request_checkout: { icon: "💳", label: "Request checkout" },
};

/** Tiny formatter for the agent's replies: paragraphs, "- " bullets and **bold**. */
function RichText({ text }: { text: string }) {
  const blocks = text.trim().split(/\n{2,}/);
  const inline = (s: string) =>
    s.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
      part.startsWith("**") && part.endsWith("**") ? <strong key={i}>{part.slice(2, -2)}</strong> : <span key={i}>{part}</span>,
    );
  return (
    <div className="space-y-2">
      {blocks.map((b, i) => {
        const lines = b.split("\n");
        if (lines.every((l) => /^\s*([-*•]|\d+\.)\s/.test(l))) {
          return (
            <ul key={i} className="list-disc space-y-0.5 pl-5">
              {lines.map((l, j) => (
                <li key={j}>{inline(l.replace(/^\s*([-*•]|\d+\.)\s/, ""))}</li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i} className="whitespace-pre-wrap">
            {inline(b)}
          </p>
        );
      })}
    </div>
  );
}

function StepRow({ step }: { step: Step }) {
  const meta = TOOL_META[step.name] ?? { icon: "⚙️", label: step.name };
  const tone =
    step.status === "blocked"
      ? "border-rose-200 bg-rose-50 text-rose-800"
      : step.status === "error"
        ? "border-amber-200 bg-amber-50 text-amber-800"
        : step.status === "running"
          ? "border-slate-200 bg-white text-slate-500"
          : "border-slate-200 bg-slate-50 text-slate-700";
  return (
    <div className={`rounded-lg border px-2.5 py-1.5 text-xs ${tone}`}>
      <div className="flex items-center gap-1.5">
        <span>{step.status === "blocked" ? "🛡️" : meta.icon}</span>
        <span className="font-medium">{step.status === "blocked" ? "Blocked by mandate" : meta.label}</span>
        <span className="truncate opacity-80">· {step.summary ?? "working…"}</span>
        {step.status === "running" && <span className="ml-auto h-3 w-3 animate-spin rounded-full border-2 border-slate-300 border-t-blue-500" />}
      </div>
      {step.reasons && step.reasons.length > 0 && (
        <ul className="mt-1 list-disc pl-6">
          {step.reasons.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ChatPanel({
  items,
  busy,
  mandate,
  cart,
  onSend,
  onStop,
  onGoToCheckout,
  aiConfigured,
}: {
  items: ChatItem[];
  busy: boolean;
  mandate: Mandate;
  cart: Cart;
  onSend: (text: string) => void;
  onStop: () => void;
  onGoToCheckout: () => void;
  aiConfigured: boolean | null;
}) {
  const [draft, setDraft] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const inCart = new Set(cart.map((l) => l.productId));

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [items]);

  const submit = (text: string) => {
    const t = text.trim();
    if (!t || busy) return;
    onSend(t);
    setDraft("");
  };

  return (
    <section className="flex min-h-[520px] flex-col rounded-2xl border border-slate-200 bg-white shadow-sm lg:h-[calc(100vh-7.5rem)]">
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {items.length === 0 && (
          <div className="mx-auto max-w-lg py-8 text-center">
            <div className="text-4xl">🛍️</div>
            <h2 className="mt-3 text-lg font-semibold text-slate-900">Tell the agent what you need</h2>
            <p className="mt-1 text-sm text-slate-500">
              It searches, compares and fills your cart within your mandate. It can&apos;t pay: you approve every purchase in PayPal.
            </p>
            {aiConfigured === false && (
              <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">ANTHROPIC_API_KEY is not set on the server, so the agent can&apos;t run yet.</p>
            )}
            <div className="mt-5 grid gap-2 text-left">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => submit(s)}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 transition hover:border-blue-300 hover:bg-blue-50/50"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {items.map((item) => {
          if (item.kind === "user") {
            return (
              <div key={item.id} className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl rounded-br-md bg-blue-600 px-3.5 py-2 text-sm text-white">{item.text}</div>
              </div>
            );
          }
          if (item.kind === "notice") {
            return (
              <div key={item.id} className={`rounded-xl px-3 py-2 text-sm ${item.tone === "error" ? "bg-rose-50 text-rose-800" : "bg-slate-50 text-slate-700"}`}>
                {item.text}
              </div>
            );
          }
          if (item.kind === "receipt") {
            const r = item.receipt;
            return (
              <div key={item.id} className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                <div className="flex items-center gap-2 font-semibold">
                  <span className="text-lg">✅</span> Paid ${r.amount} {r.currency} with PayPal
                </div>
                <ul className="mt-2 list-disc pl-6 text-emerald-800">
                  {r.items.map((it, i) => (
                    <li key={i}>
                      {it.quantity} × {it.name}
                    </li>
                  ))}
                </ul>
                <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 font-mono text-[11px] text-emerald-800">
                  <dt>Order</dt>
                  <dd className="truncate">{r.orderId}</dd>
                  <dt>Capture</dt>
                  <dd className="truncate">
                    {r.captureId} ({r.captureStatus})
                  </dd>
                  {r.invoiceId && (
                    <>
                      <dt>Invoice</dt>
                      <dd>{r.invoiceId}</dd>
                    </>
                  )}
                  {(r.payerName || r.payerEmail) && (
                    <>
                      <dt>Payer</dt>
                      <dd className="truncate">{[r.payerName, r.payerEmail].filter(Boolean).join(" · ")}</dd>
                    </>
                  )}
                </dl>
              </div>
            );
          }

          // agent turn
          const productIds = [...new Set(item.steps.filter((s) => s.name === "search_products").flatMap((s) => s.productIds ?? []))];
          return (
            <div key={item.id} className="flex gap-2.5">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-blue-600 to-sky-400 text-sm text-white">🤖</div>
              <div className="min-w-0 flex-1 space-y-2">
                {item.thinking && (
                  <div className="whitespace-pre-wrap border-l-2 border-slate-200 pl-2.5 text-xs italic text-slate-500">{item.thinking.trim()}</div>
                )}
                {item.steps.length > 0 && (
                  <div className="space-y-1">
                    {item.steps.map((s) => (
                      <StepRow key={s.id} step={s} />
                    ))}
                  </div>
                )}
                {productIds.length > 0 && (
                  <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                    {productIds.map((id) => {
                      const p = getProduct(id);
                      return p ? <ProductCard key={id} product={p} mandate={mandate} inCart={inCart.has(id)} /> : null;
                    })}
                  </div>
                )}
                {item.text && (
                  <div className="rounded-2xl rounded-tl-md bg-slate-100 px-3.5 py-2.5 text-sm leading-relaxed text-slate-800">
                    <RichText text={item.text} />
                  </div>
                )}
                {!item.done && !item.text && item.steps.every((s) => s.status !== "running") && (
                  <div className="flex gap-1 px-1 py-2">
                    {[0, 1, 2].map((i) => (
                      <span key={i} className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: `${i * 120}ms` }} />
                    ))}
                  </div>
                )}
                {item.checkoutReady && item.done && (
                  <button
                    type="button"
                    onClick={onGoToCheckout}
                    className="rounded-full bg-[#ffc439] px-4 py-1.5 text-sm font-semibold text-slate-900 shadow-sm hover:brightness-95"
                  >
                    Review & approve in PayPal →
                  </button>
                )}
                {item.error && <div className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-800">{item.error}</div>}
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <form
        className="border-t border-slate-100 p-3"
        onSubmit={(e) => {
          e.preventDefault();
          submit(draft);
        }}
      >
        <div className="flex items-end gap-2 rounded-xl border border-slate-200 bg-white p-1.5 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
          <textarea
            rows={1}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit(draft);
              }
            }}
            placeholder="What should I buy for you?"
            className="max-h-32 min-h-[2.25rem] flex-1 resize-none bg-transparent px-2 py-1.5 text-sm text-slate-900 outline-none"
          />
          {busy ? (
            <button type="button" onClick={onStop} className="rounded-lg bg-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-300">
              Stop
            </button>
          ) : (
            <button type="submit" disabled={!draft.trim()} className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40">
              Send
            </button>
          )}
        </div>
      </form>
    </section>
  );
}
