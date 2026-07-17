export async function withdrawAttachment(fetchJson: (path: string, init?: RequestInit) => Promise<unknown>, documentId: number, attachmentId: number, reason: string) {
  return fetchJson(`/documents/${documentId}/attachments/${attachmentId}/withdraw`, { method: 'POST', body: JSON.stringify({ reason }) });
}
