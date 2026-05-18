import { PrismaClient, sign_request_fields } from '@prisma/client';
import { normalizeStoredFieldBox } from './coordinate.helper';

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

export interface SignRequestFieldDto {
  id: number;
  sign_request_id: number;
  document_id: number;
  assigned_signer_id?: number | null;
  type: string;
  pageIndex: number;
  page: number;
  coordinateVersion: number;
  coordinateUnit: 'ratio';
  coordinateAnchor: 'top-left';
  xPct: number;
  yPct: number;
  widthPct: number;
  heightPct: number;
  required: boolean;
  label?: string | null;
  placeholder?: string | null;
  read_only: boolean;
  created_at: Date;
  assigned_signer?: any;
  sign_request?: any;
}

export class SignRequestFieldsRepository {
  private mapFieldRecord(field: any): SignRequestFieldDto {
    const normalized = normalizeStoredFieldBox(field);
    return {
      id: field.id,
      sign_request_id: field.sign_request_id,
      document_id: field.document_id,
      assigned_signer_id: field.assigned_signer_id,
      type: field.type,
      pageIndex: Math.max(0, (field.page || 1) - 1),
      page: field.page || 1,
      coordinateVersion: 2,
      coordinateUnit: 'ratio',
      coordinateAnchor: 'top-left',
      xPct: normalized.xPct,
      yPct: normalized.yPct,
      widthPct: normalized.widthPct,
      heightPct: normalized.heightPct,
      required: field.required,
      label: field.label,
      placeholder: field.placeholder,
      read_only: field.read_only,
      created_at: field.created_at,
      assigned_signer: field.assigned_signer,
      sign_request: field.sign_request,
    };
  }

  /**
   * Find all fields for a sign request
   */
  async findBySignRequest(signRequestId: number): Promise<SignRequestFieldDto[]> {
    const fields = await prisma.sign_request_fields.findMany({
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
    return fields.map((field) => this.mapFieldRecord(field));
  }

  /**
   * Find field by ID
   */
  async findById(fieldId: number): Promise<SignRequestFieldDto | null> {
    const field = await prisma.sign_request_fields.findUnique({
      where: { id: fieldId },
      include: {
        assigned_signer: true,
        sign_request: true,
      },
    });
    return field ? this.mapFieldRecord(field) : null;
  }

  /**
   * Create a new field
   */
  async create(data: CreateFieldData): Promise<SignRequestFieldDto> {
    const field = await prisma.sign_request_fields.create({
      data,
    });
    return this.mapFieldRecord(field);
  }

  /**
   * Update a field
   */
  async update(fieldId: number, data: UpdateFieldData): Promise<SignRequestFieldDto> {
    const field = await prisma.sign_request_fields.update({
      where: { id: fieldId },
      data,
    });
    return this.mapFieldRecord(field);
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
