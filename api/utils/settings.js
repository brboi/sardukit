export async function getSetting(sql, key, defaultValue = null) {
  try {
    const rows = await sql`SELECT value FROM settings WHERE key = ${key} LIMIT 1`;
    if (rows.length === 0) return defaultValue;
    const raw = rows[0].value;
    if (typeof raw === 'string') {
      try {
        return JSON.parse(raw);
      } catch {
        return raw;
      }
    }
    return raw;
  } catch {
    return defaultValue;
  }
}
