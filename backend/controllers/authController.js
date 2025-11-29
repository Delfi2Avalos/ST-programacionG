const db = require("../models/db");
const bcrypt = require("bcrypt");
const { generateJWT } = require("../middleware/jwtMiddleware");
const { rtdb } = require("../middleware/firebase");
const axios = require("axios");

// URL Cloud Function — correo de alta
const URL_CORREO_ALTA =
  "https://us-central1-salud-total-a0d92.cloudfunctions.net/correos-correoAltaUsuario";



// REGISTRO PACIENTE
exports.registro = async (req, res) => {
  const {
    nombre,
    apellido,
    email,
    contrasena,
    tipo,
    obra_social,
    detalles_extras,
  } = req.body;

  if (tipo !== "paciente") {
    return res.status(400).json({
      mensaje: "Solo se puede registrar como paciente desde esta vía.",
    });
  }

  try {
    const emailClean = email.trim().toLowerCase();

    // Verificar si ya existe el correo
    const existe = await new Promise((resolve, reject) => {
      db.query(
        "SELECT id FROM usuarios WHERE email = ?",
        [emailClean],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows.length > 0);
        }
      );
    });

    if (existe) {
      return res.status(400).json({ mensaje: "El correo ya está registrado." });
    }

    // Hashear contraseña
    const hash = await bcrypt.hash(contrasena, 10);

    const sql = `
      INSERT INTO usuarios (nombre, apellido, email, contrasena, tipo, obra_social, detalles_extras)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(
      sql,
      [nombre, apellido, emailClean, hash, tipo, obra_social, detalles_extras],
      async (err, result) => {
        if (err) {
          console.error("Error al registrar usuario:", err);
          return res
            .status(500)
            .json({ mensaje: "Error al registrar usuario." });
        }

        const nuevoId = result.insertId;

        // ENVIAR CORREO DE ALTA VIA CLOUD FUNCTION
        try {
          await axios.post(URL_CORREO_ALTA, {
            nombre,
            email: emailClean,
            tipo: "paciente",
          });
        } catch (errorCorreo) {
          console.error(
            "Error enviando correo de alta (paciente):",
            errorCorreo.message
          );
        }

        // Respuesta exitosa
        res.status(201).json({
          mensaje: "Usuario registrado correctamente.",
          usuario: {
            id: nuevoId,
            nombre,
            apellido,
            email: emailClean,
            tipo,
            obra_social,
          },
        });

        // Registro espejo en Firebase RTDB
        if (rtdb) {
          const refPaciente = rtdb.ref(`usuarios/pacientes/${nuevoId}`);
          refPaciente
            .set({
              id_mysql: nuevoId,
              nombre,
              apellido,
              email: emailClean,
              obra_social: obra_social || null,
              detalles_extras: detalles_extras || null,
              registrado_en: new Date().toISOString(),
            })
            .then(() =>
              console.log(`RTDB: Paciente ${nuevoId} registrado en Firebase`)
            )
            .catch((errFB) =>
              console.warn(
                "Error al sincronizar con Firebase RTDB:",
                errFB.message
              )
            );
        }
      }
    );
  } catch (error) {
    console.error("Error interno:", error);
    res.status(500).json({ mensaje: "Error interno del servidor." });
  }
};


// LOGIN
exports.login = (req, res) => {
  const { email, contrasena } = req.body;
  const emailClean = email.trim().toLowerCase();

  const sql = "SELECT * FROM usuarios WHERE email = ?";
  db.query(sql, [emailClean], async (err, resultados) => {
    if (err) {
      console.error("Error en la base de datos:", err);
      return res.status(500).json({ mensaje: "Error en el servidor." });
    }

    if (resultados.length === 0) {
      return res
        .status(401)
        .json({ mensaje: "Correo o contraseña incorrectos." });
    }

    const usuario = resultados[0];

    const contrasenaValida = await bcrypt.compare(
      contrasena,
      usuario.contrasena
    );

    if (!contrasenaValida) {
      return res
        .status(401)
        .json({ mensaje: "Correo o contraseña incorrectos." });
    }

    const payload = { id: usuario.id, email: usuario.email, tipo: usuario.tipo };
    const token = generateJWT(payload);

    res.status(200).json({
      mensaje: "Login exitoso.",
      token,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        email: usuario.email,
        tipo: usuario.tipo,
        obra_social: usuario.obra_social,
      },
    });

    //Actualizar última conexión RTDB si es paciente
    if (rtdb && usuario.tipo === "paciente") {
      rtdb
        .ref(`usuarios/pacientes/${usuario.id}`)
        .update({
          ultima_conexion: new Date().toISOString(),
        })
        .catch(() => {});
    }
  });
};
