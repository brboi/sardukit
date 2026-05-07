import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from './utils/config.js';
import { getDb } from './utils/db.js';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const JWT_EXPIRY = '24h';

async function getWhitelist() {
  const envEmails = process.env.ALLOWED_EMAILS;
  if (envEmails) {
    return envEmails.split(',').map(e => e.trim().toLowerCase());
  }

  try {
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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { token } = req.body || {};
  if (!token) {
    return res.status(400).json({ error: 'Missing token' });
  }

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const email = ticket.payload.email?.toLowerCase();
    if (!email) {
      return res.status(401).json({ error: 'No email in token' });
    }

    const whitelist = await getWhitelist();
    if (whitelist.length > 0 && !whitelist.includes(email)) {
      return res.status(403).json({ error: 'Email not whitelisted' });
    }

    const sessionToken = jwt.sign(
      { email, iat: Math.floor(Date.now() / 1000), whitelist_checked_at: Date.now() },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );

    res.status(200).json({ token: sessionToken, email });
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
}
