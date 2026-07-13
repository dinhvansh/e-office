export type OrderedSigner = {
  signing_order: number | null;
  status: string | null;
};

export type WaitingSequentialSigner = OrderedSigner & {
  status: string | null;
};

export function isSignerStatusComplete(status: string | null): boolean {
  return status === "signed" || status === "completed";
}

export function canSignerActInOrder(
  workflowType: string | null,
  signerOrder: number | null,
  signers: OrderedSigner[],
): boolean {
  if (workflowType !== "sequential" || signerOrder === null) return true;

  return signers.every((signer) => (
    signer.signing_order === null
    || signer.signing_order >= signerOrder
    || isSignerStatusComplete(signer.status)
  ));
}

export function findNextWaitingSigningOrder(signers: readonly WaitingSequentialSigner[]): number | null {
  const waitingOrders = signers
    .filter((signer) => signer.status === "waiting_signing" && signer.signing_order !== null)
    .map((signer) => signer.signing_order as number);
  return waitingOrders.length ? Math.min(...waitingOrders) : null;
}
