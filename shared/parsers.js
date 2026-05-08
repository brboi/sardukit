export function normalizeDate(val) {
  if (!val) return null;
  val = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
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

export function isValidTransactionRow(mapped) {
  const hasAmount = mapped.amount !== 0;
  const hasDate = ['execution_date', 'accounting_date', 'value_date'].some(
    k => mapped[k] && typeof mapped[k] === 'string' && mapped[k].length >= 8
  );
  return hasAmount || hasDate;
}
