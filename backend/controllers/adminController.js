const db = require('../models/db');

// Listar médicos por especialidad
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
      return res.status(500).json({ mensaje: 'Error al listar médicos.' });
    }
    res.status(200).json(resultados);
  });
};

//  Contar pacientes atendidos (por rango de fechas)
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
    sql += ' AND fecha BETWEEN ? AND ?';
    params.push(desde, hasta);
  }

  db.query(sql, params, (err, resultados) => {
    if (err) {
      console.error("Error al contar pacientes:", err);
      return res.status(500).json({ mensaje: 'Error al contar pacientes.' });
    }
    res.status(200).json(resultados[0]);
  });
};

//  Obtener formularios (por nombre o email del médico)
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
    sql += ' AND f.nombre_completo LIKE ?';
    params.push(`%${nombre_completo}%`);
  }

  if (medico_email) {
    sql += ' AND u.email LIKE ?';
    params.push(`%${medico_email}%`);
  }

  sql += ' ORDER BY f.fecha DESC';

  db.query(sql, params, (err, resultados) => {
    if (err) {
      console.error("Error al obtener formularios:", err);
      return res.status(500).json({ mensaje: 'Error al obtener formularios.' });
    }
    res.status(200).json(resultados);
  });
};

// 4. listar todos los turnos de pacientes (para gestión secretaria)
exports.listarTurnos = (req, res) => {
  const sql = `
    SELECT 
      t.id, t.fecha, t.hora, t.estado,
      p.nombre AS paciente_nombre, p.apellido AS paciente_apellido,
      m.nombre AS medico_nombre, m.apellido AS medico_apellido,
      e.nombre AS especialidad
    FROM turnos t
    JOIN usuarios p ON t.paciente_id = p.id
    LEFT JOIN usuarios m ON t.medico_id = m.id
    JOIN especialidades e ON t.especialidad_id = e.id
    ORDER BY t.fecha DESC, t.hora ASC
  `;

  db.query(sql, (err, resultados) => {
    if (err) {
      console.error("Error al listar turnos:", err);
      return res.status(500).json({ mensaje: 'Error al listar turnos.' });
    }
    res.status(200).json(resultados);
  });
};

// Actualizar estado del turno
exports.actualizarEstadoTurno = (req, res) => {
  const { turno_id, nuevo_estado } = req.body;

  if (!turno_id || !nuevo_estado) {
    return res.status(400).json({ mensaje: 'Faltan datos para actualizar el turno.' });
  }

  const sql = `UPDATE turnos SET estado = ? WHERE id = ?`;

  db.query(sql, [nuevo_estado, turno_id], (err) => {
    if (err) {
      console.error("Error al actualizar turno:", err);
      return res.status(500).json({ mensaje: 'Error al actualizar turno.' });
    }
    res.status(200).json({ mensaje: 'Estado del turno actualizado correctamente.' });
  });
};

// Cancelar turno desde el panel admin
exports.cancelarTurno = (req, res) => {
  const turnoId = req.params.id;
  if (!turnoId) {
    return res.status(400).json({ mensaje: "ID de turno no proporcionado." });
  }

  const sql = `UPDATE turnos SET estado = 'cancelado' WHERE id = ?`;

  db.query(sql, [turnoId], (err, resultado) => {
    if (err) {
      console.error("Error al cancelar turno:", err);
      return res.status(500).json({ mensaje: "Error al cancelar el turno." });
    }

    if (resultado.affectedRows === 0) {
      return res.status(404).json({ mensaje: "Turno no encontrado." });
    }

    res.status(200).json({ mensaje: "Turno cancelado correctamente." });
  });
};
