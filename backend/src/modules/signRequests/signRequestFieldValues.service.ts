import { ApiError } from '../../core/errors/api-error';
import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { normalizeStoredFieldBox } from './coordinate.helper';

export interface FieldValueInput {
  field_id: number;
  value: any; // JSON value
}

export interface FieldValue {
  field_id: number;
  value: any;
  filled_at: Date;
}

export class SignRequestFieldValuesService {
  /**
   * Save field values for a signer (upsert)
   */
  async saveFieldValues(signerId: number, fieldValues: FieldValueInput[]): Promise<void> {
    await prisma.$transaction(async (tx) => {
      await this.saveFieldValuesInTransaction(tx, signerId, fieldValues);
    });
  }

  async saveFieldValuesInTransaction(
    tx: Prisma.TransactionClient,
    signerId: number,
    fieldValues: FieldValueInput[],
  ): Promise<void> {
      const signer = await tx.signers.findUnique({
        where: { id: signerId },
        select: { sign_request_id: true },
      });
      if (!signer) {
        throw ApiError.forbidden("Signing field access denied", "FIELD_ACCESS_DENIED");
      }

      const uniqueFieldIds = [...new Set(fieldValues.map(({ field_id }) => field_id))];
      const writableFields = await tx.sign_request_fields.findMany({
        where: {
          id: { in: uniqueFieldIds },
          sign_request_id: signer.sign_request_id,
          OR: [
            { assigned_signer_id: signerId },
            { assigned_signer_id: null },
          ],
        },
        select: { id: true },
      });

      if (writableFields.length !== uniqueFieldIds.length) {
        throw ApiError.forbidden("Signing field access denied", "FIELD_ACCESS_DENIED");
      }

      for (const fieldValue of fieldValues) {
        await tx.sign_request_field_values.upsert({
          where: {
            field_id_signer_id: {
              field_id: fieldValue.field_id,
              signer_id: signerId,
            },
          },
          create: {
            field_id: fieldValue.field_id,
            signer_id: signerId,
            value: fieldValue.value,
          },
          update: {
            value: fieldValue.value,
            filled_at: new Date(),
          },
        });
      }
  }

  /**
   * Get field values for a signer
   */
  async getFieldValues(signerId: number): Promise<FieldValue[]> {
    const values = await prisma.sign_request_field_values.findMany({
      where: { signer_id: signerId },
      select: {
        field_id: true,
        value: true,
        filled_at: true,
      },
    });

    return values;
  }

  /**
   * Validate that all required fields are filled
   */
  async validateRequiredFields(signerId: number): Promise<boolean> {
    return prisma.$transaction((tx) => this.validateRequiredFieldsInTransaction(tx, signerId));
  }

  async validateRequiredFieldsInTransaction(
    tx: Prisma.TransactionClient,
    signerId: number,
  ): Promise<boolean> {
    // Get signer info to find sign_request_id
    const signer = await tx.signers.findUnique({
      where: { id: signerId },
      select: { id: true, sign_request_id: true },
    });

    if (!signer) {
      return false;
    }

    // Get all required fields for this sign request that are:
    // 1. Assigned to this signer, OR
    // 2. Not assigned to anyone (assigned_signer_id is null) - shared fields
    const requiredFields = await tx.sign_request_fields.findMany({
      where: {
        sign_request_id: signer.sign_request_id,
        required: true,
        OR: [
          { assigned_signer_id: signerId },
          { assigned_signer_id: null },
        ],
      },
      select: { id: true, label: true, type: true },
    });

    // Get filled field values for this signer
    const filledFields = await tx.sign_request_field_values.findMany({
      where: { signer_id: signerId },
      select: { field_id: true, value: true },
    });

    const filledFieldIds = new Set(
      filledFields
        .filter(f => {
          // Check if value is not empty
          if (f.value === null || f.value === undefined) return false;
          if (typeof f.value === 'string' && f.value.trim() === '') return false;
          return true;
        })
        .map((f) => f.field_id)
    );

    // Check if all required fields are filled
    for (const field of requiredFields) {
      if (!filledFieldIds.has(field.id)) {
        console.log(`❌ Required field not filled: ${field.label} (ID: ${field.id}, Type: ${field.type})`);
        return false;
      }
    }

    console.log(`✅ All ${requiredFields.length} required fields are filled`);
    return true;
  }

  /**
   * Get fields assigned to a signer with their values
   * Includes both fields assigned to this signer AND unassigned (shared) fields
   */
  async getSignerFieldsWithValues(signerId: number) {
    // Get signer info to find sign_request_id
    const signer = await prisma.signers.findUnique({
      where: { id: signerId },
      select: { id: true, sign_request_id: true },
    });

    if (!signer) {
      return [];
    }

    // Get fields that are:
    // 1. Assigned to this signer, OR
    // 2. Not assigned to anyone (assigned_signer_id is null) - shared fields
    const fields = await prisma.sign_request_fields.findMany({
      where: {
        sign_request_id: signer.sign_request_id,
        OR: [
          { assigned_signer_id: signerId },
          { assigned_signer_id: null },
        ],
      },
      include: {
        values: {
          where: { signer_id: signerId },
        },
      },
      orderBy: [{ page: 'asc' }, { y: 'asc' }],
    });

    return fields.map((field) => ({
      ...(normalizeStoredFieldBox(field)),
      id: field.id,
      type: field.type,
      pageIndex: Math.max(0, (field.page || 1) - 1),
      page: field.page,
      coordinateVersion: 2,
      coordinateUnit: 'ratio',
      coordinateAnchor: 'top-left',
      required: field.required,
      label: field.label,
      placeholder: field.placeholder,
      read_only: field.read_only,
      assigned_signer_id: field.assigned_signer_id,
      value: field.values[0]?.value || null,
      filled_at: field.values[0]?.filled_at || null,
    }));
  }
}

export const signRequestFieldValuesService = new SignRequestFieldValuesService();
