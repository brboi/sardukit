import { z } from 'zod';

const CriterionSchema = z.object({
  column: z.enum(['communication', 'description', 'details', 'any']),
  match_type: z.enum(['contains', 'starts_with', 'ends_with', 'regex', 'exact']),
  pattern: z.string(),
});

export const RuleSuggestionSchema = z.object({
  criteria: z.array(CriterionSchema).min(1),
  criteria_mode: z.enum(['AND', 'OR']),
  category: z.string(),
  sub_category: z.string().nullable(),
  tags: z.array(z.string()),
  explanation: z.string(),
});
