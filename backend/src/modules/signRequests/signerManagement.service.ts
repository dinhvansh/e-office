import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { signersRepository } from "../signers/signers.repository";

export interface ManagedSignerInput {
  email: string;
  name: string;
  role?: string;
  position_data?: Record<string, unknown>;
  signing_order?: number;
}

export type ManagedSignerUpdate = Partial<ManagedSignerInput & { signing_order?: number }>;

class SignerManagementService {
  async reorderSigners(signers: Array<{ id: number; signing_order: number }>) {
    for (const signer of signers) {
      await signersRepository.update(signer.id, { signing_order: signer.signing_order });
    }
  }

  async getSigners(signRequestId: number) {
    return signersRepository.findBySignRequest(signRequestId);
  }

  async removeSignerAndReorder(signRequestId: number, signerId: number) {
    await prisma.sign_request_fields.deleteMany({
      where: { assigned_signer_id: signerId },
    });
    await signersRepository.delete(signerId);

    const remainingSigners = await signersRepository.findBySignRequest(signRequestId);
    const sortedSigners = remainingSigners.sort(
      (a, b) => (a.signing_order || 0) - (b.signing_order || 0),
    );

    for (let index = 0; index < sortedSigners.length; index++) {
      await signersRepository.update(sortedSigners[index].id, {
        signing_order: index + 1,
      });
    }
  }

  async updateSignerRecord(
    signerId: number,
    signer: { email: string; user_id: number | null },
    tenantId: number,
    updates: ManagedSignerUpdate,
  ) {
    if (updates.email && updates.email !== signer.email) {
      const internalUser = await prisma.users.findFirst({
        where: { tenant_id: tenantId, email: updates.email, status: "active" },
        select: { id: true },
      });
      const { position_data, ...otherUpdates } = updates;
      const updateData: Prisma.signersUpdateInput = {
        ...otherUpdates,
        ...(position_data ? { position_data: position_data as Prisma.InputJsonValue } : {}),
        is_internal: !!internalUser,
      };

      if (internalUser) {
        updateData.user = { connect: { id: internalUser.id } };
      } else if (signer.user_id) {
        updateData.user = { disconnect: true };
      }

      await signersRepository.update(signerId, updateData);
      return;
    }

    const { position_data, ...otherUpdates } = updates;
    await signersRepository.update(signerId, {
      ...otherUpdates,
      ...(position_data ? { position_data: position_data as Prisma.InputJsonValue } : {}),
    });
  }

  async createDraftSigner(signRequestId: number, tenantId: number, input: ManagedSignerInput) {
    const internalUser = await prisma.users.findFirst({
      where: { tenant_id: tenantId, email: input.email, status: "active" },
      select: { id: true },
    });
    const signerData: Prisma.signersCreateInput = {
      sign_request: { connect: { id: signRequestId } },
      email: input.email,
      name: input.name,
      role: input.role,
      signing_order: input.signing_order,
      status: "draft",
      is_internal: !!internalUser,
      position_data: input.position_data as Prisma.InputJsonValue,
    };
    if (internalUser) signerData.user = { connect: { id: internalUser.id } };
    return signersRepository.create(signerData);
  }
}

export const signerManagementService = new SignerManagementService();
