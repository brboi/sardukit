export async function getSetting(sql, key, defaultValue = null) {
  try {
    const rows = await sql`SELECT value FROM settings WHERE key = ${key} LIMIT 1`;
    if (rows.length === 0) return defaultValue;
    return typeof rows[0].value === 'string' ? rows[0].value : rows[0].value;
  } catch {
    return defaultValue;
  }
}
