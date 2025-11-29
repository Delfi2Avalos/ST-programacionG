const admin = require("firebase-admin");
const nodemailer = require("nodemailer");

if (!admin.apps.length) {
  admin.initializeApp();
}

// CONFIGURACIÓN DEL SMTP
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// FORMATEAR FECHA/HORA LINDO
function formatearFechaHora(fecha, hora) {
  // Si la fecha ya viene en ISO con "T", la usamos directo
  let fechaCompleta;
  if (typeof fecha === "string" && fecha.includes("T")) {
    fechaCompleta = new Date(fecha);
  } else {
    fechaCompleta = new Date(`${fecha}T${hora}`);
  }

  const fechaFormato = fechaCompleta.toLocaleString("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  // Capitalizar primera letra
  return fechaFormato.charAt(0).toUpperCase() + fechaFormato.slice(1);
}

//ENVIAR CORREO
async function enviarCorreo(destinatario, asunto, mensajeHtml) {
  try {
    await transporter.sendMail({
      from: `"SaludTotal" <${process.env.EMAIL_USER}>`,
      to: destinatario,
      subject: asunto,
      html: mensajeHtml,
    });

    console.log("Correo enviado a:", destinatario);
  } catch (error) {
    console.error("Error enviando correo:", error.message);
  }
}

// FUNCIÓN PRINCIPAL (LÓGICA PURA)
async function auditarCambioTurno(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ msg: "Método no permitido" });
    }

    const {
      turnoId,
      nuevoEstado,
      paciente_email,
      paciente_nombre,
      fecha,
      hora,
    } = req.body;

    if (!turnoId || !nuevoEstado || !paciente_email || !fecha || !hora) {
      return res.status(400).json({ msg: "Faltan datos para auditar." });
    }

    console.log("Auditoría ejecutada:", {
      turnoId,
      nuevoEstado,
      paciente_email,
      paciente_nombre,
      fecha,
      hora,
    });

    const fechaBonita = formatearFechaHora(fecha, hora);

    //Registrar auditoría en RTDB
    await admin.database().ref("auditorias").push({
      turnoId,
      evento: nuevoEstado,
      paciente_email,
      paciente_nombre,
      fecha: fechaBonita,
      timestamp: new Date().toISOString(),
    });

    //Enviar correos según estado
    if (nuevoEstado === "confirmado") {
      await enviarCorreo(
        paciente_email,
        "Tu turno fue confirmado",
        `
          <h2>Tu turno fue confirmado</h2>
          <p>Hola ${paciente_nombre || ""},</p>
          <p>El médico confirmó tu turno para:</p>
          <p><strong>${fechaBonita}</strong></p>
          <p>Gracias por usar <b>SaludTotal</b>.</p>
        `
      );
    }

    if (nuevoEstado === "cancelado" || nuevoEstado === "rechazado_medico") {
      await enviarCorreo(
        paciente_email,
        "Tu turno fue cancelado",
        `
          <h2>Tu turno fue cancelado</h2>
          <p>Hola ${paciente_nombre || ""},</p>
          <p>Lamentamos informarte que tu turno del:</p>
          <p><strong>${fechaBonita}</strong></p>
          <p>fue cancelado.</p>
        `
      );
    }

    //Aviso si el cambio es a menos de 24hs
    const fechaTurno = new Date(
      typeof fecha === "string" && fecha.includes("T") ? fecha : `${fecha}T${hora}`
    );
    const ahora = new Date();
    const diferenciaHoras = (fechaTurno - ahora) / (1000 * 60 * 60);

    if (diferenciaHoras <= 24 && nuevoEstado !== "cancelado") {
      await enviarCorreo(
        paciente_email,
        "Cambio cercano a la fecha del turno",
        `
          <h2>Cambio importante en tu turno</h2>
          <p>Hubo una modificación en tu turno con menos de 24 horas de anticipación.</p>
          <p><strong>${fechaBonita}</strong></p>
        `
      );
    }

    return res.status(200).json({ msg: "Auditoría procesada correctamente." });
  } catch (error) {
    console.error("Error en auditoría:", error);
    return res.status(500).json({ msg: "Error interno en auditoría." });
  }
}

module.exports = {
  auditarCambioTurno,
};
