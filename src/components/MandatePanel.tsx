"use client";

import { CATEGORIES } from "@/lib/catalog";
import type { Mandate } from "@/lib/mandate";

const LABELS: Record<string, string> = {
  electronics: "Electronics",
  home: "Home",
  kitchen: "Kitchen",
  outdoor: "Outdoor",
  apparel: "Apparel",
  beauty: "Beauty",
  toys: "Toys",
  office: "Office",
  gift_cards: "Gift cards",
  alcohol: "Alcohol",
};

function NumberField(props: {
  label: string;
  hint?: string;
  value: number;
  prefix?: string;
  step?: number;
  min?: number;
  max?: number;
  onChange: (n: number) => void;
}) {
  return (
    <label className="block">
      <span className="flex items-baseline justify-between text-xs font-medium text-slate-600">
        {props.label}
        {props.hint && <span className="font-normal text-slate-400">{props.hint}</span>}
      </span>
      <div className="mt-1 flex items-center rounded-lg border border-slate-200 bg-white px-2.5 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
        {props.prefix && <span className="text-sm text-slate-400">{props.prefix}</span>}
        <input
          type="number"
          className="w-full bg-transparent px-1 py-1.5 text-sm text-slate-900 outline-none"
          value={Number.isFinite(props.value) ? props.value : ""}
          step={props.step ?? 1}
          min={props.min}
          max={props.max}
          onChange={(e) => {
            const n = Number(e.target.value);
            if (Number.isFinite(n)) props.onChange(n);
          }}
        />
      </div>
    </label>
  );
}

export function MandatePanel({
  mandate,
  onChange,
  simulateDecline,
  onSimulateDecline,
  agentSeesRules,
  onAgentSeesRules,
}: {
  mandate: Mandate;
  onChange: (m: Mandate) => void;
  simulateDecline: boolean;
  onSimulateDecline: (v: boolean) => void;
  agentSeesRules: boolean;
  onAgentSeesRules: (v: boolean) => void;
}) {
  const set = <K extends keyof Mandate>(k: K, v: Mandate[K]) => onChange({ ...mandate, [k]: v });

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-50 text-lg">🛡️</span>
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Spending mandate</h2>
          <p className="text-xs text-slate-500">Hard rules. Enforced in code, not by the AI.</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <NumberField label="Total budget" hint="items + shipping" prefix="$" value={mandate.budget} min={1} step={5} onChange={(n) => set("budget", Math.max(1, n))} />
        </div>
        <NumberField label="Max per item" prefix="$" value={mandate.perItemMax} min={1} step={5} onChange={(n) => set("perItemMax", Math.max(1, n))} />
        <NumberField label="Max qty / item" value={mandate.maxQuantityPerItem} min={1} max={20} onChange={(n) => set("maxQuantityPerItem", Math.min(20, Math.max(1, Math.round(n))))} />
        <NumberField label="Min seller rating" value={mandate.minMerchantRating} min={0} max={5} step={0.1} onChange={(n) => set("minMerchantRating", Math.min(5, Math.max(0, n)))} />
        <label className="block">
          <span className="text-xs font-medium text-slate-600">Deliver within</span>
          <select
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-[7px] text-sm text-slate-900 outline-none focus:border-blue-500"
            value={mandate.deliverWithinDays ?? "any"}
            onChange={(e) => set("deliverWithinDays", e.target.value === "any" ? null : Number(e.target.value))}
          >
            {[2, 3, 5, 7, 14].map((d) => (
              <option key={d} value={d}>
                {d} days
              </option>
            ))}
            <option value="any">Any time</option>
          </select>
        </label>
      </div>

      <div className="mt-4">
        <span className="text-xs font-medium text-slate-600">Blocked categories</span>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {CATEGORIES.map((c) => {
            const blocked = mandate.blockedCategories.includes(c);
            return (
              <button
                key={c}
                type="button"
                aria-pressed={blocked}
                onClick={() =>
                  set("blockedCategories", blocked ? mandate.blockedCategories.filter((x) => x !== c) : [...mandate.blockedCategories, c])
                }
                className={`rounded-full border px-2.5 py-1 text-xs transition ${
                  blocked
                    ? "border-rose-200 bg-rose-50 text-rose-700 line-through decoration-rose-300"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                }`}
              >
                {LABELS[c]}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4 border-t border-slate-100 pt-3">
        <div className="flex items-start justify-between gap-3">
          <div className="text-xs text-slate-600">
            <div className="font-medium text-slate-700">Agent sees these rules</div>
            <div className="mt-0.5">
              {agentSeesRules ? "The agent plans around your rules." : "Stress test: the agent shops blind. Only the code guard stops it."}
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={agentSeesRules}
            aria-label="Agent sees these rules"
            onClick={() => onAgentSeesRules(!agentSeesRules)}
            className={`relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition ${agentSeesRules ? "bg-blue-600" : "bg-slate-300"}`}
          >
            <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${agentSeesRules ? "left-[18px]" : "left-0.5"}`} />
          </button>
        </div>
      </div>

      <div className="mt-3 border-t border-slate-100 pt-3">
        <label className="flex cursor-pointer items-start gap-2 text-xs text-slate-600">
          <input type="checkbox" className="mt-0.5 accent-blue-600" checked={simulateDecline} onChange={(e) => onSimulateDecline(e.target.checked)} />
          <span>
            <span className="font-medium text-slate-700">Sandbox: simulate a card decline</span>
            <br />
            Uses PayPal negative testing on capture.
          </span>
        </label>
      </div>
    </section>
  );
}
