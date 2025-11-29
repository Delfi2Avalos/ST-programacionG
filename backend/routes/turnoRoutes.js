const express = require('express');
const router = express.Router();
const turnosController = require('../controllers/turnoController');

// 🕒 Obtener horarios ocupados de un médico en una fecha
router.get('/medicoes/ocupados/:medicoId/:fecha', turnosController.obtenerHorariosOcupados);

// 📋 Listar todos los turnos
router.get('/', turnosController.listarTodosLosTurnos);

module.exports = router;
