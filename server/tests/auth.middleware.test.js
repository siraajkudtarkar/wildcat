const jwt = require('jsonwebtoken');
const auth = require('../src/middleware/auth');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

const makeRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('auth middleware', () => {
  it('accepts a valid bearer token and sets req.user', () => {
    const token = jwt.sign({ id: 'user123', email: 'a@test.com' }, JWT_SECRET);
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = makeRes();
    const next = jest.fn();

    auth(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
    expect(req.user).toEqual({ id: 'user123', email: 'a@test.com' });
  });

  it('rejects missing Authorization header', () => {
    const req = { headers: {} };
    const res = makeRes();
    const next = jest.fn();

    auth(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing or invalid Authorization header' });
  });

  it('rejects an invalid token', () => {
    const req = { headers: { authorization: 'Bearer not-a-real-token' } };
    const res = makeRes();
    const next = jest.fn();

    auth(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid token' });
  });
});
