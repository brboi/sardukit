import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from './utils/config.js';
import { getDb } from './utils/db.js';
import { getWhitelist } from './utils/whitelist.js';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const JWT_EXPIRY = '24h';

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
