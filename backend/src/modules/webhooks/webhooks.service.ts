import { request } from "undici";

export interface WebhookEndpoint {
  url: string;
  events: string[];
  secret?: string;
}

class WebhookService {
  private registry = new Map<number, WebhookEndpoint[]>();

  register(tenantId: number, endpoint: WebhookEndpoint): void {
    const existing = this.registry.get(tenantId) ?? [];
    const filteredEvents = endpoint.events.length === 0 ? ["*"] : endpoint.events;
    existing.push({ ...endpoint, events: filteredEvents });
    this.registry.set(tenantId, existing);
  }

  async emit(tenantId: number, event: string, payload: unknown): Promise<void> {
    const endpoints = this.registry.get(tenantId) ?? [];
    await Promise.all(
      endpoints.map(async (endpoint) => {
        if (!endpoint.events.includes("*") && !endpoint.events.includes(event)) {
          return;
        }
        try {
          await request(endpoint.url, {
            method: "POST",
            body: JSON.stringify({
              event,
              payload,
              emitted_at: new Date().toISOString(),
            }),
            headers: {
              "Content-Type": "application/json",
              "X-Esign-Event": event,
              ...(endpoint.secret ? { "X-Esign-Signature": endpoint.secret } : {}),
            },
          });
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error("Failed to deliver webhook", endpoint.url, err);
        }
      }),
    );
  }
}

export const webhookService = new WebhookService();
