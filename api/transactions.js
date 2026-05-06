import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  const sql = neon(process.env.DATABASE_URL);

  if (req.method === 'POST') {
    const { transactions } = req.body || {};
    if (!transactions || !Array.isArray(transactions)) {
      return res.status(400).json({ error: 'Missing transactions array' });
    }

    try {
      const rows = [];
      for (const t of transactions) {
        const externalId = `${t.date}-${t.amount}-${t.description}`;
        rows.push({
          date: t.date || null,
          amount: t.amount || 0,
          description: t.description || '',
          external_id: externalId,
          raw_data: t,
        });
      }

      for (const row of rows) {
        await sql`
          INSERT INTO transactions (date, amount, description, external_id, raw_data)
          VALUES (${row.date}, ${row.amount}, ${row.description}, ${row.external_id}, ${JSON.stringify(row.raw_data)})
          ON CONFLICT (external_id) DO NOTHING
        `;
      }

      return res.status(200).json({ saved: rows.length });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'GET') {
    try {
      const { start, end } = req.query || {};
      let query;
      if (start && end) {
        query = sql`SELECT * FROM transactions WHERE date >= ${start} AND date <= ${end} ORDER BY date`;
      } else {
        query = sql`SELECT * FROM transactions ORDER BY date DESC LIMIT 100`;
      }
      const rows = await query;
      return res.status(200).json(rows);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
