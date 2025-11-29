//Token Aplicado al ingreso de cualquier tipo de usuario
const jwt = require("jsonwebtoken");

const verificarToken = (req, res, next) => {
  const header = req.headers["authorization"];

  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ mensaje: "Token no proporcionado o inválido." });
  }

  const token = header.split(" ")[1];

  // Verificar el token y guarda en la query del usuario
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = decoded;
    next();
  } catch (err) {
    console.error("Token inválido:", err.message);
    return res.status(403).json({ mensaje: "Token inválido o expirado." });
  }
};

module.exports = verificarToken;
