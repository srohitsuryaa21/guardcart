import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { runAgent, type AgentEvent } from "@/lib/agent";
import { CartSchema, MandateSchema } from "@/lib/mandate";

export const maxDuration = 300;

const Body = z.object({
  // Prior API messages, returned verbatim by this route on earlier turns.
  // They are passed back unchanged (thinking blocks included).
  history: z.array(z.any()).max(400),
  message: z.string().min(1).max(4000),
  cart: CartSchema,
  mandate: MandateSchema,
  agentSeesRules: z.boolean().optional(),
});

// Streams the agent's progress as newline-delimited JSON events.
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid request" }, { status: 400 });
  const { history, message, cart, mandate, agentSeesRules } = parsed.data;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const emit = (e: AgentEvent) => {
        try {
          controller.enqueue(encoder.encode(JSON.stringify(e) + "\n"));
        } catch {
          // client went away
        }
      };
      try {
        const { newMessages } = await runAgent({
          history: history as Anthropic.Beta.BetaMessageParam[],
          userText: message,
          cart,
          mandate,
          agentSeesRules,
          emit,
          signal: req.signal,
        });
        emit({ type: "done", messages: newMessages });
      } catch (err) {
        console.error("agent error", err);
        let msg = "The agent hit an unexpected error.";
        if (err instanceof Anthropic.AuthenticationError) msg = "Anthropic API key is missing or invalid (ANTHROPIC_API_KEY).";
        else if (err instanceof Anthropic.RateLimitError) msg = "Rate limited by the AI provider. Try again in a moment.";
        else if (err instanceof Anthropic.APIError) msg = `AI provider error (${err.status}): ${err.message}`;
        else if (err instanceof Anthropic.AnthropicError) msg = `AI client error: ${err.message}. Is ANTHROPIC_API_KEY set?`;
        emit({ type: "error", message: msg });
      } finally {
        try {
          controller.close();
        } catch {}
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-cache, no-transform" },
  });
}
