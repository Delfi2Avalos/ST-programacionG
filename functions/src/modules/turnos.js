const functions = require("firebase-functions");
const axios = require("axios");
const { recordatorioTurno24h } = require("../services/turnosService");

// URL backend
const BACKEND_URL = "http://localhost:3001/paciente";

//Recordatorio cada 30 minutos
exports.recordatorio24h = functions.pubsub
  .schedule("every 30 minutes")
  .timeZone("America/Argentina/Buenos_Aires")
  .onRun(async () => {
    try {
      console.log("Ejecutando recordatorio de turnos…");

      const { data: turnos } = await axios.get(
        `${BACKEND_URL}/turnos/recordatorio`
      );

      if (!turnos || turnos.length === 0) {
        console.log("No hay turnos para recordar.");
        return null;
      }

      console.log(`Turnos encontrados para recordatorio: ${turnos.length}`);

      for (const turno of turnos) {
        await recordatorioTurno24h(turno);
        await axios.patch(`${BACKEND_URL}/turnos/recordatorio/${turno.id}`);
        console.log(`Recordatorio enviado y marcado para turno ID ${turno.id}`);
      }

      return null;

    } catch (err) {
      console.error("Error recordatorio24h:", err.message);
      return null;
    }
  });
