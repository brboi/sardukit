import { describe, it, expect } from 'vitest';
import { RuleSuggestionSchema } from './rule-suggestion.js';

describe('RuleSuggestionSchema', () => {
  it('parses a valid rule suggestion', () => {
    const input = {
      pattern: 'AMAZON',
      match_type: 'contains',
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
      pattern: 'test',
      match_type: 'invalid',
      category: 'Test',
      sub_category: null,
      tags: [],
      explanation: 'Test',
    };
    expect(() => RuleSuggestionSchema.parse(input)).toThrow();
  });

  it('accepts empty tags array', () => {
    const input = {
      pattern: 'test',
      match_type: 'contains',
      category: 'Test',
      sub_category: null,
      tags: [],
      explanation: 'Test',
    };
    const result = RuleSuggestionSchema.parse(input);
    expect(result.tags).toEqual([]);
  });

  it('rejects missing required fields', () => {
    expect(() => RuleSuggestionSchema.parse({ pattern: 'test' })).toThrow();
  });
});
