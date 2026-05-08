import { withAuth } from './middleware/auth.js';
import { getDb } from './utils/db.js';

async function handler(req, res) {
  const sql = getDb();

  if (req.method === 'GET') {
    try {
      const rows = await sql`SELECT * FROM rules ORDER BY priority ASC`;
      return res.status(200).json(rows);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'POST') {
    const { id, priority, criteria, criteria_mode, category, sub_category, tags } = req.body || {};
    if (!category || typeof category !== 'string') {
      return res.status(400).json({ error: 'Missing category' });
    }
    if (!criteria || !Array.isArray(criteria) || criteria.length === 0) {
      return res.status(400).json({ error: 'Missing criteria array' });
    }

    try {
      let rows;
      if (id) {
        rows = await sql`
          UPDATE rules SET
            priority = ${priority ?? 0},
            criteria = ${JSON.stringify(criteria)},
            criteria_mode = ${criteria_mode || 'AND'},
            category = ${category},
            sub_category = ${sub_category || null},
            tags = ${JSON.stringify(tags || [])},
            updated_at = NOW()
          WHERE id = ${id}
          RETURNING *
        `;
      } else {
        rows = await sql`
          INSERT INTO rules (priority, criteria, criteria_mode, category, sub_category, tags)
          VALUES (${priority ?? 0}, ${JSON.stringify(criteria)}, ${criteria_mode || 'AND'}, ${category}, ${sub_category || null}, ${JSON.stringify(tags || [])})
          RETURNING *
        `;
      }
      return res.status(200).json(rows[0]);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'DELETE') {
    const { id } = req.body || {};
    if (!id) {
      return res.status(400).json({ error: 'Missing rule id' });
    }
    try {
      await sql`DELETE FROM rules WHERE id = ${id}`;
      return res.status(200).json({ deleted: id });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export default withAuth(handler);
