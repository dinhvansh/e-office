export type SigningFieldAccess = {
  sign_request_id: number;
  assigned_signer_id: number | null;
};

export function canSignerWriteField(
  signerSignRequestId: number,
  signerId: number,
  field: SigningFieldAccess,
): boolean {
  return field.sign_request_id === signerSignRequestId
    && (field.assigned_signer_id === signerId || field.assigned_signer_id === null);
}
