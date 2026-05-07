import { withAuth } from './middleware/auth.js';
import { getDb } from './utils/db.js';
import { getSetting } from './utils/settings.js';
import { callGemini } from './utils/gemini.js';
import { renderColumnMappingPrompt } from './utils/template.js';
import { ColumnMappingSchema } from './schemas/column-mapping.js';

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
    const template = await getSetting(sql, 'column_mapping_prompt_template', null);
    const prompt = renderColumnMappingPrompt(template, headers);
    const text = await callGemini(apiKey, prompt, ColumnMappingSchema);

    try {
      let parsed = JSON.parse(text);
      if (typeof parsed.mapping === 'string') {
        try {
          parsed.mapping = JSON.parse(parsed.mapping);
        } catch {
          parsed.mapping = [];
        }
      }
      if (!Array.isArray(parsed.mapping)) {
        parsed.mapping = [];
      }
      const result = ColumnMappingSchema.parse(parsed);
      const mapping = Object.fromEntries(result.mapping.map(m => [m.header, m.field]));
      return res.status(200).json({ mapping });
    } catch (err) {
      const truncated = text.length > 500 ? text.slice(0, 500) + '...' : text;
      return res.status(500).json({ error: 'Invalid response format', details: err.message, raw: truncated });
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

export default withAuth(handler);
