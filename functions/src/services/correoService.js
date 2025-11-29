const nodemailer = require("nodemailer");
require("dotenv").config();

// Transporter Gmail
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Correo genérico
exports.enviarCorreoGenerico = async (req, res) => {
  try {
    const { to, subject, message } = req.body;

    await transporter.sendMail({
      from: `"SaludTotal" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text: message,
    });

    return res.json({ msg: "Correo enviado correctamente." });

  } catch (error) {
    console.error("Error enviando correo:", error);
    return res.status(500).json({ msg: "Error enviando correo." });
  }
};

// Correo de Alta de Usuario
exports.correoAltaUsuario = async (req, res) => {
  try {
    const { nombre, email, tipo } = req.body;

    let asunto = "";
    let mensaje = "";

    if (tipo === "paciente") {
      asunto = "¡Bienvenido a SaludTotal!";
      mensaje = `Hola ${nombre || "paciente"}, tu cuenta fue creada.`;
    } else if (tipo === "medico") {
      asunto = "Alta de Médico – SaludTotal";
      mensaje = `Hola Dr. ${nombre || ""}, su cuenta fue habilitada.`;
    }

    await transporter.sendMail({
      from: `"SaludTotal" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: asunto,
      text: mensaje,
    });

    return res.json({ msg: "Correo de alta enviado correctamente." });

  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ msg: "Error enviando correo de alta." });
  }
};
