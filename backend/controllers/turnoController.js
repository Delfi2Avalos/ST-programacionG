const db = require('../models/db');

// Listar todos los turnos (uso general o para admin)
exports.listarTodosLosTurnos = (req, res) => {
    const sql = `
        SELECT t.*, u1.nombre AS paciente_nombre, u1.apellido AS paciente_apellido,
               u2.nombre AS medico_nombre, u2.apellido AS medico_apellido,
               e.nombre AS especialidad_nombre
        FROM turnos t
        JOIN usuarios u1 ON t.paciente_id = u1.id
        JOIN usuarios u2 ON t.medico_id = u2.id
        JOIN especialidades e ON t.especialidad_id = e.id
        ORDER BY t.fecha, t.hora
    `;

    db.query(sql, (err, resultados) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ mensaje: 'Error al listar los turnos.' });
        }

        res.status(200).json(resultados);
    });
};

// ============================================================
// ⏰ Obtener horarios ocupados de un médico en una fecha
// ============================================================
exports.obtenerHorariosOcupados = (req, res) => {
  const { medicoId, fecha } = req.params;

  const sql = `
    SELECT hora 
    FROM turnos
    WHERE medico_id = ?
      AND fecha = ?
      AND estado != 'cancelado'
  `;

  db.query(sql, [medicoId, fecha], (err, resultados) => {
    if (err) {
      console.error('❌ Error al obtener horarios ocupados:', err);
      return res.status(500).json({ mensaje: 'Error al obtener horarios.' });
    }

    // resultados = [ { hora: '08:00:00' }, { hora: '09:30:00' } ]
    const horas = resultados.map((r) => r.hora.slice(0, 5)); // '08:00'
    res.status(200).json(horas);
  });
};
