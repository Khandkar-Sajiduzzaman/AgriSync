// This middleware checks that a valid login token (JWT) was sent with
// the request, before letting it reach the controller. Same idea as
// checking $_SESSION['user_id'] at the top of a PHP page, except MERN
// APIs are stateless, so instead of a session, the browser sends a
// token in the request header on every request.

const jwt = require("jsonwebtoken");
const User = require("../models/User");

const protect = async (req, res, next) => {
  let token;

  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith("Bearer")) {
    try {
      token = authHeader.split(" ")[1]; // "Bearer <token>" -> take the token part

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // attach the logged-in user to the request, minus the password
      req.user = await User.findById(decoded.id).select("-password");

      if (!req.user) {
        return res.status(401).json({ message: "User no longer exists" });
      }

      next(); // token is valid, continue to the actual route handler
    } catch (error) {
      return res.status(401).json({ message: "Not authorized, invalid token" });
    }
  } else {
    return res.status(401).json({ message: "Not authorized, no token provided" });
  }
};

module.exports = { protect };
