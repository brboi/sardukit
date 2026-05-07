import { withAuth } from './middleware/auth.js';
import { getDb } from './utils/db.js';

async function handler(req, res) {
  const sql = getDb();

  if (req.method === 'GET') {
    try {
      const rows = await sql`SELECT * FROM reports ORDER BY created_at DESC`;
      return res.status(200).json(rows);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'POST') {
    const { name, year, initial_balance } = req.body || {};
    if (!year || typeof year !== 'number' || year < 2000 || year > 2099) {
      return res.status(400).json({ error: 'Missing or invalid year (2000-2099)' });
    }

    try {
      const rows = await sql`
        INSERT INTO reports (name, year, initial_balance, final_balance)
        VALUES (${name || `Report ${year}`}, ${year}, ${initial_balance || 0}, ${initial_balance || 0})
        RETURNING *
      `;
      return res.status(201).json(rows[0]);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export default withAuth(handler);
