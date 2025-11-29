const db = require('../models/db');

// 1. Listar todos los turnos
exports.listarTodosLosTurnos = (req, res) => {
  const sql = `
    SELECT 
      t.id, t.fecha, t.hora, t.estado, t.detalles,
      u1.id AS paciente_id, u1.nombre AS paciente_nombre, u1.apellido AS paciente_apellido,
      u2.id AS medico_id, u2.nombre AS medico_nombre, u2.apellido AS medico_apellido,
      e.id AS especialidad_id, e.nombre AS especialidad
    FROM turnos t
    JOIN usuarios u1 ON t.paciente_id = u1.id
    JOIN usuarios u2 ON t.medico_id = u2.id
    JOIN especialidades e ON t.especialidad_id = e.id
    ORDER BY t.fecha ASC, t.hora ASC
  `;

  db.query(sql, (err, resultados) => {
    if (err) {
      console.error("Error al listar los turnos:", err);
      return res.status(500).json({ mensaje: 'Error al listar los turnos.' });
    }

    res.status(200).json(resultados);
  });
};

// 2. Obtener horarios ocupados del médico
exports.obtenerHorariosOcupados = (req, res) => {
  const { medicoId, fecha } = req.params;

  if (!medicoId || !fecha) {
    return res.status(400).json({ mensaje: "Faltan datos: médicoId o fecha." });
  }

  const sql = `
    SELECT TIME_FORMAT(hora, '%H:%i') AS hora
    FROM turnos
    WHERE medico_id = ?
      AND fecha = ?
      AND estado IN ('en espera', 'confirmado')
  `;

  db.query(sql, [medicoId, fecha], (err, resultados) => {
    if (err) {
      console.error("Error al obtener horarios ocupados:", err);
      return res.status(500).json({ mensaje: 'Error al obtener horarios ocupados.' });
    }

    const horas = resultados.map(r => r.hora?.slice(0, 5));
    res.status(200).json(horas);
  });
};
