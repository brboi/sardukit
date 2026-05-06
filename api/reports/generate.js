import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  const sql = neon(process.env.DATABASE_URL);

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

      const transactions = await sql`
        SELECT * FROM transactions
        WHERE date >= ${report[0].start_date} AND date <= ${report[0].end_date}
        ORDER BY date
      `;

      const settings = await sql`SELECT value FROM settings WHERE key = 'categorization_rules' LIMIT 1`;
      const rules = settings.length > 0 ? (typeof settings[0].value === 'string' ? JSON.parse(settings[0].value) : settings[0].value) : [];

      await sql`DELETE FROM report_transactions WHERE report_id = ${reportId}`;

      let totalAmount = 0;
      for (const t of transactions) {
        const match = applyRules(t, rules);
        const category = match?.category || 'Uncategorized';
        const subCategory = match?.sub_category || null;
        const tags = match?.tags || [];

        await sql`
          INSERT INTO report_transactions (report_id, transaction_id, category, sub_category, tags)
          VALUES (${reportId}, ${t.id}, ${category}, ${subCategory}, ${JSON.stringify(tags)})
        `;
        totalAmount += parseFloat(t.amount);
      }

      const finalBalance = parseFloat(report[0].initial_balance) + totalAmount;
      await sql`
        UPDATE reports SET final_balance = ${finalBalance} WHERE id = ${reportId}
      `;

      return res.status(200).json({
        transactions_processed: transactions.length,
        final_balance: finalBalance,
      });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'GET') {
    try {
      const rows = await sql`
        SELECT rt.category, rt.sub_category, COUNT(*) as count, SUM(t.amount) as total
        FROM report_transactions rt
        JOIN transactions t ON t.id = rt.transaction_id
        WHERE rt.report_id = ${reportId}
        GROUP BY rt.category, rt.sub_category
        ORDER BY total DESC
      `;
      const report = await sql`SELECT * FROM reports WHERE id = ${reportId} LIMIT 1`;
      return res.status(200).json({ report: report[0], breakdown: rows });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

function applyRules(transaction, rules) {
  if (!rules || rules.length === 0) return null;
  const sorted = [...rules].sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));
  const desc = (transaction.description || '').toLowerCase();

  for (const rule of sorted) {
    const pattern = (rule.pattern || '').toLowerCase();
    if (!pattern) continue;

    let match = false;
    switch (rule.match_type || 'contains') {
      case 'contains':
        match = desc.includes(pattern);
        break;
      case 'starts_with':
        match = desc.startsWith(pattern);
        break;
      case 'ends_with':
        match = desc.endsWith(pattern);
        break;
      case 'regex':
        try {
          match = new RegExp(pattern, 'i').test(desc);
        } catch {
          match = false;
        }
        break;
      case 'exact':
        match = desc === pattern;
        break;
    }

    if (match) {
      return {
        category: rule.category,
        sub_category: rule.sub_category || null,
        tags: rule.tags || [],
      };
    }
  }

  return null;
}
