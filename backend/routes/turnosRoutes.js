const express = require('express');
const router = express.Router();
const turnosController = require('../controllers/turnosController');

router.get('/medicos/ocupados/:medicoId/:fecha', turnosController.obtenerHorariosOcupados);

router.get('/', turnosController.listarTodosLosTurnos);

module.exports = router;
