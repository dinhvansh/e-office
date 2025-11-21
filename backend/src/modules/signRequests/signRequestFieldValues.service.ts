import { PrismaClient } from '@prisma/client';
import { ApiError } from '../../core/errors/api-error';

const prisma = new PrismaClient();

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
    });
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
    // Get all required fields assigned to this signer
    const requiredFields = await prisma.sign_request_fields.findMany({
      where: {
        assigned_signer_id: signerId,
        required: true,
      },
      select: { id: true },
    });

    // Get filled field values
    const filledFields = await prisma.sign_request_field_values.findMany({
      where: { signer_id: signerId },
      select: { field_id: true },
    });

    const filledFieldIds = new Set(filledFields.map((f) => f.field_id));

    // Check if all required fields are filled
    for (const field of requiredFields) {
      if (!filledFieldIds.has(field.id)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get fields assigned to a signer with their values
   */
  async getSignerFieldsWithValues(signerId: number) {
    const fields = await prisma.sign_request_fields.findMany({
      where: { assigned_signer_id: signerId },
      include: {
        values: {
          where: { signer_id: signerId },
        },
      },
      orderBy: [{ page: 'asc' }, { y: 'asc' }],
    });

    return fields.map((field) => ({
      id: field.id,
      type: field.type,
      page: field.page,
      x: field.x,
      y: field.y,
      width: field.width,
      height: field.height,
      required: field.required,
      label: field.label,
      placeholder: field.placeholder,
      read_only: field.read_only,
      value: field.values[0]?.value || null,
      filled_at: field.values[0]?.filled_at || null,
    }));
  }
}

export const signRequestFieldValuesService = new SignRequestFieldValuesService();
