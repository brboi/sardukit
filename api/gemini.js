import { withAuth } from './middleware/auth.js';
import { getDb } from './utils/db.js';
import { getSetting } from './utils/settings.js';
import { callGemini } from './utils/gemini.js';
import { renderPrompt, renderSuggestRulesPrompt } from './utils/template.js';
import { RuleSuggestionSchema } from './schemas/rule-suggestion.js';
import { BatchRuleSuggestionSchema } from './schemas/rule-suggestion-batch.js';

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
  }

  const sql = getDb();

  // Batch rule suggestions from groups
  if (req.query?.suggest_rules) {
    const { groups } = req.body || {};
    if (!groups || !Array.isArray(groups) || groups.length === 0) {
      return res.status(400).json({ error: 'Missing groups array' });
    }

    try {
      const template = await getSetting(sql, 'gemini_prompt_template', null);
      const existingRules = await getSetting(sql, 'categorization_rules', []);
      const categories = [...new Set((Array.isArray(existingRules) ? existingRules : []).flatMap(r => r.category || '').filter(Boolean))];
      const tags = [...new Set((Array.isArray(existingRules) ? existingRules : []).flatMap(r => r.tags || []).filter(Boolean))];

      const prompt = renderSuggestRulesPrompt(template, groups, categories, tags);
      const text = await callGemini(apiKey, prompt, BatchRuleSuggestionSchema);

      try {
        const result = BatchRuleSuggestionSchema.parse(JSON.parse(text));
        return res.status(200).json(result);
      } catch (err) {
        const truncated = text.length > 500 ? text.slice(0, 500) + '...' : text;
        return res.status(500).json({ error: 'Invalid response format', details: err.message, raw: truncated });
      }
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // Single rule suggestion (legacy)
  const { descriptions, categories } = req.body || {};
  if (!descriptions || !Array.isArray(descriptions) || descriptions.length === 0) {
    return res.status(400).json({ error: 'Missing descriptions array' });
  }

  try {
    const template = await getSetting(sql, 'gemini_prompt_template', null);

    let tags = [];
    try {
      const rules = await getSetting(sql, 'categorization_rules', []);
      if (Array.isArray(rules)) {
        tags = [...new Set(rules.flatMap(r => r.tags || []))];
      }
    } catch {
      // No rules yet
    }

    const context = {
      transactions: descriptions,
      categories: categories || [],
      tags,
    };

    const prompt = renderPrompt(template, context);
    const text = await callGemini(apiKey, prompt, RuleSuggestionSchema);

    try {
      const rule = RuleSuggestionSchema.parse(JSON.parse(text));
      return res.status(200).json(rule);
    } catch (err) {
      const truncated = text.length > 500 ? text.slice(0, 500) + '...' : text;
      return res.status(500).json({ error: 'Invalid response format', details: err.message, raw: truncated });
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

export default withAuth(handler);
