const db = require("../models/db");
const bcrypt = require("bcrypt");
const axios = require("axios");
const URL_CORREO_ALTA = "https://us-central1-salud-total-a0d92.cloudfunctions.net/correos-correoAltaUsuario";

// 1.listar médicos por especialidad
exports.listarMedicosPorEspecialidad = (req, res) => {
  const especialidadId = req.params.especialidadId;

  const sql = `
    SELECT u.id, u.nombre, u.apellido, u.email
    FROM usuarios u
    JOIN medico_especialidades me ON u.id = me.medico_id
    WHERE me.especialidad_id = ? AND u.tipo = 'medico'
  `;

  db.query(sql, [especialidadId], (err, resultados) => {
    if (err) {
      console.error("Error al listar médicos:", err);
      return res.status(500).json({ mensaje: "Error al listar médicos." });
    }
    res.status(200).json(resultados);
  });
};

// 2.contar pacientes atendidos (filtrando por fecha)
exports.contarPacientesAtendidos = (req, res) => {
  const medicoId = req.params.medicoId;
  const { desde, hasta } = req.query;

  let sql = `
    SELECT COUNT(*) AS cantidad
    FROM turnos
    WHERE medico_id = ? AND estado = 'atendido'
  `;
  const params = [medicoId];

  if (desde && hasta) {
    sql += " AND fecha BETWEEN ? AND ?";
    params.push(desde, hasta);
  }

  db.query(sql, params, (err, resultados) => {
    if (err) {
      console.error("Error al contar pacientes:", err);
      return res
        .status(500)
        .json({ mensaje: "Error al contar pacientes atendidos." });
    }
    res.status(200).json(resultados[0]);
  });
};

// 3.registrar nuevo médico (con hash + especialidades + horarios)


exports.registrarMedico = async (req, res) => {
  try {
    const { nombre, apellido, email, contrasena, especialidades, horarios } = req.body;

    if (!nombre || !apellido || !email || !contrasena) {
      return res.status(400).json({ mensaje: "Faltan campos obligatorios." });
    }

    //hashear contraseña
    const hash = await bcrypt.hash(contrasena, 10);

    const sqlUsuario = `
      INSERT INTO usuarios (nombre, apellido, email, contrasena, tipo)
      VALUES (?, ?, ?, ?, 'medico')
    `;

    db.query(sqlUsuario, [nombre, apellido, email, hash], async (err, resultado) => {
      if (err) {
        console.error("Error al registrar médico:", err);
        return res
          .status(500)
          .json({ mensaje: "Error al registrar médico en usuarios." });
      }

      const medicoId = resultado.insertId;

      //asignar especialidades
      if (Array.isArray(especialidades) && especialidades.length > 0) {
        const sqlEspecialidad = `
          INSERT INTO medico_especialidades (medico_id, especialidad_id)
          VALUES ?
        `;
        const valoresEspecialidad = especialidades.map((id) => [medicoId, id]);

        db.query(sqlEspecialidad, [valoresEspecialidad], (err2) => {
          if (err2)
            console.warn("Error al asignar especialidades:", err2.message);
        });
      }

      //registrar horarios
      if (Array.isArray(horarios) && horarios.length > 0) {
        const sqlHorario = `
          INSERT INTO horarios_medicos (medico_id, dia_semana, hora_inicio, hora_fin)
          VALUES ?
        `;
        const valoresHorarios = horarios.map((h) => [
          medicoId,
          h.dia_semana,
          h.hora_inicio,
          h.hora_fin,
        ]);

        db.query(sqlHorario, [valoresHorarios], (err3) => {
          if (err3)
            console.warn("Error al registrar horarios:", err3.message);
        });
      }

      // AGREGADO — ENVIAR CORREO DE ALTA VIA CLOUD FUNCTION
      try {
        await axios.post(URL_CORREO_ALTA, {
          nombre,
          email,
          tipo: "medico"
        });
      } catch (errorCorreo) {
        console.error("Error enviando correo de alta:", errorCorreo.message);
        // NO hacemos return: el registro igual se considera exitoso
      }

      res.status(201).json({ mensaje: "Médico registrado correctamente." });
    });
  } catch (error) {
    console.error("Error general al registrar médico:", error);
    res.status(500).json({ mensaje: "Error del servidor al registrar médico." });
  }
};

//4.registrar nuevo secretario (rol admin, con hash)
exports.crearSecretario = async (req, res) => {
  try {
    const { nombre, apellido, email, contrasena } = req.body;

    if (!nombre || !apellido || !email || !contrasena) {
      return res.status(400).json({ mensaje: "Faltan campos obligatorios." });
    }

    //hashear contraseña
    const hash = await bcrypt.hash(contrasena, 10);

    const sql = `
      INSERT INTO usuarios (nombre, apellido, email, contrasena, tipo)
      VALUES (?, ?, ?, ?, 'admin')
    `;

    db.query(sql, [nombre, apellido, email, hash], (err) => {
      if (err) {
        console.error("Error al registrar secretario:", err);
        return res
          .status(500)
          .json({ mensaje: "Error al registrar secretario." });
      }
      res.status(201).json({ mensaje: "Secretario creado correctamente." });
    });
  } catch (error) {
    console.error("Error general al crear secretario:", error);
    res.status(500).json({ mensaje: "Error del servidor al crear secretario." });
  }
};

// 5.obtener formularios (por nombre o email del médico)
exports.obtenerFormularios = (req, res) => {
  const { nombre_completo, medico_email } = req.query;

  let sql = `
    SELECT 
      f.id, f.nombre_completo, f.contenido, f.fecha,
      u.nombre AS medico_nombre, u.apellido AS medico_apellido, u.email AS medico_email
    FROM formularios_medicos f
    LEFT JOIN usuarios u ON f.medico_id = u.id
    WHERE 1=1
  `;
  const params = [];

  if (nombre_completo) {
    sql += " AND f.nombre_completo LIKE ?";
    params.push(`%${nombre_completo}%`);
  }

  if (medico_email) {
    sql += " AND u.email LIKE ?";
    params.push(`%${medico_email}%`);
  }

  sql += " ORDER BY f.fecha DESC";

  db.query(sql, params, (err, resultados) => {
    if (err) {
      console.error("Error al obtener formularios:", err);
      return res
        .status(500)
        .json({ mensaje: "Error al obtener formularios." });
    }
    res.status(200).json(resultados);
  });
};
