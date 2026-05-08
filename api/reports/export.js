import { withAuth } from '../middleware/auth.js';
import { getDb } from '../utils/db.js';

async function handler(req, res) {
  const sql = getDb();

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const reportId = req.query?.id;
  if (!reportId) {
    return res.status(400).json({ error: 'Missing report id' });
  }

  try {
    const report = await sql`SELECT * FROM reports WHERE id = ${reportId} LIMIT 1`;
    if (report.length === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }

    const breakdown = await sql`
      SELECT category, sub_category, COUNT(*) as count, SUM(t.amount) as total
      FROM report_transactions rt
      JOIN transactions t ON t.id = rt.transaction_id
      WHERE rt.report_id = ${reportId}
      GROUP BY category, sub_category
      ORDER BY total DESC
    `;

    const transactions = await sql`
      SELECT
        COALESCE(t.execution_date, t.accounting_date, t.value_date) as date,
        COALESCE(t.communication, t.details, '') as description,
        t.amount,
        rt.category,
        rt.sub_category,
        rt.tags,
        rt.rule_id
      FROM report_transactions rt
      JOIN transactions t ON t.id = rt.transaction_id
      WHERE rt.report_id = ${reportId}
      ORDER BY COALESCE(t.execution_date, t.accounting_date, t.value_date)
    `;

    return res.status(200).json({
      report: report[0],
      breakdown,
      transactions,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

export default withAuth(handler);
