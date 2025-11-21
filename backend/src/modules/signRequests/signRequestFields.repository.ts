import { PrismaClient, sign_request_fields } from '@prisma/client';

const prisma = new PrismaClient();

export interface CreateFieldData {
  sign_request_id: number;
  document_id: number;
  assigned_signer_id?: number | null;
  type: string;
  page: number;
  x: number;
  y: number;
  width?: number | null;
  height?: number | null;
  required?: boolean;
  label?: string | null;
  placeholder?: string | null;
  read_only?: boolean;
}

export interface UpdateFieldData {
  assigned_signer_id?: number | null;
  type?: string;
  page?: number;
  x?: number;
  y?: number;
  width?: number | null;
  height?: number | null;
  required?: boolean;
  label?: string | null;
  placeholder?: string | null;
  read_only?: boolean;
}

export class SignRequestFieldsRepository {
  /**
   * Find all fields for a sign request
   */
  async findBySignRequest(signRequestId: number): Promise<sign_request_fields[]> {
    return prisma.sign_request_fields.findMany({
      where: { sign_request_id: signRequestId },
      include: {
        assigned_signer: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: [{ page: 'asc' }, { y: 'asc' }, { x: 'asc' }],
    });
  }

  /**
   * Find field by ID
   */
  async findById(fieldId: number): Promise<sign_request_fields | null> {
    return prisma.sign_request_fields.findUnique({
      where: { id: fieldId },
      include: {
        assigned_signer: true,
        sign_request: true,
      },
    });
  }

  /**
   * Create a new field
   */
  async create(data: CreateFieldData): Promise<sign_request_fields> {
    return prisma.sign_request_fields.create({
      data,
    });
  }

  /**
   * Update a field
   */
  async update(fieldId: number, data: UpdateFieldData): Promise<sign_request_fields> {
    return prisma.sign_request_fields.update({
      where: { id: fieldId },
      data,
    });
  }

  /**
   * Delete a field
   */
  async delete(fieldId: number): Promise<void> {
    await prisma.sign_request_fields.delete({
      where: { id: fieldId },
    });
  }

  /**
   * Bulk upsert fields (delete old, insert new)
   */
  async bulkUpsert(signRequestId: number, fields: CreateFieldData[]): Promise<void> {
    await prisma.$transaction(async (tx) => {
      // Delete existing fields
      await tx.sign_request_fields.deleteMany({
        where: { sign_request_id: signRequestId },
      });

      // Insert new fields
      if (fields.length > 0) {
        await tx.sign_request_fields.createMany({
          data: fields,
        });
      }
    });
  }

  /**
   * Count fields by sign request
   */
  async countBySignRequest(signRequestId: number): Promise<number> {
    return prisma.sign_request_fields.count({
      where: { sign_request_id: signRequestId },
    });
  }

  /**
   * Find fields assigned to a specific signer
   */
  async findBySignerAndRequest(signRequestId: number, signerId: number): Promise<sign_request_fields[]> {
    return prisma.sign_request_fields.findMany({
      where: {
        sign_request_id: signRequestId,
        assigned_signer_id: signerId,
      },
      orderBy: [{ page: 'asc' }, { y: 'asc' }],
    });
  }
}

export const signRequestFieldsRepository = new SignRequestFieldsRepository();
