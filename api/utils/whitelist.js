export async function getWhitelist() {
  const envEmails = process.env.ALLOWED_EMAILS;
  if (envEmails) {
    return envEmails.split(',').map(e => e.trim().toLowerCase());
  }

  try {
    const { getDb } = await import('./db.js');
    const sql = getDb();
    const rows = await sql`
      SELECT value FROM settings WHERE key = 'google_oauth_email_whitelist' LIMIT 1
    `;
    if (rows.length === 0) return [];
    const value = rows[0].value;
    return typeof value === 'string'
      ? value.split(',').map(e => e.trim().toLowerCase())
      : [];
  } catch {
    return [];
  }
}
