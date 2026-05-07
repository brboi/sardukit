import { withAuth } from './middleware/auth.js';
import { getDb } from './utils/db.js';

async function handler(req, res) {
  const sql = getDb();

  if (req.method === 'GET' && req.query?.key === 'defaults') {
    const { DEFAULT_PROMPT_TEMPLATE, DEFAULT_COLUMN_MAPPING_PROMPT } = await import('./utils/template.js');
    return res.status(200).json({
      gemini_prompt_template: DEFAULT_PROMPT_TEMPLATE,
      column_mapping_prompt_template: DEFAULT_COLUMN_MAPPING_PROMPT,
    });
  }

  if (req.method === 'GET') {
    const { key } = req.query || {};
    try {
      if (key) {
        const rows = await sql`SELECT value FROM settings WHERE key = ${key} LIMIT 1`;
        if (rows.length === 0) return res.status(404).json({ error: 'Key not found' });
        let value = rows[0].value;
        if (typeof value === 'string') {
          try { value = JSON.parse(value); } catch { /* keep raw string */ }
        }
        return res.status(200).json({ key, value });
      }
      const rows = await sql`SELECT key, value FROM settings ORDER BY key`;
      return res.status(200).json(rows.map(r => {
        let value = r.value;
        if (typeof value === 'string') {
          try { value = JSON.parse(value); } catch { /* keep raw string */ }
        }
        return { key: r.key, value };
      }));
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'POST') {
    const { key, value } = req.body || {};
    if (!key || typeof key !== 'string') {
      return res.status(400).json({ error: 'Missing key' });
    }
    try {
      await sql`
        INSERT INTO settings (key, value) VALUES (${key}, ${JSON.stringify(value)})
        ON CONFLICT (key) DO UPDATE SET value = ${JSON.stringify(value)}
      `;
      return res.status(200).json({ key, value });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'DELETE') {
    const { key } = req.body || {};
    if (!key || typeof key !== 'string') {
      return res.status(400).json({ error: 'Missing key' });
    }
    try {
      await sql`DELETE FROM settings WHERE key = ${key}`;
      return res.status(200).json({ deleted: key });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export default withAuth(handler);
