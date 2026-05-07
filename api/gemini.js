import { withAuth } from './middleware/auth.js';
import { getDb } from './utils/db.js';
import { renderPrompt } from './utils/template.js';
import { RuleSuggestionJsonSchema } from './schemas/rule-suggestion.js';

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
    let template = null;
    try {
      const rows = await sql`SELECT value FROM settings WHERE key = 'gemini_prompt_template' LIMIT 1`;
      if (rows.length > 0) {
        template = typeof rows[0].value === 'string' ? rows[0].value : null;
      }
    } catch {
      // Use default template
    }

    let tags = [];
    try {
      const settingsRows = await sql`SELECT value FROM settings WHERE key = 'categorization_rules' LIMIT 1`;
      if (settingsRows.length > 0) {
        const rules = typeof settingsRows[0].value === 'string'
          ? JSON.parse(settingsRows[0].value)
          : settingsRows[0].value;
        if (Array.isArray(rules)) {
          tags = [...new Set(rules.flatMap(r => r.tags || []))];
        }
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

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0,
            response_schema: RuleSuggestionJsonSchema,
          },
        }),
      }
    );

    if (!response.ok) {
      const err = await response.json();
      return res.status(response.status).json({ error: err.error?.message || 'Gemini API error' });
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    try {
      const rule = JSON.parse(text);
      return res.status(200).json(rule);
    } catch {
      return res.status(500).json({ error: 'Failed to parse response as JSON', raw: text });
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

export default withAuth(handler);
