const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { correoConfirmacionTurno } = require("../services/turnosService");

if (!admin.apps.length) admin.initializeApp();

exports.auditarTurno = functions.https.onRequest(async (req, res) => {
  try {
    if (req.method !== "POST")
      return res.status(405).json({ msg: "Método no permitido" });

    const {
      turnoId,
      nuevoEstado,
      paciente_email,
      paciente_nombre,
      fecha,
      hora,
    } = req.body;

    const evento = {
      turnoId,
      evento: nuevoEstado,
      paciente_email,
      paciente_nombre,
      fecha,
      hora,
      timestamp: new Date().toISOString(),
    };

    //Registrar auditoría
    await admin.database().ref("auditorias").push(evento);

    //Enviar correo
    await correoConfirmacionTurno({
      paciente_email,
      paciente_nombre,
      fecha,
      hora,
      nuevoEstado,
    });

    return res.status(200).json({ msg: "Auditoría realizada." });

  } catch (err) {
    console.error("Error auditoría:", err.message);
    return res.status(500).json({ msg: "Error interno." });
  }
});
