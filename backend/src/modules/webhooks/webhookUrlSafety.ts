import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

function isBlockedIpv4(address: string): boolean {
  const parts = address.split(".").map(Number);
  return parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)
    || parts[0] === 0 || parts[0] === 10 || parts[0] === 127 || parts[0] >= 224
    || (parts[0] === 169 && parts[1] === 254)
    || (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31)
    || (parts[0] === 192 && parts[1] === 168);
}

function isBlockedIp(address: string): boolean {
  if (isIP(address) === 4) return isBlockedIpv4(address);
  if (isIP(address) === 6) {
    const normalized = address.toLowerCase();
    return normalized === "::1" || normalized === "::" || normalized.startsWith("fc") || normalized.startsWith("fd") || normalized.startsWith("fe8") || normalized.startsWith("fe9") || normalized.startsWith("fea") || normalized.startsWith("feb");
  }
  return true;
}

export async function assertSafeWebhookUrl(value: string): Promise<void> {
  let url: URL;
  try { url = new URL(value); } catch { throw new Error("Invalid webhook URL"); }
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("Webhook URL must use HTTP or HTTPS");
  if (url.username || url.password) throw new Error("Webhook URL must not contain credentials");
  const addresses = isIP(url.hostname) ? [{ address: url.hostname }] : await lookup(url.hostname, { all: true });
  if (!addresses.length || addresses.some(({ address }) => isBlockedIp(address))) {
    throw new Error("Webhook URL resolves to a blocked network address");
  }
}
