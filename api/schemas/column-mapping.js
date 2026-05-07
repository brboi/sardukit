import { z } from 'zod';

export const ColumnMappingSchema = z.object({
  mapping: z.array(z.object({
    header: z.string(),
    field: z.string(),
  })),
});
