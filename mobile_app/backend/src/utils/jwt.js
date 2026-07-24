const jwt = require('jsonwebtoken');

const accessTokenTtl = process.env.ACCESS_TOKEN_TTL || '15m';
const refreshTokenTtlDays = parseInt(process.env.REFRESH_TOKEN_TTL_DAYS || '30', 10);

function signAccessToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: accessTokenTtl }
  );
}

function verifyAccessToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}

module.exports = {
  signAccessToken,
  verifyAccessToken,
  refreshTokenTtlDays,
};
