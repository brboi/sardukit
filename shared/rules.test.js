import { describe, it, expect } from 'vitest';
import { applyRules } from './rules.js';

describe('applyRules', () => {
  const rules = [
    { id: '1', pattern: 'amazon', match_type: 'contains', category: 'Shopping', sub_category: 'Online', priority: 1, tags: ['ecommerce'] },
    { id: '2', pattern: 'restaurant', match_type: 'contains', category: 'Food', sub_category: null, priority: 2, tags: [] },
    { id: '3', pattern: '^uber', match_type: 'regex', category: 'Transport', sub_category: 'Ride', priority: 3, tags: ['transport'] },
  ];

  it('returns null for empty rules', () => {
    expect(applyRules({ description: 'test' }, [])).toBeNull();
    expect(applyRules({ description: 'test' }, null)).toBeNull();
  });

  it('matches contains rule', () => {
    const result = applyRules({ description: 'AMAZON PURCHASE' }, rules);
    expect(result).toEqual({ category: 'Shopping', sub_category: 'Online', tags: ['ecommerce'], rule_id: '1' });
  });

  it('matches regex rule', () => {
    const result = applyRules({ description: 'Uber ride to airport' }, rules);
    expect(result).toEqual({ category: 'Transport', sub_category: 'Ride', tags: ['transport'], rule_id: '3' });
  });

  it('returns first matching rule by priority', () => {
    const result = applyRules({ description: 'amazon restaurant' }, rules);
    expect(result.category).toBe('Shopping');
  });

  it('falls back to details field when description is empty', () => {
    const result = applyRules({ details: 'AMAZON ORDER' }, rules);
    expect(result.category).toBe('Shopping');
  });

  it('handles invalid regex gracefully', () => {
    const badRules = [{ id: '1', pattern: '[invalid', match_type: 'regex', category: 'Test', priority: 1 }];
    expect(applyRules({ description: 'test' }, badRules)).toBeNull();
  });
});
