import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  const sql = neon(process.env.DATABASE_URL);

  if (req.method === 'GET') {
    try {
      const rows = await sql`SELECT * FROM reports ORDER BY created_at DESC`;
      return res.status(200).json(rows);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'POST') {
    const { name, start_date, end_date, initial_balance } = req.body || {};
    if (!start_date || !end_date) {
      return res.status(400).json({ error: 'Missing start_date or end_date' });
    }

    try {
      const rows = await sql`
        INSERT INTO reports (name, start_date, end_date, initial_balance, final_balance)
        VALUES (${name || 'Report'}, ${start_date}, ${end_date}, ${initial_balance || 0}, ${initial_balance || 0})
        RETURNING *
      `;
      return res.status(201).json(rows[0]);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
