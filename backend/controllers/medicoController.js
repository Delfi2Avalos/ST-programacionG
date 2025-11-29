const db = require('../models/db');
const bcrypt = require("bcrypt");
const { rtdb } = require("../middleware/firebase"); //usado en formularios
const axios = require("axios");
const URL_ESTADO_TURNO =
  "https://us-central1-salud-total-a0d92.cloudfunctions.net/auditoria-auditarTurno";

//VER TURNOS ASIGNADOS AL MÉDICO
exports.verTurnos = (req, res) => {
  const medicoId = req.params.medicoId;

  const sql = `
    SELECT 
      t.id, t.fecha, t.hora, t.estado, t.detalles,
      u.nombre AS paciente_nombre, u.apellido AS paciente_apellido, u.obra_social
    FROM turnos t
    JOIN usuarios u ON t.paciente_id = u.id
    WHERE t.medico_id = ?
    ORDER BY t.fecha, t.hora
  `;

  db.query(sql, [medicoId], (err, resultados) => {
    if (err) {
      console.error('Error al obtener turnos:', err);
      return res.status(500).json({ mensaje: 'Error al obtener turnos.' });
    }
    res.status(200).json(resultados);
  });
};

// ACTUALIZAR ESTADO DEL TURNO (VERSIÓN CORRECTA)
exports.actualizarEstadoTurno = async (req, res) => {
  const turnoId = req.params.turnoId;
  const { estado } = req.body;

  const estadosPermitidos = [
    'confirmado',
    'cancelado',
    'atendido',
    'rechazado_medico'
  ];

  if (!estadosPermitidos.includes(estado)) {
    return res.status(400).json({ mensaje: 'Estado inválido.' });
  }

  //Obtener datos del turno (OBLIGATORIO para la Cloud Function)
  const sqlDatos = `
    SELECT 
      t.id, t.fecha, t.hora,
      u.email AS paciente_email,
      u.nombre AS paciente_nombre
    FROM turnos t
    JOIN usuarios u ON t.paciente_id = u.id
    WHERE t.id = ?
  `;

  db.query(sqlDatos, [turnoId], (err, filas) => {
    if (err) {
      console.error("Error obteniendo datos del turno:", err);
      return res.status(500).json({ mensaje: "Error interno." });
    }

    if (filas.length === 0) {
      return res.status(404).json({ mensaje: "Turno no encontrado." });
    }

    const turno = filas[0];

    //Actualizar estado del turno en MySQL
    const sqlUpdate = `
      UPDATE turnos 
      SET estado = ?, fecha_actualizacion_estado = NOW()
      WHERE id = ?
    `;

    db.query(sqlUpdate, [estado, turnoId], async (err2) => {
      if (err2) {
        console.error('Error al actualizar estado del turno:', err2);
        return res.status(500).json({ mensaje: 'Error al actualizar el estado.' });
      }

      // Notificar a Cloud Function (AUDITORIA + CORREOS)
      try {
        await axios.post(URL_ESTADO_TURNO, {
          turnoId,
          nuevoEstado: estado,
          paciente_email: turno.paciente_email,
          paciente_nombre: turno.paciente_nombre,
          fecha: turno.fecha,
          hora: turno.hora
        });

      } catch (errorCF) {
        console.warn("Cloud Function no respondió:", errorCF.message);
      }

      res.status(200).json({
        mensaje: 'Estado del turno actualizado correctamente.'
      });
    });
  });
};

// OBTENER HORARIOS DEL MÉDICO
exports.obtenerHorariosmedico = (req, res) => {
  const medicoId = req.params.medicoId;

  const sql = `
    SELECT dia_semana, hora_inicio, hora_fin
    FROM horarios_medicos
    WHERE medico_id = ?
  `;

  db.query(sql, [medicoId], (err, resultados) => {
    if (err) {
      console.error('Error al obtener horarios:', err);
      return res.status(500).json({ mensaje: 'Error al obtener horarios.' });
    }
    res.status(200).json(resultados);
  });
};

// ACTUALIZAR HORARIOS DEL MÉDICO
exports.actualizarHorariosmedico = (req, res) => {
  const medicoId = req.params.medicoId;
  const nuevosHorarios = req.body.horarios;

  const eliminarSQL = `DELETE FROM horarios_medicos WHERE medico_id = ?`;

  db.query(eliminarSQL, [medicoId], (err) => {
    if (err) {
      console.error('Error al eliminar horarios anteriores:', err);
      return res.status(500).json({ mensaje: 'Error al actualizar los horarios.' });
    }

    if (!nuevosHorarios || nuevosHorarios.length === 0) {
      return res.status(200).json({ mensaje: 'Horarios eliminados correctamente.' });
    }

    const insertarSQL = `
      INSERT INTO horarios_medicos (medico_id, dia_semana, hora_inicio, hora_fin)
      VALUES ?
    `;
    const valores = nuevosHorarios.map(h => [
      medicoId, h.dia_semana, h.hora_inicio, h.hora_fin
    ]);

    db.query(insertarSQL, [valores], (err2) => {
      if (err2) {
        console.error('Error al insertar horarios:', err2);
        return res.status(500).json({ mensaje: 'Error al insertar los horarios.' });
      }
      res.status(200).json({
        mensaje: 'Horarios actualizados correctamente.'
      });
    });
  });
};

//HORAS OCUPADAS EN UN DÍA
exports.horasOcupadas = (req, res) => {
  const { medicoId, fecha } = req.params;

  const sql = `
    SELECT TIME_FORMAT(hora, '%H:%i') AS hora
    FROM turnos
    WHERE medico_id = ? AND fecha = ? AND estado IN ('en espera', 'confirmado')
  `;

  db.query(sql, [medicoId, fecha], (err, resultados) => {
    if (err) {
      console.error('Error al obtener horas ocupadas:', err);
      return res.status(500).json({ mensaje: 'Error al obtener turnos ocupados' });
    }

    const horas = resultados.map(r => r.hora);
    res.json(horas);
  });
};

// CAMBIAR CONTRASEÑA DEL MÉDICO
exports.cambiarPassword = async (req, res) => {
  const medicoId = req.params.medicoId;
  const { nueva_contrasena } = req.body;

  if (!nueva_contrasena) {
    return res.status(400).json({ mensaje: 'Debes ingresar una nueva contraseña.' });
  }

  try {
    const hash = await bcrypt.hash(nueva_contrasena, 10);

    const sql = `
      UPDATE usuarios SET contrasena = ?
      WHERE id = ? AND tipo = 'medico'
    `;

    db.query(sql, [hash, medicoId], (err) => {
      if (err) {
        console.error('Error al cambiar contraseña:', err);
        return res.status(500).json({ mensaje: 'Error al cambiar la contraseña.' });
      }

      return res.status(200).json({
        mensaje: 'Contraseña actualizada correctamente.'
      });
    });

  } catch (e) {
    console.error("Error al encriptar contraseña:", e);
    return res.status(500).json({ mensaje: 'Error interno.' });
  }
};

// BUSCAR PACIENTE POR NOMBRE
exports.buscarPacientePorNombreCompleto = (req, res) => {
  const { nombre, apellido } = req.query;

  if (!nombre || !apellido) {
    return res.status(400).json({ mensaje: 'Nombre y apellido requeridos.' });
  }

  const sql = `
    SELECT id, nombre, apellido, email, obra_social
    FROM usuarios
    WHERE tipo = 'paciente' AND nombre = ? AND apellido = ?
  `;

  db.query(sql, [nombre, apellido], (err, resultados) => {
    if (err) {
      console.error('Error al buscar paciente:', err);
      return res.status(500).json({ mensaje: 'Error al buscar paciente.' });
    }

    if (resultados.length === 0) {
      return res.status(404).json({ mensaje: 'Paciente no encontrado.' });
    }

    res.status(200).json(resultados[0]);
  });
};

// CREAR FORMULARIO MÉDICO + Firebase espejo
exports.crearFormularioMedico = async (req, res) => {
  const { medico_id, nombre_completo, contenido } = req.body;

  if (!medico_id || !nombre_completo || !contenido) {
    return res.status(400).json({ mensaje: 'Todos los campos son obligatorios.' });
  }

  const insertarSQL = `
    INSERT INTO formularios_medicos (medico_id, nombre_completo, contenido)
    VALUES (?, ?, ?)
  `;

  db.query(insertarSQL, [medico_id, nombre_completo.trim(), contenido], async (err, resultado) => {
    if (err) {
      console.error('Error al guardar formulario médico:', err);
      return res.status(500).json({ mensaje: 'Error al guardar el formulario.' });
    }

    const formularioId = resultado.insertId;
    const fecha = new Date().toISOString();

    try {
      const rutaPaciente = `historiales/${nombre_completo.replace(/\s+/g, '_')}`;
      const refHistorial = rtdb.ref(rutaPaciente);
      const nuevoRegistro = refHistorial.push();

      await nuevoRegistro.set({
        formulario_id: formularioId,
        medico_id,
        nombre_completo,
        contenido,
        fecha,
      });

      console.log(`Historial médico guardado en Firebase para ${nombre_completo}`);
    } catch (firebaseError) {
      console.error("Error al guardar historial en Firebase:", firebaseError);
    }

    res.status(201).json({
      mensaje: 'Formulario guardado exitosamente (MySQL + Firebase).'
    });
  });
};

// EDITAR FORMULARIO MÉDICO + Actualizar Firebase
exports.editarFormularioMedico = (req, res) => {
  const formularioId = req.params.id;
  const { contenido, nombre_completo } = req.body;

  if (!contenido) {
    return res.status(400).json({ mensaje: 'El contenido no puede estar vacío.' });
  }

  const sql = `UPDATE formularios_medicos SET contenido = ? WHERE id = ?`;

  db.query(sql, [contenido, formularioId], async (err, resultado) => {
    if (err) {
      console.error('Error al editar formulario:', err);
      return res.status(500).json({ mensaje: 'Error al actualizar el formulario.' });
    }

    if (resultado.affectedRows === 0) {
      return res.status(404).json({ mensaje: 'Formulario no encontrado.' });
    }

    try {
      const refHistorial = rtdb.ref(`historiales/${nombre_completo.replace(/\s+/g, '_')}`);

      await refHistorial.update({
        ultima_actualizacion: new Date().toISOString(),
        ultimo_formulario_editado: formularioId,
        contenido_actualizado: contenido,
      });

      console.log(`Firebase actualizado para ${nombre_completo}`);
    } catch (firebaseError) {
      console.error("Error al actualizar Firebase:", firebaseError);
    }

    res.status(200).json({
      mensaje: 'Formulario actualizado correctamente (MySQL + Firebase).'
    });
  });
};

//LISTAR FORMULARIOS DEL MÉDICO
exports.listarFormulariosDelmedico = (req, res) => {
  const medicoId = req.params.id;

  const sql = `
    SELECT * FROM formularios_medicos
    WHERE medico_id = ?
    ORDER BY fecha DESC
  `;

  db.query(sql, [medicoId], (err, resultados) => {
    if (err) {
      console.error('Error al obtener formularios del medico:', err);
      return res.status(500).json({ mensaje: 'Error al obtener formularios.' });
    }
    res.status(200).json(resultados);
  });
};

//BUSCAR FORMULARIOS POR NOMBRE DE PACIENTE
exports.buscarFormularioPorNombre = (req, res) => {
  const { nombre } = req.params;

  const sql = `
    SELECT * FROM formularios_medicos 
    WHERE nombre_completo LIKE ? 
    ORDER BY fecha DESC;
  `;

  db.query(sql, [`%${nombre}%`], (err, results) => {
    if (err) {
      console.error("Error al buscar formularios por nombre:", err);
      return res.status(500).json({ mensaje: "Error al buscar formularios" });
    }

    if (results.length === 0) {
      return res.status(404).json({ mensaje: "No se encontraron formularios" });
    }

    res.status(200).json(results);
  });
};
