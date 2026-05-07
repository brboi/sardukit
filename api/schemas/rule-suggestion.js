import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

export const RuleSuggestionSchema = z.object({
  pattern: z.string(),
  match_type: z.enum(['contains', 'starts_with', 'ends_with', 'regex', 'exact']),
  category: z.string(),
  sub_category: z.string().nullable(),
  tags: z.array(z.string()),
  explanation: z.string(),
});

export const RuleSuggestionJsonSchema = zodToJsonSchema(RuleSuggestionSchema);
