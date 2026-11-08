export type StepStatus = "running" | "ok" | "error" | "blocked";

export interface Step {
  id: string;
  name: string;
  input: unknown;
  status: StepStatus;
  summary?: string;
  reasons?: string[];
  productIds?: string[];
}

export interface Receipt {
  orderId: string;
  status: string;
  captureId: string | null;
  captureStatus: string | null;
  amount: string;
  currency: string;
  invoiceId: string | null;
  payerEmail: string | null;
  payerName: string | null;
  items: { name: string; quantity: number }[];
}

export type ChatItem =
  | { kind: "user"; id: string; text: string }
  | {
      kind: "agent";
      id: string;
      text: string;
      thinking: string;
      steps: Step[];
      checkoutReady: boolean;
      done: boolean;
      error?: string;
    }
  | { kind: "receipt"; id: string; receipt: Receipt }
  | { kind: "notice"; id: string; tone: "error" | "info"; text: string };
