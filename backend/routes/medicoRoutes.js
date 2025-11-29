const express = require('express');
const router = express.Router();
const medicoController = require('../controllers/medicoController');

// Turnos
router.get('/turnos/:medicoId', medicoController.verTurnos);
router.put('/turnos/:turnoId', medicoController.actualizarEstadoTurno);
router.get('/ocupados/:medicoId/:fecha', medicoController.horasOcupadas);

// Horarios
router.get('/horarios/:medicoId', medicoController.obtenerHorariosmedico);
router.put('/actualizar-horarios/:medicoId', medicoController.actualizarHorariosmedico);

//Contraseña
router.put('/cambiar-contrasena/:medicoId', medicoController.cambiarPassword);

// Pacientes
router.get('/buscar-paciente', medicoController.buscarPacientePorNombreCompleto);

// Formularios médicos
router.post('/formulario', medicoController.crearFormularioMedico);
router.put('/formulario/:id', medicoController.editarFormularioMedico);
router.get('/formularios/:id', medicoController.listarFormulariosDelmedico);

// buscar formularios por nombre del paciente
router.get('/formularios-nombre/:nombre', medicoController.buscarFormularioPorNombre);

module.exports = router;