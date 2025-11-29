const db = require("../models/db");
const bcrypt = require("bcrypt");
const axios = require("axios");
const URL_ESTADO_TURNO =
  "https://us-central1-salud-total-a0d92.cloudfunctions.net/auditoria-auditarTurno";

// 1. SOLICITAR TURNO
exports.solicitarTurno = async (req, res) => {
  const { paciente_id, medico_id, especialidad_id, fecha, hora, detalles } = req.body;

  if (!paciente_id || !medico_id || !especialidad_id || !fecha || !hora) {
    return res.status(400).json({ mensaje: "Faltan campos obligatorios." });
  }

  const horaNormalizada = hora.length === 5 ? `${hora}:00` : hora;

  const verificarSql = `
    SELECT * FROM turnos
    WHERE medico_id = ? AND fecha = ? AND hora = ? AND estado != 'cancelado'
  `;

  db.query(verificarSql, [medico_id, fecha, horaNormalizada], (err, results) => {
    if (err) return res.status(500).json({ mensaje: "Error al verificar disponibilidad." });

    if (results.length > 0) {
      return res.status(409).json({ mensaje: "Ese turno ya está reservado." });
    }

    const insertarSql = `
      INSERT INTO turnos (paciente_id, medico_id, especialidad_id, fecha, hora, detalles, estado, recordatorio_enviado)
      VALUES (?, ?, ?, ?, ?, ?, 'en espera', 0)
    `;

    db.query(
      insertarSql,
      [paciente_id, medico_id, especialidad_id, fecha, horaNormalizada, detalles || ""],
      async (err2) => {
        if (err2) return res.status(500).json({ mensaje: "Error al solicitar el turno." });

        res.status(201).json({ mensaje: "Turno solicitado correctamente." });
      }
    );
  });
};

// 2. OBTENER TURNOS DEL PACIENTE
exports.obtenerTurnosPaciente = (req, res) => {
  const { pacienteId } = req.params;

  const sql = `
    SELECT t.id, t.fecha, t.hora, t.estado, t.detalles,
           t.medico_id, t.especialidad_id, t.recordatorio_enviado,
           u.nombre AS nombre_medico, u.apellido AS apellido_medico,
           e.nombre AS especialidad
    FROM turnos t
    JOIN usuarios u ON t.medico_id = u.id
    JOIN especialidades e ON t.especialidad_id = e.id
    WHERE t.paciente_id = ?
    ORDER BY t.fecha ASC, t.hora ASC
  `;

  db.query(sql, [pacienteId], (err, results) => {
    if (err) return res.status(500).json({ mensaje: "Error al obtener turnos." });

    res.status(200).json(results);
  });
};

// 3. MODIFICAR TURNO (Paciente)
exports.modificarTurno = async (req, res) => {
  const { id } = req.params;
  const { nuevaFecha, nuevaHora } = req.body;

  if (!nuevaFecha || !nuevaHora) {
    return res.status(400).json({ mensaje: "Debe indicar nueva fecha y hora." });
  }

  const verificarSql = `SELECT * FROM turnos WHERE id = ? AND estado = 'en espera'`;

  db.query(verificarSql, [id], (err, turnos) => {
    if (err) return res.status(500).json({ mensaje: "Error interno." });

    if (turnos.length === 0) {
      return res.status(400).json({ mensaje: "Solo se pueden modificar turnos en espera." });
    }

    const turno = turnos[0];

    const conflictoSql = `
      SELECT * FROM turnos
      WHERE medico_id = ? AND fecha = ? AND hora = ? AND estado != 'cancelado' AND id != ?
    `;

    db.query(conflictoSql,
      [turno.medico_id, nuevaFecha, nuevaHora, id],
      (err2, conflict) => {
        if (err2) return res.status(500).json({ mensaje: "Error interno." });
        if (conflict.length > 0) {
          return res.status(409).json({ mensaje: "Ese horario ya está ocupado." });
        }

        const updateSql = `
          UPDATE turnos SET fecha = ?, hora = ?, recordatorio_enviado = 0
          WHERE id = ?
        `;

        db.query(updateSql, [nuevaFecha, nuevaHora, id], async (err3) => {
          if (err3) return res.status(500).json({ mensaje: "Error al actualizar turno." });

          res.status(200).json({ mensaje: "Turno actualizado correctamente." });
        });
      }
    );
  });
};

// 4. CANCELAR TURNO
exports.cancelarTurno = (req, res) => {
  const { id } = req.params;

  db.query("SELECT estado FROM turnos WHERE id = ?", [id], (err, result) => {
    if (err) return res.status(500).json({ mensaje: "Error interno." });
    if (result.length === 0) return res.status(404).json({ mensaje: "Turno no encontrado." });

    if (result[0].estado !== "en espera") {
      return res.status(400).json({ mensaje: "Este turno ya no se puede cancelar." });
    }

    db.query(
      "UPDATE turnos SET estado = 'cancelado' WHERE id = ?",
      [id],
      async () => {
        res.status(200).json({ mensaje: "Turno cancelado correctamente." });
      }
    );
  });
};

// 5. ACTUALIZAR DATOS DEL PACIENTE
exports.actualizarDatosPaciente = async (req, res) => {
  const pacienteId = req.params.id;
  const { obra_social, nueva_contrasena } = req.body;

  const campos = [];
  const valores = [];

  if (obra_social) {
    campos.push("obra_social = ?");
    valores.push(obra_social);
  }

  if (nueva_contrasena) {
    const hashed = await bcrypt.hash(nueva_contrasena, 10);
    campos.push("contrasena = ?");
    valores.push(hashed);
  }

  if (campos.length === 0) {
    return res.status(400).json({ mensaje: "No hay datos para actualizar." });
  }

  valores.push(pacienteId);

  const sql = `UPDATE usuarios SET ${campos.join(", ")} WHERE id = ? AND tipo = 'paciente'`;

  db.query(sql, valores, (err) => {
    if (err) return res.status(500).json({ mensaje: "Error al actualizar datos." });

    res.status(200).json({ mensaje: "Datos actualizados correctamente." });
  });
};

// 6. CAMBIAR CONTRASEÑA
exports.cambiarContrasena = async (req, res) => {
  const pacienteId = req.params.id;
  const { nueva_contrasena } = req.body;

  if (!nueva_contrasena) {
    return res.status(400).json({ mensaje: "Debes ingresar una nueva contraseña." });
  }

  const hashed = await bcrypt.hash(nueva_contrasena, 10);

  db.query(
    "UPDATE usuarios SET contrasena = ? WHERE id = ? AND tipo = 'paciente'",
    [hashed, pacienteId],
    (err) => {
      if (err) return res.status(500).json({ mensaje: "Error al cambiar contraseña." });

      res.status(200).json({ mensaje: "Contraseña actualizada correctamente." });
    }
  );
};

//  7. TURNOS PARA RECORDATORIO (próximas 24h)
exports.turnosParaRecordatorio = (req, res) => {
  const sql = `
    SELECT 
      t.id, t.fecha, t.hora, t.estado, 
      u.email AS paciente_email, 
      u.nombre AS paciente_nombre
    FROM turnos t
    JOIN usuarios u ON t.paciente_id = u.id
    WHERE t.estado = 'confirmado'
      AND t.recordatorio_enviado = 0
      AND TIMESTAMP(t.fecha, t.hora) <= NOW() + INTERVAL 24 HOUR
      AND TIMESTAMP(t.fecha, t.hora) > NOW()
  `;

  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ mensaje: "Error interno." });
    res.status(200).json(results);
  });
};

// 8. MARCAR RECORDATORIO ENVIADO
exports.marcarRecordatorio = (req, res) => {
  const { turnoId } = req.params;

  const sql = `
    UPDATE turnos 
    SET recordatorio_enviado = 1 
    WHERE id = ?
  `;

  db.query(sql, [turnoId], (err) => {
    if (err) return res.status(500).json({ mensaje: "Error al marcar recordatorio." });

    res.status(200).json({ mensaje: "Recordatorio marcado como enviado." });
  });
};
