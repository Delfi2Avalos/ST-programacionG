//Middleware verificación y generación de tokens JWT ayudado por jsonwebtoken

const jwt = require("jsonwebtoken");
require("dotenv").config();

const verifyJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Token requerido" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: "Token inválido o expirado" });
  }
};

const generateJWT = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "8h" });
};

module.exports = { verifyJWT, generateJWT };
