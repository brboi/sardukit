import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../utils/config.js';

const WHITELIST_RECHECK_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

async function getWhitelist() {
  const envEmails = process.env.ALLOWED_EMAILS;
  if (envEmails) {
    return envEmails.split(',').map(e => e.trim().toLowerCase());
  }

  try {
    const { getDb } = await import('../utils/db.js');
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

export function withAuth(handler) {
  return async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentification requise', code: 'NO_TOKEN' });
    }
    try {
      const token = authHeader.slice(7);
      const payload = jwt.verify(token, JWT_SECRET);

      const whitelistCheckedAt = payload.whitelist_checked_at;
      if (whitelistCheckedAt && Date.now() - whitelistCheckedAt > WHITELIST_RECHECK_INTERVAL_MS) {
        const whitelist = await getWhitelist();
        if (whitelist.length > 0 && !whitelist.includes(payload.email)) {
          return res.status(403).json({ error: 'Email not whitelisted', code: 'WHITELIST_REVOKED' });
        }
        payload.whitelist_checked_at = Date.now();
      }

      req.user = payload;
      return handler(req, res);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Session expirée, reconnectez-vous', code: 'TOKEN_EXPIRED' });
      }
      return res.status(401).json({ error: 'Token invalide, reconnectez-vous', code: 'INVALID_TOKEN' });
    }
  };
}
