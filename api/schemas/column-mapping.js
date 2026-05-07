import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

export const ColumnMappingSchema = z.object({
  mapping: z.record(z.string(), z.string()),
});

export const ColumnMappingJsonSchema = zodToJsonSchema(ColumnMappingSchema);
