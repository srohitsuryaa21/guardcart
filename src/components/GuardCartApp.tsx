"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PayPalProvider } from "@paypal/react-paypal-js/sdk-v6";
import { DEFAULT_MANDATE, MandateSchema, type Cart, type Mandate } from "@/lib/mandate";
import { ChatPanel } from "./ChatPanel";
import { CartPanel } from "./CartPanel";
import { MandatePanel } from "./MandatePanel";
import type { ChatItem, Receipt, Step } from "./types";

type AgentItem = Extract<ChatItem, { kind: "agent" }>;
type Config = { paypalClientId: string | null; paypalEnvironment: "sandbox" | "production"; aiConfigured: boolean };

const MANDATE_KEY = "guardcart.mandate.v1";
const uid = () => Math.random().toString(36).slice(2, 10);

function loadMandate(): Mandate {
  try {
    const raw = localStorage.getItem(MANDATE_KEY);
    if (raw) {
      const parsed = MandateSchema.safeParse(JSON.parse(raw));
      if (parsed.success) return parsed.data;
    }
  } catch {}
  return DEFAULT_MANDATE;
}

export function GuardCartApp() {
  const [config, setConfig] = useState<Config | null>(null);
  const [mandate, setMandateState] = useState<Mandate>(DEFAULT_MANDATE);
  const [cart, setCart] = useState<Cart>([]);
  const [items, setItems] = useState<ChatItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [simulateDecline, setSimulateDecline] = useState(false);
  const [agentSeesRules, setAgentSeesRules] = useState(true);
  const [highlightCart, setHighlightCart] = useState(false);
  // Raw Claude API messages from earlier turns; sent back verbatim.
  const historyRef = useRef<unknown[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const cartRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setMandateState(loadMandate());
    fetch("/api/config")
      .then((r) => r.json())
      .then(setConfig)
      .catch(() => setConfig({ paypalClientId: null, paypalEnvironment: "sandbox", aiConfigured: false }));
  }, []);

  const setMandate = (m: Mandate) => {
    setMandateState(m);
    try {
      localStorage.setItem(MANDATE_KEY, JSON.stringify(m));
    } catch {}
  };

  const patchAgent = (id: string, fn: (a: AgentItem) => AgentItem) =>
    setItems((prev) => prev.map((it) => (it.kind === "agent" && it.id === id ? fn(it) : it)));

  const patchStep = (agentId: string, stepId: string, fn: (s: Step) => Step) =>
    patchAgent(agentId, (a) => ({ ...a, steps: a.steps.map((s) => (s.id === stepId ? fn(s) : s)) }));

  const goToCheckout = useCallback(() => {
    cartRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlightCart(true);
    setTimeout(() => setHighlightCart(false), 2200);
  }, []);

  const send = async (text: string) => {
    const agentId = uid();
    setItems((prev) => [
      ...prev,
      { kind: "user", id: uid(), text },
      { kind: "agent", id: agentId, text: "", thinking: "", steps: [], checkoutReady: false, done: false },
    ]);
    setBusy(true);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ history: historyRef.current, message: text, cart, mandate, agentSeesRules }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) throw new Error(`Agent request failed (${res.status})`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let readyForCheckout = false;
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, nl).trim();
          buf = buf.slice(nl + 1);
          if (!line) continue;
          const ev = JSON.parse(line);
          switch (ev.type) {
            case "thinking":
              patchAgent(agentId, (a) => ({ ...a, thinking: a.thinking + ev.delta }));
              break;
            case "text":
              patchAgent(agentId, (a) => ({ ...a, text: a.text + ev.delta }));
              break;
            case "tool_start":
              patchAgent(agentId, (a) =>
                a.steps.some((s) => s.id === ev.id) ? a : { ...a, steps: [...a.steps, { id: ev.id, name: ev.name, input: ev.input, status: "running" }] },
              );
              break;
            case "blocked":
              // the matching tool_result follows; remember reasons on the latest add step
              patchAgent(agentId, (a) => {
                const steps = [...a.steps];
                for (let i = steps.length - 1; i >= 0; i--) {
                  if (steps[i].name === "add_to_cart" && steps[i].status === "running") {
                    steps[i] = { ...steps[i], status: "blocked", reasons: ev.reasons };
                    break;
                  }
                }
                return { ...a, steps };
              });
              break;
            case "tool_result":
              patchStep(agentId, ev.id, (s) => ({
                ...s,
                status: s.status === "blocked" ? "blocked" : ev.ok ? "ok" : "error",
                summary: ev.summary,
                productIds: ev.productIds,
              }));
              break;
            case "cart":
              setCart(ev.cart);
              break;
            case "checkout_ready":
              readyForCheckout = true;
              patchAgent(agentId, (a) => ({ ...a, checkoutReady: true }));
              break;
            case "done":
              historyRef.current = [...historyRef.current, ...ev.messages];
              break;
            case "error":
              patchAgent(agentId, (a) => ({ ...a, error: ev.message }));
              break;
          }
        }
      }
      if (readyForCheckout) goToCheckout();
    } catch (err) {
      if (!controller.signal.aborted) {
        patchAgent(agentId, (a) => ({ ...a, error: err instanceof Error ? err.message : String(err) }));
      }
    } finally {
      patchAgent(agentId, (a) => ({ ...a, done: true, steps: a.steps.map((s) => (s.status === "running" ? { ...s, status: "error", summary: "stopped" } : s)) }));
      setBusy(false);
      abortRef.current = null;
    }
  };

  const onPaid = (r: Receipt) => {
    setItems((prev) => [...prev, { kind: "receipt", id: uid(), receipt: r }]);
    setCart([]);
  };
  const onCheckoutError = (msg: string) => setItems((prev) => [...prev, { kind: "notice", id: uid(), tone: "error", text: msg }]);

  const page = (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-[1400px] items-center gap-3 px-4 py-3">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-[#003087] to-[#0070e0] text-lg text-white shadow-sm">🛡️</div>
          <div className="min-w-0">
            <h1 className="text-base font-semibold leading-tight text-slate-900">GuardCart</h1>
            <p className="truncate text-xs text-slate-500">An AI shopper that spends only within your rules, and only after you approve in PayPal.</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {config?.paypalEnvironment === "sandbox" && (
              <span className="whitespace-nowrap rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-amber-800">PayPal sandbox</span>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-[1400px] gap-4 px-4 py-4 lg:grid-cols-[300px_minmax(0,1fr)_360px]">
        <div className="order-2 lg:order-1">
          <div className="lg:sticky lg:top-[4.5rem]">
            <MandatePanel mandate={mandate} onChange={setMandate} simulateDecline={simulateDecline}
              onSimulateDecline={setSimulateDecline}
              agentSeesRules={agentSeesRules}
              onAgentSeesRules={setAgentSeesRules}
            />
          </div>
        </div>
        <div className="order-1 min-w-0 lg:order-2">
          <ChatPanel
            items={items}
            busy={busy}
            mandate={mandate}
            cart={cart}
            onSend={send}
            onStop={() => abortRef.current?.abort()}
            onGoToCheckout={goToCheckout}
            aiConfigured={config ? config.aiConfigured : null}
          />
        </div>
        <div className="order-3">
          <div className="lg:sticky lg:top-[4.5rem]">
            <CartPanel
              ref={cartRef}
              cart={cart}
              mandate={mandate}
              onRemove={(id) => setCart((c) => c.filter((l) => l.productId !== id))}
              paypalReady={Boolean(config?.paypalClientId)}
              paypalMissing={config !== null && !config.paypalClientId}
              highlight={highlightCart}
              simulateDecline={simulateDecline}
              onPaid={onPaid}
              onError={onCheckoutError}
            />
          </div>
        </div>
      </main>
    </div>
  );

  if (!config?.paypalClientId) return page;
  return (
    <PayPalProvider clientId={config.paypalClientId} environment={config.paypalEnvironment} components={["paypal-payments"]} pageType="checkout">
      {page}
    </PayPalProvider>
  );
}
