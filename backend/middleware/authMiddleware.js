const jwt = require("jsonwebtoken");
const prisma = require('../config/db');

// In-memory cache with MAX size to prevent memory leak
const userCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 500;

const protect = async (req, res, next) => {
  let token;

  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith("Bearer")) {
    try {
      token = authHeader.split(" ")[1];

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // SECURITY: Check if token is expired (jwt.verify throws if expired, but double-check)
      if (decoded.exp && decoded.exp * 1000 < Date.now()) {
        return res.status(401).json({ message: "Not authorized, token expired" });
      }

      // Check cache first
      const cached = userCache.get(decoded.id);
      if (cached && cached.expiresAt > Date.now()) {
        // SECURITY: Verify user is still active
        if (cached.user.accountStatus === 'suspended') {
          userCache.delete(decoded.id);
          return res.status(403).json({ message: 'Account suspended' });
        }
        req.user = cached.user;
        return next();
      }

      // Cache miss: hit the database
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          phone: true,
          address: true,
          bio: true,
          profileImage: true,
          accountStatus: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!user) {
        return res.status(401).json({ message: 'User no longer exists' });
      }

      // SECURITY: Block suspended accounts
      if (user.accountStatus === 'suspended') {
        return res.status(403).json({ message: 'Account suspended' });
      }

      // SECURITY: Prevent cache from growing forever
      if (userCache.size >= MAX_CACHE_SIZE) {
        const firstKey = userCache.keys().next().value;
        userCache.delete(firstKey);
      }

      userCache.set(decoded.id, { user, expiresAt: Date.now() + CACHE_TTL_MS });
      req.user = user;
      next();
    } catch (error) {
      return res.status(401).json({ message: "Not authorized, invalid token" });
    }
  } else {
    return res.status(401).json({ message: "Not authorized, no token provided" });
  }
};

const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Admin access required' });
  }
};

module.exports = { protect, adminOnly, userCache };