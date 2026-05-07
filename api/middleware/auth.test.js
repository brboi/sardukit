import jwt from 'jsonwebtoken';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { withAuth } from './auth.js';

vi.mock('../utils/config.js', () => ({
  JWT_SECRET: 'test-secret-key'
}));

describe('withAuth middleware', () => {
  let mockReq;
  let mockRes;

  beforeEach(() => {
    mockReq = { headers: {} };
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis()
    };
  });

  it('should return NO_TOKEN when no authorization header', async () => {
    const handler = vi.fn();
    const middleware = withAuth(handler);

    await middleware(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: 'Authentification requise',
      code: 'NO_TOKEN'
    });
    expect(handler).not.toHaveBeenCalled();
  });

  it('should return NO_TOKEN when authorization header does not start with Bearer', async () => {
    mockReq.headers.authorization = 'Basic token123';
    const handler = vi.fn();
    const middleware = withAuth(handler);

    await middleware(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: 'Authentification requise',
      code: 'NO_TOKEN'
    });
    expect(handler).not.toHaveBeenCalled();
  });

  it('should return TOKEN_EXPIRED when token has expired', async () => {
    const expiredToken = jwt.sign(
      { email: 'test@example.com' },
      'test-secret-key',
      { expiresIn: '-1h' }
    );
    mockReq.headers.authorization = `Bearer ${expiredToken}`;
    const handler = vi.fn();
    const middleware = withAuth(handler);

    await middleware(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: 'Session expirée, reconnectez-vous',
      code: 'TOKEN_EXPIRED'
    });
    expect(handler).not.toHaveBeenCalled();
  });

  it('should return INVALID_TOKEN when token is signed with wrong secret', async () => {
    const wrongSecretToken = jwt.sign(
      { email: 'test@example.com' },
      'wrong-secret',
      { expiresIn: '1h' }
    );
    mockReq.headers.authorization = `Bearer ${wrongSecretToken}`;
    const handler = vi.fn();
    const middleware = withAuth(handler);

    await middleware(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: 'Token invalide, reconnectez-vous',
      code: 'INVALID_TOKEN'
    });
    expect(handler).not.toHaveBeenCalled();
  });

  it('should return INVALID_TOKEN when token is malformed', async () => {
    mockReq.headers.authorization = 'Bearer not.a.valid.token';
    const handler = vi.fn();
    const middleware = withAuth(handler);

    await middleware(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: 'Token invalide, reconnectez-vous',
      code: 'INVALID_TOKEN'
    });
    expect(handler).not.toHaveBeenCalled();
  });

  it('should call handler with valid token and set req.user', async () => {
    const validToken = jwt.sign(
      { email: 'test@example.com' },
      'test-secret-key',
      { expiresIn: '1h' }
    );
    mockReq.headers.authorization = `Bearer ${validToken}`;
    const handler = vi.fn().mockResolvedValue(undefined);
    const middleware = withAuth(handler);

    await middleware(mockReq, mockRes);

    expect(mockReq.user.email).toBe('test@example.com');
    expect(handler).toHaveBeenCalledWith(mockReq, mockRes);
    expect(mockRes.status).not.toHaveBeenCalled();
    expect(mockRes.json).not.toHaveBeenCalled();
  });
});
