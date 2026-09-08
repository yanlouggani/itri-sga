const { verifyAccessToken } = require('../utils/jwt');

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) {
    return res.status(401).json({ message: 'Missing access token' });
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, role: payload.role };
    return next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

function requireRole(roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    return next();
  };
}

function requireInternalApiKeyOrAuth(roles = ['ADMIN']) {
  return (req, res, next) => {
    const internalKey = req.headers['x-internal-api-key'];
    if (internalKey && process.env.RECURRING_INTERNAL_API_KEY && internalKey === process.env.RECURRING_INTERNAL_API_KEY) {
      req.user = { id: 'system', role: 'ADMIN' };
      return next();
    }

    return requireAuth(req, res, () => requireRole(roles)(req, res, next));
  };
}

module.exports = { requireAuth, requireRole, requireInternalApiKeyOrAuth };
