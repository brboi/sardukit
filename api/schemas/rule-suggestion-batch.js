import { z } from 'zod';
import { RuleSuggestionSchema } from './rule-suggestion.js';

export const BatchRuleSuggestionSchema = z.object({
  rules: z.array(RuleSuggestionSchema),
});
