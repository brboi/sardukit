import { describe, it, expect } from 'vitest';
import { applyRules } from './rules.js';

describe('applyRules', () => {
  const rules = [
    {
      id: '1',
      priority: 1,
      criteria: [{ column: 'any', match_type: 'contains', pattern: 'amazon' }],
      criteria_mode: 'AND',
      category: 'Shopping',
      sub_category: 'Online',
      tags: ['ecommerce'],
    },
    {
      id: '2',
      priority: 2,
      criteria: [{ column: 'description', match_type: 'contains', pattern: 'restaurant' }],
      criteria_mode: 'AND',
      category: 'Food',
      sub_category: null,
      tags: [],
    },
    {
      id: '3',
      priority: 3,
      criteria: [{ column: 'any', match_type: 'regex', pattern: '^uber' }],
      criteria_mode: 'AND',
      category: 'Transport',
      sub_category: 'Ride',
      tags: ['transport'],
    },
  ];

  it('returns null for empty rules', () => {
    expect(applyRules({ description: 'test' }, [])).toBeNull();
    expect(applyRules({ description: 'test' }, null)).toBeNull();
  });

  it('matches single criterion AND rule', () => {
    const result = applyRules({ communication: 'AMAZON PURCHASE' }, rules);
    expect(result).toEqual({ category: 'Shopping', sub_category: 'Online', tags: ['ecommerce'], rule_id: '1' });
  });

  it('matches regex rule on any column', () => {
    const result = applyRules({ communication: 'Uber ride to airport' }, rules);
    expect(result).toEqual({ category: 'Transport', sub_category: 'Ride', tags: ['transport'], rule_id: '3' });
  });

  it('returns first matching rule by priority', () => {
    const result = applyRules({ communication: 'amazon', description: 'restaurant' }, rules);
    expect(result.category).toBe('Shopping');
  });

  it('falls back to details field when using any column', () => {
    const result = applyRules({ details: 'AMAZON ORDER' }, rules);
    expect(result.category).toBe('Shopping');
  });

  it('handles invalid regex gracefully', () => {
    const badRules = [{
      id: '1', priority: 1,
      criteria: [{ column: 'communication', match_type: 'regex', pattern: '[invalid' }],
      criteria_mode: 'AND',
      category: 'Test',
    }];
    expect(applyRules({ communication: 'test' }, badRules)).toBeNull();
  });

  it('matches starts_with rule', () => {
    const testRules = [{
      id: '1', priority: 1,
      criteria: [{ column: 'communication', match_type: 'starts_with', pattern: 'amazon' }],
      criteria_mode: 'AND',
      category: 'Shopping',
    }];
    const result = applyRules({ communication: 'amazon prime renewal' }, testRules);
    expect(result.category).toBe('Shopping');
  });

  it('does not match starts_with when pattern is not at start', () => {
    const testRules = [{
      id: '1', priority: 1,
      criteria: [{ column: 'communication', match_type: 'starts_with', pattern: 'amazon' }],
      criteria_mode: 'AND',
      category: 'Shopping',
    }];
    const result = applyRules({ communication: 'buy from amazon' }, testRules);
    expect(result).toBeNull();
  });

  it('matches ends_with rule', () => {
    const testRules = [{
      id: '1', priority: 1,
      criteria: [{ column: 'communication', match_type: 'ends_with', pattern: 'fee' }],
      criteria_mode: 'AND',
      category: 'Fees',
    }];
    const result = applyRules({ communication: 'monthly fee' }, testRules);
    expect(result.category).toBe('Fees');
  });

  it('matches exact rule', () => {
    const testRules = [{
      id: '1', priority: 1,
      criteria: [{ column: 'communication', match_type: 'exact', pattern: 'paypal' }],
      criteria_mode: 'AND',
      category: 'Payments',
    }];
    const result = applyRules({ communication: 'paypal' }, testRules);
    expect(result.category).toBe('Payments');
  });

  it('returns null when no rule matches', () => {
    const testRules = [{
      id: '1', priority: 1,
      criteria: [{ column: 'communication', match_type: 'contains', pattern: 'amazon' }],
      criteria_mode: 'AND',
      category: 'Shopping',
    }];
    const result = applyRules({ communication: 'completely unrelated' }, testRules);
    expect(result).toBeNull();
  });

  it('handles transaction with no matching fields', () => {
    const result = applyRules({}, rules);
    expect(result).toBeNull();
  });

  it('handles rules with missing optional fields', () => {
    const minimalRules = [{
      id: '1', priority: 1,
      criteria: [{ column: 'communication', match_type: 'contains', pattern: 'test' }],
      criteria_mode: 'AND',
      category: 'Test',
    }];
    const result = applyRules({ communication: 'test' }, minimalRules);
    expect(result).toEqual({ category: 'Test', sub_category: null, tags: [], rule_id: '1' });
  });

  it('AND mode requires all criteria to match', () => {
    const testRules = [{
      id: '1', priority: 1,
      criteria: [
        { column: 'communication', match_type: 'contains', pattern: 'amazon' },
        { column: 'description', match_type: 'contains', pattern: 'prime' },
      ],
      criteria_mode: 'AND',
      category: 'Shopping',
    }];
    expect(applyRules({ communication: 'amazon', description: 'prime' }, testRules)).not.toBeNull();
    expect(applyRules({ communication: 'amazon', description: 'something else' }, testRules)).toBeNull();
  });

  it('OR mode requires at least one criterion to match', () => {
    const testRules = [{
      id: '1', priority: 1,
      criteria: [
        { column: 'communication', match_type: 'contains', pattern: 'amazon' },
        { column: 'description', match_type: 'contains', pattern: 'ebay' },
      ],
      criteria_mode: 'OR',
      category: 'Shopping',
    }];
    expect(applyRules({ communication: 'amazon', description: 'something' }, testRules)).not.toBeNull();
    expect(applyRules({ communication: 'something', description: 'ebay' }, testRules)).not.toBeNull();
    expect(applyRules({ communication: 'something', description: 'something' }, testRules)).toBeNull();
  });

  it('any column searches communication + description + details', () => {
    const testRules = [{
      id: '1', priority: 1,
      criteria: [{ column: 'any', match_type: 'contains', pattern: 'uber' }],
      criteria_mode: 'AND',
      category: 'Transport',
    }];
    expect(applyRules({ communication: 'something', description: 'Uber ride' }, testRules)).not.toBeNull();
    expect(applyRules({ details: 'UBER EATS' }, testRules)).not.toBeNull();
    expect(applyRules({ communication: 'something' }, testRules)).toBeNull();
  });
});
