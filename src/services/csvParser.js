import Papa from 'papaparse';
import { normalizeDate, parseAmount, isValidTransactionRow } from '../../shared/parsers.js';

export { normalizeDate, parseAmount };

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

export function parseCSV(text, skipLines = 0, skipFooter = 0) {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  const totalSkip = skipLines + skipFooter;
  if (totalSkip >= lines.length) {
    return { headers: [], rows: [], rawText: text };
  }

  const dataLines = lines.slice(skipLines, skipFooter > 0 ? -skipFooter : undefined);
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

export function detectFooterLines(text, skipLines = 0) {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (skipLines >= lines.length) return 0;

  const dataLines = lines.slice(skipLines);
  const result = Papa.parse(dataLines.join('\n'), {
    header: false,
    skipEmptyLines: true,
  });

  let footerCount = 0;
  for (let i = result.data.length - 1; i >= 0; i--) {
    const row = result.data[i];
    const hasValidDate = row.some(cell => /\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}/.test(String(cell)));
    const hasSequenceLike = row.some(cell => /^[\dA-Z]{4,}$/.test(String(cell).trim()));
    if (!hasValidDate && !hasSequenceLike) {
      footerCount++;
    } else {
      break;
    }
  }
  return footerCount;
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
    .filter(isValidTransactionRow);
}
