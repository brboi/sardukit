import { withAuth } from '../middleware/auth.js';
import { getDb } from '../utils/db.js';
import { applyRules } from '../../shared/rules.js';

async function getRules(sql) {
  try {
    const rows = await sql`SELECT * FROM rules ORDER BY priority ASC`;
    return rows;
  } catch {
    return [];
  }
}

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

      const page = parseInt(req.query?.page) || 1;
      const pageSize = parseInt(req.query?.page_size) || 25;
      const offset = (page - 1) * pageSize;

      const breakdown = await sql`
        SELECT category, sub_category, COUNT(*) as count, SUM(t.amount) as total
        FROM report_transactions rt
        JOIN transactions t ON t.id = rt.transaction_id
        WHERE rt.report_id = ${reportId}
        GROUP BY category, sub_category
        ORDER BY total DESC
      `;

      const totalCount = await sql`
        SELECT COUNT(*) as count FROM report_transactions WHERE report_id = ${reportId}
      `;

      const transactions = await sql`
        SELECT rt.*, t.execution_date, t.communication, t.details, t.amount
        FROM report_transactions rt
        JOIN transactions t ON t.id = rt.transaction_id
        WHERE rt.report_id = ${reportId}
        ORDER BY COALESCE(t.execution_date, t.accounting_date, t.value_date)
        LIMIT ${pageSize} OFFSET ${offset}
      `;

      return res.status(200).json({
        report: report[0],
        breakdown,
        transactions,
        total_count: parseInt(totalCount[0]?.count) || 0,
        page,
        page_size: pageSize,
      });
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

      const rules = await getRules(sql);

      let totalAmount = 0;
      const categorized = [];
      for (const t of transactions) {
        const match = applyRules(t, rules);
        const category = match?.category || 'Uncategorized';
        const subCategory = match?.sub_category || null;
        const tags = match?.tags || [];
        const ruleId = match?.rule_id || null;
        categorized.push({ transaction_id: t.id, category, sub_category: subCategory, tags, rule_id: ruleId });
        totalAmount += parseFloat(t.amount) || 0;
      }

      const finalBalance = parseFloat(report[0].initial_balance) + totalAmount;

      await sql`DELETE FROM report_transactions WHERE report_id = ${reportId}`;

      for (const c of categorized) {
        await sql`
          INSERT INTO report_transactions (report_id, transaction_id, category, sub_category, tags, rule_id)
          VALUES (${reportId}, ${c.transaction_id}, ${c.category}, ${c.sub_category}, ${JSON.stringify(c.tags)}, ${c.rule_id})
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
