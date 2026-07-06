const jwt = require('jsonwebtoken');

function generateToken(user) {
  // user: object with at least user._id and maybe role
  return jwt.sign(
    {
      id: user._id,
      role: user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: '1d' }
  );
}

module.exports = generateToken;
