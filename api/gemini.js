import { withAuth } from './middleware/auth.js';
import { getDb } from './utils/db.js';
import { getSetting } from './utils/settings.js';
import { callGemini } from './utils/gemini.js';
import { renderPrompt } from './utils/template.js';
import { RuleSuggestionSchema } from './schemas/rule-suggestion.js';

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { descriptions, categories } = req.body || {};
  if (!descriptions || !Array.isArray(descriptions) || descriptions.length === 0) {
    return res.status(400).json({ error: 'Missing descriptions array' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
  }

  const sql = getDb();

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
