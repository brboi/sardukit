import { z } from 'zod';

export const ColumnMappingSchema = z.object({
  mapping: z.record(z.string(), z.string()),
});
