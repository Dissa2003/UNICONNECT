const jwt = require("jsonwebtoken");
const User = require("../models/User");

function normalizeRole(rawRole) {
  if (typeof rawRole !== "string") {
    return null;
  }

  const role = rawRole.trim().toLowerCase();
  if (["student", "tutor", "admin"].includes(role)) {
    return role;
  }

  return null;
}

function getUserRoles(user) {
  const roles = Array.isArray(user.roles)
    ? user.roles.map((r) => normalizeRole(r)).filter(Boolean)
    : [];

  if (roles.length > 0) {
    return Array.from(new Set(roles));
  }

  const legacyRole = normalizeRole(user.role);
  return legacyRole ? [legacyRole] : [];
}

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
    const dbUser = await User.findById(decoded.id).select("_id role roles tokenVersion");
    if (!dbUser) {
      return res.status(401).json({ message: "Token invalid" });
    }

    if ((decoded.tokenVersion ?? 0) !== (dbUser.tokenVersion ?? 0)) {
      return res.status(401).json({ message: "Token expired. Please login again." });
    }

    const availableRoles = getUserRoles(dbUser);
    const tokenRole = normalizeRole(decoded.role) || normalizeRole(dbUser.role) || availableRoles[0];

    if (!tokenRole || !availableRoles.includes(tokenRole)) {
      return res.status(401).json({ message: "Token role is no longer valid. Please login again." });
    }

    req.user = {
      id: dbUser._id.toString(),
      role: tokenRole,
      availableRoles,
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