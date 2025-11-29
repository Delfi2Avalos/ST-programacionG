const express = require("express");
const chatController = require("../controllers/chatController");

module.exports = (io) => {
  const router = express.Router();
  const { enviarMensaje, obtenerConversacion, obtenerChatsUsuario, asignarAdmin } = chatController(io);

  //rutas de endpoints de chat
router.post("/enviar", enviarMensaje);
router.get("/mensajes/:conversacion_id", obtenerConversacion);
router.get("/usuario/:usuario_id", obtenerChatsUsuario);

  return router;
};
