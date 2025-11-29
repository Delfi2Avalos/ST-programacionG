const nodemailer = require("nodemailer");
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

function normalizarFecha(fecha) {
  if (!fecha) return null;
  if (typeof fecha === "string" && fecha.includes("T")) {
    return fecha.split("T")[0];
  }
  return fecha;
}

// FORMATEAR FECHA LINDO
function formatearFechaHora(fecha, hora) {
  const fechaNormalizada = normalizarFecha(fecha);

  let fechaCompleta;

  if (fechaNormalizada) {
    if (hora) {
      fechaCompleta = new Date(`${fechaNormalizada}T${hora}`);
    } else {
      fechaCompleta = new Date(fechaNormalizada);
    }
  } else {
    fechaCompleta = new Date(fecha);
  }

  if (isNaN(fechaCompleta.getTime())) {
    console.warn("Fecha inválida en formatearFechaHora:", { fecha, hora });
    return "Fecha desconocida";
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

  return fechaFormato.charAt(0).toUpperCase() + fechaFormato.slice(1);
}

// RECORDATORIO 24 HORAS ANTES
exports.recordatorioTurno24h = async (turno) => {
  try {
    const { paciente_email, paciente_nombre, fecha, hora } = turno;

    const fechaBonita = formatearFechaHora(fecha, hora);

    const html = `
      <h2>Recordatorio de turno</h2>
      <p>Hola ${paciente_nombre},</p>
      <p>Le recordamos que tiene un turno mañana:</p>
      <p><b>${fechaBonita}</b></p>
      <p>Gracias por usar <b>SaludTotal</b>.</p>
    `;

    await transporter.sendMail({
      from: "SaludTotal <saludtotalapp@gmail.com>",
      to: paciente_email,
      subject: "Recordatorio de turno (24h antes)",
      html,
    });

    return true;

  } catch (err) {
    console.error("Error recordatorio:", err.message);
    return false;
  }
};

//CORREO DE CONFIRMACIÓN / CANCELACIÓN
exports.correoConfirmacionTurno = async ({
  paciente_email,
  paciente_nombre,
  fecha,
  hora,
  nuevoEstado,
}) => {
  try {
    const fechaBonita = formatearFechaHora(fecha, hora);

    const html = `
      <h2>Actualización del estado de su turno</h2>
      <p>Hola ${paciente_nombre},</p>
      <p>Su turno fue actualizado:</p>
      <p><b>${fechaBonita}</b></p>
      <h3>${nuevoEstado.toUpperCase()}</h3>
      <p>Gracias por usar SaludTotal.</p>
    `;

    await transporter.sendMail({
      from: "SaludTotal <saludtotalapp@gmail.com>",
      to: paciente_email,
      subject: "Actualización del estado de su turno",
      html,
    });

    return true;

  } catch (err) {
    console.error("Error correo confirmación:", err.message);
    return false;
  }
};
