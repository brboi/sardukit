import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../utils/config.js';

export function withAuth(handler) {
  return async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentification requise', code: 'NO_TOKEN' });
    }
    try {
      const token = authHeader.slice(7);
      const payload = jwt.verify(token, JWT_SECRET);
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
