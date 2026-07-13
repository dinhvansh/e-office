export type PublicSigningPageSource = {
  signer: {
    id: number;
    name: string | null;
    email: string | null;
    role: string | null;
    status: string | null;
    signed_at: Date | null;
  };
  signRequest: {
    id: number;
    title: string | null;
    message: string | null;
    deadline: Date | null;
    created_at: Date;
    document: {
      id: number;
      title: string | null;
      original_file_name: string | null;
    };
  };
};

export function buildPreOtpSigningMetadata(source: PublicSigningPageSource) {
  return {
    otp_required: true,
    signer: { name: source.signer.name, status: source.signer.status },
    sign_request: { title: source.signRequest.title, deadline: source.signRequest.deadline },
  };
}

export function buildVerifiedSigningMetadata(source: PublicSigningPageSource) {
  return {
    signer: {
      id: source.signer.id,
      name: source.signer.name,
      email: source.signer.email,
      role: source.signer.role,
      status: source.signer.status,
    },
    sign_request: {
      id: source.signRequest.id,
      title: source.signRequest.title,
      message: source.signRequest.message,
      deadline: source.signRequest.deadline,
      created_at: source.signRequest.created_at,
    },
    document: {
      id: source.signRequest.document.id,
      title: source.signRequest.document.title,
      original_file_name: source.signRequest.document.original_file_name,
      created_at: source.signRequest.created_at,
    },
  };
}
