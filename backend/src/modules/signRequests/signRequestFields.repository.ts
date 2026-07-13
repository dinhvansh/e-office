import { sign_request_fields, sign_requests, signers } from '@prisma/client';
import { DbClient, prisma } from '../../config/prisma';
import { normalizeStoredFieldBox } from './coordinate.helper';


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
  assigned_signer?: Pick<signers, 'id' | 'name' | 'email' | 'role'> | signers | null;
  sign_request?: sign_requests | null;
}

type FieldRecord = sign_request_fields & {
  assigned_signer?: Pick<signers, 'id' | 'name' | 'email' | 'role'> | signers | null;
  sign_request?: sign_requests | null;
};

export class SignRequestFieldsRepository {
  private mapFieldRecord(field: FieldRecord): SignRequestFieldDto {
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
  async findBySignRequest(signRequestId: number, db: DbClient = prisma): Promise<SignRequestFieldDto[]> {
    const fields = await db.sign_request_fields.findMany({
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
  async findById(fieldId: number, db: DbClient = prisma): Promise<SignRequestFieldDto | null> {
    const field = await db.sign_request_fields.findUnique({
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
  async create(data: CreateFieldData, db: DbClient = prisma): Promise<SignRequestFieldDto> {
    const field = await db.sign_request_fields.create({
      data,
    });
    return this.mapFieldRecord(field);
  }

  /**
   * Update a field
   */
  async update(fieldId: number, data: UpdateFieldData, db: DbClient = prisma): Promise<SignRequestFieldDto> {
    const field = await db.sign_request_fields.update({
      where: { id: fieldId },
      data,
    });
    return this.mapFieldRecord(field);
  }

  /**
   * Delete a field
   */
  async delete(fieldId: number, db: DbClient = prisma): Promise<void> {
    await db.sign_request_fields.delete({
      where: { id: fieldId },
    });
  }

  /**
   * Bulk upsert fields (delete old, insert new)
   */
  async bulkUpsert(signRequestId: number, fields: CreateFieldData[], db: DbClient = prisma): Promise<void> {
    const persist = async (tx: DbClient) => {
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
    };
    if ('$transaction' in db) await db.$transaction(persist);
    else await persist(db);
  }

  /**
   * Count fields by sign request
   */
  async countBySignRequest(signRequestId: number, db: DbClient = prisma): Promise<number> {
    return db.sign_request_fields.count({
      where: { sign_request_id: signRequestId },
    });
  }

  /**
   * Find fields assigned to a specific signer
   */
  async findBySignerAndRequest(signRequestId: number, signerId: number, db: DbClient = prisma): Promise<sign_request_fields[]> {
    return db.sign_request_fields.findMany({
      where: {
        sign_request_id: signRequestId,
        assigned_signer_id: signerId,
      },
      orderBy: [{ page: 'asc' }, { y: 'asc' }],
    });
  }
}

export const signRequestFieldsRepository = new SignRequestFieldsRepository();
