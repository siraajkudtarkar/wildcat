const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const DEMO_TOKEN = process.env.DEMO_TOKEN;

async function auth(req, res, next) {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }
  const token = authHeader.split(' ')[1];
  try {
    // Allow a fixed demo token from env for testing tools
    if (DEMO_TOKEN && token === DEMO_TOKEN) {
      const demoUser = await User.findOne({ email: 'demo@wildcat.test' }) || await User.findOne();
      if (!demoUser) return res.status(401).json({ error: 'Invalid token' });
      req.user = { id: String(demoUser._id), email: demoUser.email };
      return next();
    }
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = { id: payload.id, email: payload.email };
    next();
  } catch (err) {
    console.error('Auth middleware error', err);
    return res.status(401).json({ error: 'Invalid token' });
  }
}

module.exports = auth;
