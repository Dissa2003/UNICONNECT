const jwt = require("jsonwebtoken");
const User = require("../models/User");

exports.protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return res.status(401).json({ message: "Not authorized, no token" });
  }

  try {
    const decoded = jwt.verify(token, "secretkey");
    const dbUser = await User.findById(decoded.id).select("_id role tokenVersion");
    if (!dbUser) {
      return res.status(401).json({ message: "Token invalid" });
    }

    if ((decoded.tokenVersion ?? 0) !== (dbUser.tokenVersion ?? 0)) {
      return res.status(401).json({ message: "Token expired. Please login again." });
    }

    req.user = {
      id: dbUser._id.toString(),
      role: dbUser.role,
      tokenVersion: dbUser.tokenVersion
    };
    next();
  } catch (error) {
    console.log("Token verification error:", error.message);
    res.status(401).json({ message: "Token invalid", error: error.message });
  }
};

exports.authorize = (roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }
    next();
  };
};