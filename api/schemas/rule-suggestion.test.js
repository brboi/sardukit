import { describe, it, expect } from 'vitest';
import { RuleSuggestionSchema } from './rule-suggestion.js';

describe('RuleSuggestionSchema', () => {
  it('parses a valid rule suggestion', () => {
    const input = {
      criteria: [{ column: 'communication', match_type: 'contains', pattern: 'AMAZON' }],
      criteria_mode: 'AND',
      category: 'Shopping',
      sub_category: null,
      tags: ['ecommerce'],
      explanation: 'Matches Amazon purchases',
    };
    const result = RuleSuggestionSchema.parse(input);
    expect(result).toEqual(input);
  });

  it('rejects invalid match_type', () => {
    const input = {
      criteria: [{ column: 'communication', match_type: 'invalid', pattern: 'test' }],
      criteria_mode: 'AND',
      category: 'Test',
      sub_category: null,
      tags: [],
      explanation: 'Test',
    };
    expect(() => RuleSuggestionSchema.parse(input)).toThrow();
  });

  it('accepts empty tags array', () => {
    const input = {
      criteria: [{ column: 'communication', match_type: 'contains', pattern: 'test' }],
      criteria_mode: 'AND',
      category: 'Test',
      sub_category: null,
      tags: [],
      explanation: 'Test',
    };
    const result = RuleSuggestionSchema.parse(input);
    expect(result.tags).toEqual([]);
  });

  it('rejects missing required fields', () => {
    expect(() => RuleSuggestionSchema.parse({ criteria: [] })).toThrow();
  });

  it('rejects invalid criteria_mode', () => {
    const input = {
      criteria: [{ column: 'communication', match_type: 'contains', pattern: 'test' }],
      criteria_mode: 'XOR',
      category: 'Test',
      sub_category: null,
      tags: [],
      explanation: 'Test',
    };
    expect(() => RuleSuggestionSchema.parse(input)).toThrow();
  });

  it('rejects invalid column value', () => {
    const input = {
      criteria: [{ column: 'invalid_col', match_type: 'contains', pattern: 'test' }],
      criteria_mode: 'AND',
      category: 'Test',
      sub_category: null,
      tags: [],
      explanation: 'Test',
    };
    expect(() => RuleSuggestionSchema.parse(input)).toThrow();
  });

  it('accepts OR criteria_mode', () => {
    const input = {
      criteria: [
        { column: 'communication', match_type: 'contains', pattern: 'amazon' },
        { column: 'description', match_type: 'contains', pattern: 'ebay' },
      ],
      criteria_mode: 'OR',
      category: 'Shopping',
      sub_category: null,
      tags: [],
      explanation: 'Matches either',
    };
    const result = RuleSuggestionSchema.parse(input);
    expect(result.criteria_mode).toBe('OR');
    expect(result.criteria.length).toBe(2);
  });
});
