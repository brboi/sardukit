import Papa from 'papaparse';

const COLUMN_MAP = {
  // BNP
  'nº de séquence': 'sequence_number',
  'date d\'exécution': 'execution_date',
  'date valeur': 'value_date',
  'montant': 'amount',
  'devise du compte': 'currency',
  'numéro de compte': 'account_number',
  'type de transaction': 'transaction_type',
  'contrepartie': 'counterparty_account',
  'nom de la contrepartie': 'counterparty_name',
  'communication': 'communication',
  'détails': 'details',
  'statut': 'status',
  'motif du refus': 'rejection_reason',
  // Belfius
  'date de comptabilisation': 'accounting_date',
  'numéro d\'extrait': 'extract_number',
  'numéro de transaction': 'sequence_number',
  'compte': 'account_number',
  'compte contrepartie': 'counterparty_account',
  'nom contrepartie contient': 'counterparty_name',
  'rue et numéro': 'counterparty_street',
  'code postal et localité': 'counterparty_city',
  'transaction': 'details',
  'communications': 'communication',
  // Common
  'devise': 'currency',
  'bic': 'bic',
  'code pays': 'country_code',
};

export function detectColumns(headers) {
  const mapping = {};
  headers.forEach((h, idx) => {
    const normalized = h.trim().toLowerCase();
    if (COLUMN_MAP[normalized]) {
      mapping[COLUMN_MAP[normalized]] = idx;
    }
  });
  return mapping;
}

export function parseCSV(text, skipLines = 0) {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (skipLines >= lines.length) {
    return { headers: [], rows: [], rawText: text };
  }

  const dataLines = lines.slice(skipLines);
  const result = Papa.parse(dataLines.join('\n'), {
    header: false,
    skipEmptyLines: true,
  });

  return {
    headers: result.data[0] || [],
    rows: result.data.slice(1),
    rawText: text,
  };
}

export function normalizeDate(val) {
  if (!val) return '';
  val = String(val).trim();
  const m = val.match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);
  if (m) {
    let [, d, mo, y] = m;
    if (y.length === 2) y = `20${y}`;
    return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return val;
}

export function parseAmount(val) {
  if (!val) return 0;
  val = String(val).trim().replace(/\s/g, '').replace(',', '.');
  const n = parseFloat(val);
  return isNaN(n) ? 0 : n;
}

export function mapRows(rows, columnMapping) {
  return rows
    .map(row => {
      const mapped = {};
      for (const [dbCol, csvIdx] of Object.entries(columnMapping)) {
        if (csvIdx < row.length) {
          let val = row[csvIdx];
          if (dbCol === 'amount') {
            val = parseAmount(val);
          } else if (dbCol.endsWith('_date')) {
            val = normalizeDate(val);
          }
          mapped[dbCol] = val;
        }
      }
      return mapped;
    })
    .filter(r => r.amount !== 0 || r.execution_date || r.accounting_date || r.value_date);
}
