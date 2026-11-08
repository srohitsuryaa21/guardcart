// Demo product catalog. Every product is sold by one of the sandbox "merchants"
// below; payment always settles to this app's PayPal sandbox business account.
// Prices here are the single source of truth: the server never trusts a price
// that came from the browser or from the model.

export type Category =
  | "electronics"
  | "home"
  | "kitchen"
  | "outdoor"
  | "apparel"
  | "beauty"
  | "toys"
  | "office"
  | "gift_cards"
  | "alcohol";

export const CATEGORIES: Category[] = [
  "electronics",
  "home",
  "kitchen",
  "outdoor",
  "apparel",
  "beauty",
  "toys",
  "office",
  "gift_cards",
  "alcohol",
];

export interface Merchant {
  id: string;
  name: string;
  rating: number; // 0-5 trust score
  shipping: number; // flat shipping fee in USD per order from this merchant
}

export interface Product {
  id: string;
  name: string;
  brand: string;
  merchantId: string;
  category: Category;
  price: number;
  rating: number;
  reviews: number;
  shipDays: number;
  tags: string[];
  emoji: string;
  description: string;
}

export const MERCHANTS: Record<string, Merchant> = {
  northwind: { id: "northwind", name: "Northwind Outfitters", rating: 4.7, shipping: 0 },
  brightline: { id: "brightline", name: "Brightline Electronics", rating: 4.5, shipping: 4.99 },
  hearth: { id: "hearth", name: "Hearth & Co.", rating: 4.8, shipping: 0 },
  verdant: { id: "verdant", name: "Verdant Goods", rating: 4.9, shipping: 3.5 },
  quickship: { id: "quickship", name: "QuickShip Deals", rating: 2.6, shipping: 0 },
  inkwell: { id: "inkwell", name: "Inkwell Supply", rating: 4.6, shipping: 2.99 },
};

export const PRODUCTS: Product[] = [
  // electronics
  { id: "el-001", name: "Aurora Wireless Earbuds", brand: "Lumen", merchantId: "brightline", category: "electronics", price: 59.0, rating: 4.4, reviews: 2140, shipDays: 2, tags: ["bluetooth", "noise-cancelling", "gift"], emoji: "🎧", description: "Compact ANC earbuds with 28h battery and wireless charging case." },
  { id: "el-002", name: "Aurora Pro Earbuds", brand: "Lumen", merchantId: "brightline", category: "electronics", price: 149.0, rating: 4.7, reviews: 980, shipDays: 2, tags: ["bluetooth", "noise-cancelling", "premium"], emoji: "🎧", description: "Flagship earbuds with spatial audio and adaptive ANC." },
  { id: "el-003", name: "Budget Buds X", brand: "Zentro", merchantId: "quickship", category: "electronics", price: 12.99, rating: 3.1, reviews: 412, shipDays: 9, tags: ["bluetooth", "cheap"], emoji: "🎧", description: "Very cheap earbuds. Mixed reviews on durability." },
  { id: "el-004", name: "PocketCharge 10K Power Bank", brand: "Voltix", merchantId: "brightline", category: "electronics", price: 29.0, rating: 4.6, reviews: 5310, shipDays: 2, tags: ["travel", "usb-c", "gift"], emoji: "🔋", description: "10,000 mAh slim power bank, 20W USB-C fast charging." },
  { id: "el-005", name: "Solar Trail Charger", brand: "Voltix", merchantId: "verdant", category: "electronics", price: 45.0, rating: 4.3, reviews: 640, shipDays: 4, tags: ["solar", "eco", "camping", "travel"], emoji: "☀️", description: "Foldable 21W solar panel charger for phones on the trail." },
  { id: "el-006", name: "Glow Desk Lamp", brand: "Lumen", merchantId: "hearth", category: "electronics", price: 39.0, rating: 4.5, reviews: 1200, shipDays: 3, tags: ["led", "office", "dimmable"], emoji: "💡", description: "Dimmable LED desk lamp with warm/cool modes and USB port." },
  { id: "el-007", name: "Smart Plug 4-Pack", brand: "Homely", merchantId: "brightline", category: "electronics", price: 34.99, rating: 4.4, reviews: 3020, shipDays: 2, tags: ["smart-home", "energy-saving"], emoji: "🔌", description: "Wi-Fi smart plugs with energy monitoring." },

  // outdoor
  { id: "out-001", name: "Ridgeline 2-Person Tent", brand: "Trailhead", merchantId: "northwind", category: "outdoor", price: 129.0, rating: 4.6, reviews: 870, shipDays: 3, tags: ["camping", "backpacking", "waterproof"], emoji: "⛺", description: "3-season, 1.9 kg backpacking tent with full rainfly." },
  { id: "out-002", name: "EcoLite Recycled Tent", brand: "Verdant", merchantId: "verdant", category: "outdoor", price: 98.0, rating: 4.5, reviews: 310, shipDays: 5, tags: ["camping", "eco", "recycled", "waterproof"], emoji: "⛺", description: "2-person tent made from 100% recycled ripstop." },
  { id: "out-003", name: "Summit Down Sleeping Bag", brand: "Trailhead", merchantId: "northwind", category: "outdoor", price: 89.0, rating: 4.7, reviews: 1430, shipDays: 3, tags: ["camping", "backpacking", "warm"], emoji: "🛌", description: "Rated to 20°F, packs to the size of a water bottle." },
  { id: "out-004", name: "Recycled Fleece Sleeping Bag", brand: "Verdant", merchantId: "verdant", category: "outdoor", price: 54.0, rating: 4.3, reviews: 280, shipDays: 5, tags: ["camping", "eco", "recycled"], emoji: "🛌", description: "Summer-weight bag made from recycled PET bottles." },
  { id: "out-005", name: "Titan Headlamp 400", brand: "Trailhead", merchantId: "northwind", category: "outdoor", price: 24.0, rating: 4.8, reviews: 4100, shipDays: 2, tags: ["camping", "rechargeable", "gift"], emoji: "🔦", description: "400-lumen rechargeable headlamp, red night mode." },
  { id: "out-006", name: "Collapsible Camp Stove", brand: "Trailhead", merchantId: "northwind", category: "outdoor", price: 42.0, rating: 4.5, reviews: 760, shipDays: 3, tags: ["camping", "cooking"], emoji: "🔥", description: "Ultralight canister stove with piezo ignition." },
  { id: "out-007", name: "Bamboo Trekking Poles", brand: "Verdant", merchantId: "verdant", category: "outdoor", price: 49.0, rating: 4.4, reviews: 190, shipDays: 5, tags: ["hiking", "eco", "bamboo"], emoji: "🥢", description: "Pair of adjustable bamboo trekking poles with cork grips." },
  { id: "out-008", name: "Mega Camping Bundle", brand: "Zentro", merchantId: "quickship", category: "outdoor", price: 79.0, rating: 2.9, reviews: 95, shipDays: 12, tags: ["camping", "bundle", "cheap"], emoji: "🏕️", description: "Tent, two bags and a lantern. Suspiciously cheap." },
  { id: "out-009", name: "Insulated Steel Bottle 1L", brand: "Verdant", merchantId: "verdant", category: "outdoor", price: 28.0, rating: 4.8, reviews: 6200, shipDays: 4, tags: ["hiking", "eco", "reusable", "gift"], emoji: "🧴", description: "Keeps drinks cold 24h, plastic-free." },

  // apparel
  { id: "ap-001", name: "Merino Base Layer Top", brand: "Trailhead", merchantId: "northwind", category: "apparel", price: 65.0, rating: 4.6, reviews: 540, shipDays: 3, tags: ["hiking", "merino", "warm"], emoji: "👕", description: "Odor-resistant 200gsm merino wool long sleeve." },
  { id: "ap-002", name: "Organic Cotton Hoodie", brand: "Verdant", merchantId: "verdant", category: "apparel", price: 58.0, rating: 4.5, reviews: 820, shipDays: 5, tags: ["eco", "organic", "gift"], emoji: "🧥", description: "GOTS-certified organic cotton heavyweight hoodie." },
  { id: "ap-003", name: "Packable Rain Jacket", brand: "Trailhead", merchantId: "northwind", category: "apparel", price: 79.0, rating: 4.5, reviews: 1010, shipDays: 3, tags: ["hiking", "waterproof", "travel"], emoji: "🧥", description: "2.5-layer waterproof shell, packs into its own pocket." },
  { id: "ap-004", name: "Wool Hiking Socks (3-pack)", brand: "Trailhead", merchantId: "northwind", category: "apparel", price: 26.0, rating: 4.8, reviews: 3900, shipDays: 2, tags: ["hiking", "merino", "gift"], emoji: "🧦", description: "Cushioned merino hiking socks with lifetime guarantee." },

  // kitchen / home
  { id: "ki-001", name: "Pour-Over Coffee Set", brand: "Hearth", merchantId: "hearth", category: "kitchen", price: 44.0, rating: 4.7, reviews: 1320, shipDays: 3, tags: ["coffee", "gift"], emoji: "☕", description: "Ceramic dripper, glass carafe and 100 filters." },
  { id: "ki-002", name: "Burr Coffee Grinder", brand: "Hearth", merchantId: "hearth", category: "kitchen", price: 119.0, rating: 4.6, reviews: 2210, shipDays: 3, tags: ["coffee", "premium"], emoji: "⚙️", description: "40-step conical burr grinder." },
  { id: "ki-003", name: "Single-Origin Coffee Sampler", brand: "Hearth", merchantId: "hearth", category: "kitchen", price: 32.0, rating: 4.8, reviews: 760, shipDays: 2, tags: ["coffee", "gift", "fair-trade"], emoji: "🫘", description: "Four 4oz bags of fair-trade single-origin beans." },
  { id: "ki-004", name: "Beeswax Food Wraps", brand: "Verdant", merchantId: "verdant", category: "kitchen", price: 18.0, rating: 4.4, reviews: 2900, shipDays: 4, tags: ["eco", "reusable", "plastic-free"], emoji: "🐝", description: "Set of 6 reusable beeswax wraps." },
  { id: "ki-005", name: "Cast Iron Skillet 10\"", brand: "Hearth", merchantId: "hearth", category: "kitchen", price: 36.0, rating: 4.8, reviews: 8800, shipDays: 3, tags: ["cooking", "gift"], emoji: "🍳", description: "Pre-seasoned, lasts a lifetime." },
  { id: "ho-001", name: "Linen Throw Blanket", brand: "Hearth", merchantId: "hearth", category: "home", price: 69.0, rating: 4.6, reviews: 450, shipDays: 4, tags: ["cozy", "gift", "natural"], emoji: "🛋️", description: "Stonewashed European linen throw." },
  { id: "ho-002", name: "Soy Candle Trio", brand: "Verdant", merchantId: "verdant", category: "home", price: 34.0, rating: 4.7, reviews: 1670, shipDays: 4, tags: ["eco", "gift", "cozy"], emoji: "🕯️", description: "Three hand-poured soy wax candles, cotton wicks." },
  { id: "ho-003", name: "Indoor Herb Garden Kit", brand: "Verdant", merchantId: "verdant", category: "home", price: 39.0, rating: 4.3, reviews: 930, shipDays: 5, tags: ["eco", "gift", "plants"], emoji: "🌿", description: "Basil, mint and parsley with compostable pots." },

  // beauty / toys / office
  { id: "be-001", name: "Natural Skincare Gift Box", brand: "Verdant", merchantId: "verdant", category: "beauty", price: 48.0, rating: 4.6, reviews: 610, shipDays: 4, tags: ["eco", "gift", "vegan"], emoji: "🧴", description: "Vegan cleanser, serum and balm, zero-waste packaging." },
  { id: "to-001", name: "Wooden Building Blocks (100pc)", brand: "Hearth", merchantId: "hearth", category: "toys", price: 42.0, rating: 4.8, reviews: 2300, shipDays: 3, tags: ["kids", "gift", "eco", "wood"], emoji: "🧱", description: "FSC-certified beech wood blocks, non-toxic paint." },
  { id: "to-002", name: "STEM Robot Kit", brand: "Voltix", merchantId: "brightline", category: "toys", price: 74.0, rating: 4.5, reviews: 880, shipDays: 2, tags: ["kids", "gift", "stem", "coding"], emoji: "🤖", description: "Build-and-code robot for ages 8+." },
  { id: "of-001", name: "Recycled Paper Notebook Set", brand: "Inkwell", merchantId: "inkwell", category: "office", price: 16.0, rating: 4.6, reviews: 1500, shipDays: 3, tags: ["eco", "recycled", "gift"], emoji: "📓", description: "Three A5 dotted notebooks, 100% recycled paper." },
  { id: "of-002", name: "Fountain Pen Starter Kit", brand: "Inkwell", merchantId: "inkwell", category: "office", price: 38.0, rating: 4.7, reviews: 720, shipDays: 3, tags: ["gift", "writing"], emoji: "🖋️", description: "Steel-nib pen, converter and two ink bottles." },

  // restricted categories (blocked by default mandate)
  { id: "gc-001", name: "$100 Universal Gift Card", brand: "GiftHub", merchantId: "quickship", category: "gift_cards", price: 100.0, rating: 3.5, reviews: 60, shipDays: 0, tags: ["gift", "digital"], emoji: "🎁", description: "Redeemable at thousands of stores. Instant email delivery." },
  { id: "gc-002", name: "$50 Coffee Shop Gift Card", brand: "GiftHub", merchantId: "hearth", category: "gift_cards", price: 50.0, rating: 4.6, reviews: 300, shipDays: 0, tags: ["gift", "digital", "coffee"], emoji: "🎁", description: "Digital gift card for Hearth cafés." },
  { id: "al-001", name: "Craft Wine Gift Set", brand: "Cellar Nine", merchantId: "hearth", category: "alcohol", price: 64.0, rating: 4.5, reviews: 210, shipDays: 4, tags: ["gift", "wine"], emoji: "🍷", description: "Two bottles of small-batch red with gift box." },
];

const BY_ID = new Map(PRODUCTS.map((p) => [p.id, p]));

export function getProduct(id: string): Product | undefined {
  return BY_ID.get(id);
}

export function getMerchant(id: string): Merchant {
  const m = MERCHANTS[id];
  if (!m) throw new Error(`Unknown merchant ${id}`);
  return m;
}

export interface SearchQuery {
  query: string;
  category?: Category;
  max_price?: number;
  tags?: string[];
}

/** Naive keyword search over the catalog, scored by term hits then rating. */
export function searchProducts(q: SearchQuery, limit = 8): Product[] {
  const terms = q.query
    .toLowerCase()
    .split(/[^a-z0-9-]+/)
    .filter((t) => t.length > 1);
  const wantTags = (q.tags ?? []).map((t) => t.toLowerCase());

  const scored = PRODUCTS.filter((p) => {
    if (q.category && p.category !== q.category) return false;
    if (q.max_price != null && p.price > q.max_price) return false;
    if (wantTags.length && !wantTags.every((t) => p.tags.includes(t))) return false;
    return true;
  }).map((p) => {
    const hay = [p.name, p.brand, p.category, p.description, ...p.tags].join(" ").toLowerCase();
    let score = 0;
    for (const t of terms) {
      const stem = t.replace(/s$/, "");
      if (hay.includes(stem)) score += p.tags.includes(t) || p.name.toLowerCase().includes(stem) ? 2 : 1;
    }
    return { p, score };
  });

  const anyHits = scored.some((s) => s.score > 0);
  return scored
    .filter((s) => !terms.length || !anyHits || s.score > 0)
    .sort((a, b) => b.score - a.score || b.p.rating - a.p.rating)
    .slice(0, limit)
    .map((s) => s.p);
}
