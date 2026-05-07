import { withAuth } from '../middleware/auth.js';
import { getDb } from './utils/db.js';
import { getSetting } from './utils/settings.js';
import { applyRules } from '../../shared/rules.js';

async function handler(req, res) {
  const sql = getDb();

  const reportId = req.query?.id;
  if (!reportId) {
    return res.status(400).json({ error: 'Missing report id' });
  }

  if (req.method === 'POST') {
    try {
      const report = await sql`SELECT * FROM reports WHERE id = ${reportId} LIMIT 1`;
      if (report.length === 0) {
        return res.status(404).json({ error: 'Report not found' });
      }

      const year = report[0].year;
      const startDate = `${year}-01-01`;
      const endDate = `${year}-12-31`;

      const transactions = await sql`
        SELECT * FROM transactions
        WHERE (execution_date >= ${startDate} AND execution_date <= ${endDate})
           OR (accounting_date >= ${startDate} AND accounting_date <= ${endDate})
           OR (value_date >= ${startDate} AND value_date <= ${endDate})
        ORDER BY COALESCE(execution_date, accounting_date, value_date)
      `;

      const rulesValue = await getSetting(sql, 'categorization_rules', []);
      const rules = typeof rulesValue === 'string' ? JSON.parse(rulesValue) : rulesValue;

      let totalAmount = 0;
      const insertQueries = [];
      for (const t of transactions) {
        const match = applyRules(t, rules);
        const category = match?.category || 'Uncategorized';
        const subCategory = match?.sub_category || null;
        const tags = match?.tags || [];

        insertQueries.push(sql`
          INSERT INTO report_transactions (report_id, transaction_id, category, sub_category, tags)
          VALUES (${reportId}, ${t.id}, ${category}, ${subCategory}, ${JSON.stringify(tags)})
        `);
        totalAmount += parseFloat(t.amount) || 0;
      }

      const finalBalance = parseFloat(report[0].initial_balance) + totalAmount;

      const allQueries = [
        sql`DELETE FROM report_transactions WHERE report_id = ${reportId}`,
        ...insertQueries,
        sql`UPDATE reports SET final_balance = ${finalBalance} WHERE id = ${reportId}`,
      ];

      await sql.transaction(allQueries);
      const report = await sql`SELECT * FROM reports WHERE id = ${reportId} LIMIT 1`;
      return res.status(200).json({ report: report[0], breakdown: rows });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export default withAuth(handler);
