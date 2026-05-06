import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

export function withAuth(handler) {
  return async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    try {
      const token = authHeader.slice(7);
      const payload = jwt.verify(token, JWT_SECRET);
      req.user = payload;
      return handler(req, res);
    } catch {
      return res.status(401).json({ error: 'Invalid token' });
    }
  };
}
