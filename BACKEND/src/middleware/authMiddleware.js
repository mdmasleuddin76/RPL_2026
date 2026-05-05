import jwt from 'jsonwebtoken';
const JWT_SECRET = process.env.JWT_SECRET || 'rpl_secret_key_2026';

export const protectAdmin = (req, res, next) => {
  let token = req.headers.authorization;

  if (token && token.startsWith('Bearer')) {
    try {
      token = token.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET);
      req.admin = decoded; // Attach admin info to request
      next();
    } catch (error) {
      res.status(401).json({ message: 'Not authorized, token failed' });
    }
  } else {
    res.status(401).json({ message: 'Not authorized, no token' });
  }
};