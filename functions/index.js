const functions = require("firebase-functions");
require("dotenv").config();

const correos = require("./src/modules/correos");
const turnos = require("./src/modules/turnos");
const auditoria = require("./src/modules/auditoria");

exports.correos = correos;
exports.turnos = turnos;
exports.auditoria = auditoria;

