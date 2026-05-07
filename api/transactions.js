import { withAuth } from './middleware/auth.js';
import { getDb } from './utils/db.js';
import { normalizeDate, parseAmount, isValidTransactionRow } from '../shared/parsers.js';

const DATE_FIELDS = ['execution_date', 'accounting_date', 'value_date'];

async function handler(req, res) {
  const sql = getDb();

  if (req.method === 'GET') {
    try {
      if (req.query?.sources_only) {
        const rows = await sql`SELECT DISTINCT bank_source FROM transactions WHERE bank_source IS NOT NULL ORDER BY bank_source`;
        return res.status(200).json(rows.map(r => r.bank_source));
      }
      const { start, end } = req.query || {};
      let query;
      if (start && end) {
        query = sql`SELECT * FROM transactions WHERE execution_date >= ${start} AND execution_date <= ${end} ORDER BY execution_date`;
      } else {
        query = sql`SELECT * FROM transactions ORDER BY execution_date DESC LIMIT 100`;
      }
      const rows = await query;
      return res.status(200).json(rows);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'POST') {
    const { transactions, bank_source } = req.body || {};
    if (!transactions || !Array.isArray(transactions)) {
      return res.status(400).json({ error: 'Missing transactions array' });
    }
    if (!bank_source || typeof bank_source !== 'string') {
      return res.status(400).json({ error: 'Missing bank_source' });
    }

    try {
      let saved = 0;
      for (const t of transactions) {
        const seqNum = t.sequence_number || null;
        if (!seqNum) continue;

        const row = {
          bank_source,
          sequence_number: seqNum,
          extract_number: t.extract_number || null,
          account_number: t.account_number || null,
          execution_date: normalizeDate(t.execution_date),
          accounting_date: normalizeDate(t.accounting_date),
          value_date: normalizeDate(t.value_date),
          amount: parseAmount(t.amount),
          currency: t.currency || 'EUR',
          transaction_type: t.transaction_type || null,
          counterparty_account: t.counterparty_account || null,
          counterparty_name: t.counterparty_name || null,
          counterparty_street: t.counterparty_street || null,
          counterparty_city: t.counterparty_city || null,
          communication: t.communication || null,
          details: t.details || null,
          status: t.status || null,
          rejection_reason: t.rejection_reason || null,
          bic: t.bic || null,
          country_code: t.country_code || null,
          raw_data: t,
        };

        if (!isValidTransactionRow(row)) continue;

        if (!isValidTransactionRow(row)) continue;

        await sql`
          INSERT INTO transactions (
            bank_source, sequence_number, extract_number, account_number,
            execution_date, accounting_date, value_date, amount, currency,
            transaction_type, counterparty_account, counterparty_name,
            counterparty_street, counterparty_city, communication, details,
            status, rejection_reason, bic, country_code, raw_data
          ) VALUES (
            ${row.bank_source}, ${row.sequence_number}, ${row.extract_number}, ${row.account_number},
            ${row.execution_date}, ${row.accounting_date}, ${row.value_date}, ${row.amount}, ${row.currency},
            ${row.transaction_type}, ${row.counterparty_account}, ${row.counterparty_name},
            ${row.counterparty_street}, ${row.counterparty_city}, ${row.communication}, ${row.details},
            ${row.status}, ${row.rejection_reason}, ${row.bic}, ${row.country_code}, ${JSON.stringify(row.raw_data)}
          )
          ON CONFLICT (bank_source, sequence_number) DO NOTHING
        `;
        saved++;
      }

      return res.status(200).json({ saved });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export default withAuth(handler);