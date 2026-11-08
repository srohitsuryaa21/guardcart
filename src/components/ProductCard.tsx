"use client";

import { getMerchant, type Product } from "@/lib/catalog";
import { checkProduct, type Mandate } from "@/lib/mandate";

export function ProductCard({ product, mandate, inCart }: { product: Product; mandate: Mandate; inCart: boolean }) {
  const merchant = getMerchant(product.merchantId);
  const issues = checkProduct(product, 1, mandate);
  const allowed = issues.length === 0;
  return (
    <div
      className={`relative w-44 shrink-0 rounded-xl border bg-white p-3 text-left shadow-sm ${
        inCart ? "border-blue-400 ring-2 ring-blue-100" : allowed ? "border-slate-200" : "border-rose-200"
      }`}
      title={issues.map((i) => i.message).join("\n") || product.description}
    >
      <div className={`grid h-16 place-items-center rounded-lg text-3xl ${allowed ? "bg-slate-50" : "bg-rose-50/60 grayscale"}`}>{product.emoji}</div>
      <div className="mt-2 line-clamp-2 min-h-[2.5rem] text-xs font-medium leading-tight text-slate-900">{product.name}</div>
      <div className="mt-1 flex items-center justify-between text-xs">
        <span className="font-semibold text-slate-900">${product.price.toFixed(2)}</span>
        <span className="text-slate-500">★ {product.rating}</span>
      </div>
      <div className="mt-0.5 truncate text-[11px] text-slate-500">
        {merchant.name} · {product.shipDays === 0 ? "instant" : `${product.shipDays}d`}
      </div>
      <div className="mt-2">
        {inCart ? (
          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">In cart</span>
        ) : allowed ? (
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">Allowed</span>
        ) : (
          <span className="line-clamp-2 rounded-md bg-rose-50 px-2 py-0.5 text-[11px] font-medium text-rose-700">{issues[0].message}</span>
        )}
      </div>
    </div>
  );
}
