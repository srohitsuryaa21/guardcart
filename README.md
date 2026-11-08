# GuardCart 🛡️

**An AI shopper that spends only within your rules, and only after you approve in PayPal.**

Built for the [PayPal AI Hackathon](https://paypalaihackathon.devpost.com/).

## The problem

AI agents are starting to shop for people. Handing an agent your wallet is scary. Prompt instructions like "don't spend more than $150" are suggestions to a language model, not guarantees. One confused or manipulated agent run can overspend, buy from a sketchy seller, or buy something you never wanted (gift cards are a classic scam vector).

## The idea

GuardCart splits agentic commerce into three layers with clear authority:

| Layer | Who | Can do |
|---|---|---|
| **Mandate** | You | Set hard rules: total budget, per-item cap, max quantity, blocked categories, minimum seller rating, delivery deadline |
| **Agent** | Claude | Search, compare and fill the cart. **Every cart change goes through a code-level guard.** It has no tool that moves money. |
| **Payment** | You + PayPal | Approve the itemized PayPal order. The server re-checks the mandate when it creates the order, and again against PayPal's own record before capture. |

The rules live in code (`src/lib/mandate.ts`), not in the prompt. The agent is *told* the rules so it can plan, but it can't get around them, whatever it says.

## Demo flow

1. Turn **Agent sees these rules** off. The agent now shops without knowing your mandate, so the code guard is the only thing protecting you.
2. Ask: *"Camping trip for 2 this weekend: tent, two sleeping bags and a headlamp. Eco-friendly if possible."*
3. The agent goes for the premium gear and **the guard blocks it** in red: the $129 tent breaks the $100 per-item cap, and two $89 down bags would push the cart past the $150 budget. The agent reads the guard's reasons, uses `quote_cart` to get the exact total for a compliant kit ($233.50), and asks you what to do.
4. Raise the budget in the Mandate panel to $250 and say "go ahead".
5. The agent completes the cart and requests checkout. You approve with the **PayPal** button, logging in as the sandbox **Personal** buyer account (`…@personal.example.com`).
6. The server re-reads the order from PayPal, checks the approved amount still fits the mandate, captures the payment, and shows the receipt with PayPal order, capture and invoice IDs.

With **Agent sees these rules** on (the default), the agent plans around your mandate up front and rarely hits the guard. Both modes are safe; the toggle exists to prove the guard doesn't depend on the model behaving.

More guard moments: *"Get me the cheapest earbuds"* (skips the seller rated 2.6 that ships in 9 days) and *"Buy a $100 gift card"* (blocked category). Tick **Simulate a card decline** to see PayPal negative testing on capture.

## How it uses PayPal

- **Orders v2 REST API**: itemized orders with `item_total` + `shipping` breakdown, SKUs, `invoice_id`, and the mandate recorded in `custom_id` for auditing. Uses `PayPal-Request-Id` idempotency keys.
- **PayPal JS SDK v6** (`@paypal/react-paypal-js/sdk-v6`): `PayPalProvider` + `PayPalOneTimePaymentButton` for buyer approval.
- **Capture with verification**: the server `GET`s the order from PayPal and checks `status === APPROVED` and the amount fits the mandate before capturing.
- **Sandbox negative testing**: the `PayPal-Mock-Response` header simulates `INSTRUMENT_DECLINED` on capture.

## How it uses AI

- **Claude Opus 5.5** (`claude-opus-5-5`) through the official Anthropic TypeScript SDK, with a manual tool-use loop (`src/lib/agent.ts`).
- Tools: `search_products`, `add_to_cart`, `remove_from_cart`, `view_cart`, `quote_cart`, `request_checkout`. The cart tools are wrapped by the mandate guard. Blocked calls return a structured refusal so the model can explain and adapt. `quote_cart` prices hypothetical carts in code, so the agent never quotes a total from its own arithmetic.
- **Blind mode** (`Agent sees these rules` off) removes the mandate from the prompt and from tool results. The guard enforces exactly the same rules, which shows the rules hold even when the model doesn't know them.
- Streams progress updates, tool activity and text to the UI as NDJSON.
- Adaptive thinking with effort control, prompt caching, and server-side refusal fallbacks.

## Architecture

```
Browser (Next.js client)
  ├─ Mandate panel ── rules ─────────────┐
  ├─ Chat ──► POST /api/agent (stream) ──┤──► Claude tool loop ──► guard (mandate.ts) ──► cart
  └─ Cart + PayPal button                │
        ├─ createOrder ► POST /api/orders ──► re-price from catalog + guard ──► PayPal Orders v2: create
        └─ onApprove   ► POST /api/orders/:id/capture ──► PayPal GET order + guard ──► capture
```

The catalog is a built-in demo store (`src/lib/catalog.ts`) with fictional brands and sellers. Prices are always taken from the server catalog, never from the browser or the model.

## Run it locally

Requirements: Node.js 20+, a free [PayPal Developer](https://developer.paypal.com/dashboard) account, and an [Anthropic API key](https://console.anthropic.com/).

```bash
git clone <this repo>
cd guardcart
npm install
cp .env.example .env.local   # then fill in the values
npm run dev
```

Open http://localhost:3000.

### Environment variables

| Variable | Where to get it |
|---|---|
| `PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET` | PayPal Developer Dashboard → Apps & Credentials → **Sandbox** → your app |
| `PAYPAL_ENVIRONMENT` | `sandbox` |
| `ANTHROPIC_API_KEY` | Anthropic Console → API keys |
| `ANTHROPIC_MODEL` *(optional)* | Defaults to `claude-opus-5-5` |
| `AGENT_EFFORT` *(optional)* | `low` (default, fastest) to `high` |

### Paying in the sandbox

Use the **Personal** sandbox account from Developer Dashboard → Testing Tools → Sandbox Accounts to log in to the PayPal popup. No real money moves.

## Deploy (Render)

Create a **Web Service** from this repo: build command `npm install && npm run build`, start command `npm start`, and add the environment variables above.

## License

MIT
