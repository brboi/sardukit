export function applyRules(transaction, rules) {
  if (!rules || rules.length === 0) return null;

  const sorted = [...rules].sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));
  const desc = ((transaction.description || transaction.details || '')).toLowerCase();

  for (const rule of sorted) {
    const pattern = (rule.pattern || '').toLowerCase();
    if (!pattern) continue;

    let match = false;
    switch (rule.match_type || 'contains') {
      case 'contains':
        match = desc.includes(pattern);
        break;
      case 'starts_with':
        match = desc.startsWith(pattern);
        break;
      case 'ends_with':
        match = desc.endsWith(pattern);
        break;
      case 'regex':
        try {
          match = new RegExp(pattern, 'i').test(desc);
        } catch {
          match = false;
        }
        break;
      case 'exact':
        match = desc === pattern;
        break;
    }

    if (match) {
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
