import { request } from "undici";
import crypto from "crypto";
import { webhooksRepository } from "./webhooks.repository";
import { DeliveryError } from "../outbox/deliveryError";
import { assertSafeWebhookUrl } from "./webhookUrlSafety";

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
          await assertSafeWebhookUrl(webhook.url);
          const body = JSON.stringify({
            event,
            payload,
            emitted_at: new Date().toISOString(),
          });
          const signature = webhook.secret
            ? crypto.createHmac("sha256", webhook.secret).update(body).digest("hex")
            : undefined;

          const res = await request(webhook.url, {
            method: "POST",
            maxRedirections: 0,
            body,
            headers: {
              "Content-Type": "application/json",
              "X-Esign-Event": event,
              ...(signature ? { "X-Esign-Signature": signature } : {}),
            },
          });

          statusCode = res.statusCode;
          response = await res.body.text();
          if (statusCode >= 500) throw new DeliveryError("Webhook destination returned a server error", true);
          if (statusCode >= 400) throw new DeliveryError("Webhook destination rejected the delivery", false);
        } catch (err) {
          error = err instanceof DeliveryError ? err.message : "Webhook delivery network error";
          await webhooksRepository.createLog(webhook.id, event, payload, statusCode, response, error);
          if (err instanceof DeliveryError) throw err;
          throw new DeliveryError("Webhook delivery network error", true);
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
