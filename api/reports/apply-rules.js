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

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { report_id, transaction_ids } = req.body || {};
  if (!report_id || !transaction_ids || !Array.isArray(transaction_ids)) {
    return res.status(400).json({ error: 'Missing report_id or transaction_ids' });
  }

  try {
    const rules = await getRules(sql);

    const transactions = await sql`
      SELECT * FROM transactions WHERE id = ANY(${transaction_ids})
    `;

    const updates = [];
    for (const t of transactions) {
      const match = applyRules(t, rules);
      updates.push({
        transaction_id: t.id,
        category: match?.category || 'Uncategorized',
        sub_category: match?.sub_category || null,
        tags: match?.tags || [],
        rule_id: match?.rule_id || null,
      });
    }

    for (const u of updates) {
      await sql`
        UPDATE report_transactions SET
          category = ${u.category},
          sub_category = ${u.sub_category},
          tags = ${JSON.stringify(u.tags)},
          rule_id = ${u.rule_id}
        WHERE report_id = ${report_id} AND transaction_id = ${u.transaction_id}
      `;
    }

    return res.status(200).json({ updated: updates.length });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

export default withAuth(handler);
