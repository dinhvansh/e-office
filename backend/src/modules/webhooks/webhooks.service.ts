import { request } from "undici";
import { webhooksRepository } from "./webhooks.repository";

class WebhookService {
  async emit(tenantId: number, event: string, payload: unknown): Promise<void> {
    const webhooks = await webhooksRepository.findActiveByTenantId(tenantId);
    
    await Promise.all(
      webhooks.map(async (webhook) => {
        // Check if webhook is subscribed to this event
        if (!webhook.events.includes("*") && !webhook.events.includes(event)) {
          return;
        }

        let statusCode: number | undefined;
        let response: string | undefined;
        let error: string | undefined;

        try {
          const res = await request(webhook.url, {
            method: "POST",
            body: JSON.stringify({
              event,
              payload,
              emitted_at: new Date().toISOString(),
            }),
            headers: {
              "Content-Type": "application/json",
              "X-Esign-Event": event,
              ...(webhook.secret ? { "X-Esign-Signature": webhook.secret } : {}),
            },
          });

          statusCode = res.statusCode;
          response = await res.body.text();
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error("Failed to deliver webhook", webhook.url, err);
          error = err instanceof Error ? err.message : String(err);
        }

        // Log the webhook delivery
        await webhooksRepository.createLog(
          webhook.id,
          event,
          payload,
          statusCode,
          response,
          error
        );
      }),
    );
  }
}

export const webhookService = new WebhookService();
