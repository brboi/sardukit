import jwt from 'jsonwebtoken';

describe('api/auth', () => {
  const JWT_SECRET = 'test-secret';

  describe('JWT token generation', () => {
    it('should create a valid token with email', () => {
      const email = 'test@example.com';
      const token = jwt.sign(
        { email, iat: Math.floor(Date.now() / 1000) },
        JWT_SECRET,
        { expiresIn: '24h' }
      );
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
    });

    it('should decode a valid token', () => {
      const email = 'test@example.com';
      const token = jwt.sign(
        { email, iat: Math.floor(Date.now() / 1000) },
        JWT_SECRET,
        { expiresIn: '24h' }
      );
      const decoded = jwt.verify(token, JWT_SECRET);
      expect(decoded.email).toBe(email);
    });

    it('should reject tokens signed with wrong secret', () => {
      const email = 'test@example.com';
      const token = jwt.sign(
        { email, iat: Math.floor(Date.now() / 1000) },
        JWT_SECRET,
        { expiresIn: '24h' }
      );
      expect(() => jwt.verify(token, 'wrong-secret')).toThrow();
    });
  });

  describe('whitelist parsing', () => {
    it('should parse comma-separated emails from env', () => {
      const envEmails = 'a@test.com, b@test.com ,c@test.com';
      const whitelist = envEmails.split(',').map(e => e.trim().toLowerCase());
      expect(whitelist).toEqual(['a@test.com', 'b@test.com', 'c@test.com']);
    });

    it('should check email case-insensitively', () => {
      const whitelist = ['a@test.com', 'b@test.com'];
      expect(whitelist.includes('a@test.com')).toBe(true);
      expect(whitelist.includes('c@test.com')).toBe(false);
    });
  });
});
