const functions = require("firebase-functions");
const { correoAltaUsuario, enviarCorreoGenerico } = require("../services/correoService");

// Cloud Function: Enviar correo genérico
exports.enviarCorreo = functions.https.onRequest(async (req, res) => {
  return enviarCorreoGenerico(req, res);
});

// Cloud Function: Correo de ALTA
exports.correoAltaUsuario = functions.https.onRequest(async (req, res) => {
  return correoAltaUsuario(req, res);
});
