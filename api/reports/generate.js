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

  if (req.method === 'GET') {
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

      return res.status(200).json({ report: report[0], breakdown });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
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

      const rules = await getSetting(sql, 'categorization_rules', []);

      let totalAmount = 0;
      const categorized = [];
      for (const t of transactions) {
        const match = applyRules(t, rules);
        const category = match?.category || 'Uncategorized';
        const subCategory = match?.sub_category || null;
        const tags = match?.tags || [];
        categorized.push({ transaction_id: t.id, category, sub_category: subCategory, tags });
        totalAmount += parseFloat(t.amount) || 0;
      }

      const finalBalance = parseFloat(report[0].initial_balance) + totalAmount;

      await sql`DELETE FROM report_transactions WHERE report_id = ${reportId}`;

      for (const c of categorized) {
        await sql`
          INSERT INTO report_transactions (report_id, transaction_id, category, sub_category, tags)
          VALUES (${reportId}, ${c.transaction_id}, ${c.category}, ${c.sub_category}, ${JSON.stringify(c.tags)})
        `;
      }

      await sql`UPDATE reports SET final_balance = ${finalBalance} WHERE id = ${reportId}`;

      const updatedReport = await sql`SELECT * FROM reports WHERE id = ${reportId} LIMIT 1`;

      const breakdown = await sql`
        SELECT category, sub_category, COUNT(*) as count, SUM(t.amount) as total
        FROM report_transactions rt
        JOIN transactions t ON t.id = rt.transaction_id
        WHERE rt.report_id = ${reportId}
        GROUP BY category, sub_category
        ORDER BY total DESC
      `;

      return res.status(200).json({
        report: updatedReport[0],
        breakdown,
        transactions_processed: transactions.length,
        final_balance: finalBalance,
      });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export default withAuth(handler);
