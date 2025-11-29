const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");

// Médicos
router.get("/medicos-por-especialidad/:especialidadId", adminController.listarMedicosPorEspecialidad);

// Turnos
router.get("/turnos", adminController.listarTurnos);
router.put("/actualizar-turno", adminController.actualizarEstadoTurno);
router.put("/cancelar-turno/:id", adminController.cancelarTurno);

// Formularios
router.get("/formularios", adminController.obtenerFormularios);

// Reportes
router.get("/pacientes-atendidos/:medicoId", adminController.contarPacientesAtendidos);

module.exports = router;
