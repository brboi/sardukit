import { withAuth } from './middleware/auth.js';
import { getDb } from './utils/db.js';
import { renderColumnMappingPrompt } from './utils/template.js';
import { ColumnMappingJsonSchema } from './schemas/column-mapping.js';

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { headers } = req.body || {};
  if (!headers || !Array.isArray(headers) || headers.length === 0) {
    return res.status(400).json({ error: 'Missing headers array' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
  }

  const sql = getDb();

  try {
    let template = null;
    try {
      const rows = await sql`SELECT value FROM settings WHERE key = 'column_mapping_prompt_template' LIMIT 1`;
      if (rows.length > 0) {
        template = typeof rows[0].value === 'string' ? rows[0].value : null;
      }
    } catch {
      // Use default template
    }

    const prompt = renderColumnMappingPrompt(template, headers);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0,
            response_schema: ColumnMappingJsonSchema,
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
      const result = JSON.parse(text);
      return res.status(200).json(result);
    } catch {
      return res.status(500).json({ error: 'Failed to parse response as JSON', raw: text });
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

export default withAuth(handler);
