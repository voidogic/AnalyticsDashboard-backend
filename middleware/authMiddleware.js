const jwt = require('jsonwebtoken');

// Verify token
const verifyToken = (req, res, next) => {
  const authHeader = req.header('Authorization');

  if (!authHeader) {
    return res.status(401).json({ message: 'No token provided' });
  }

  const token = authHeader.replace('Bearer ', '');

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    req.userId = decoded.userId;
    req.userRole = decoded.role;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

// Admin check
const isAdmin = (req, res, next) => {
  if (req.userRole !== 'admin') {
    return res.status(403).json({ message: 'Admin access only' });
  }
  next();
};

// User check
const isUser = (req, res, next) => {
  if (req.userRole !== 'user') {
    return res.status(403).json({ message: 'User access only' });
  }
  next();
};

module.exports = {
  verifyToken,
  isAdmin,
  isUser
};
