function getColumnValue(transaction, column) {
  if (column === 'any') {
    return [transaction.communication, transaction.description, transaction.details]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
  }
  return ((transaction[column] || '')).toLowerCase();
}

function matchesPattern(value, pattern, matchType) {
  if (!pattern) return false;
  const p = pattern.toLowerCase();
  switch (matchType || 'contains') {
    case 'contains':
      return value.includes(p);
    case 'starts_with':
      return value.startsWith(p);
    case 'ends_with':
      return value.endsWith(p);
    case 'regex':
      try {
        return new RegExp(pattern, 'i').test(value);
      } catch {
        return false;
      }
    case 'exact':
      return value === p;
    default:
      return false;
  }
}

function criteriaMatch(transaction, criteria, mode) {
  if (!criteria || criteria.length === 0) return false;
  if (mode === 'AND') {
    return criteria.every(c => {
      const val = getColumnValue(transaction, c.column);
      return matchesPattern(val, c.pattern, c.match_type);
    });
  }
  // OR mode
  return criteria.some(c => {
    const val = getColumnValue(transaction, c.column);
    return matchesPattern(val, c.pattern, c.match_type);
  });
}

export function applyRules(transaction, rules) {
  if (!rules || rules.length === 0) return null;

  const sorted = [...rules].sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));

  for (const rule of sorted) {
    if (!rule.criteria || rule.criteria.length === 0) continue;
    if (criteriaMatch(transaction, rule.criteria, rule.criteria_mode || 'AND')) {
      return {
        category: rule.category,
        sub_category: rule.sub_category || null,
        tags: rule.tags || [],
        rule_id: rule.id,
      };
    }
  }

  return null;
}
