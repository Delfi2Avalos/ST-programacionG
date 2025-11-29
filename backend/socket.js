// backend/socket.js
const { Server } = require("socket.io");

let io;
const usuariosConectados = new Map(); // idUsuario -> socket.id

function inicializarSockets(server) {
  io = new Server(server, {
    cors: {
      origin: "*", // Podés restringir a tu dominio o localhost
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log("Cliente conectado:", socket.id);

    // Registrar usuario cuando se conecta
    socket.on("registrarUsuario", (usuarioId, tipo) => {
      if (!usuarioId) return;
      usuariosConectados.set(usuarioId.toString(), socket.id);
      socket.join(usuarioId.toString());
      if (tipo === "admin") socket.join("admins");
      console.log(`Usuario ${usuarioId} (${tipo}) registrado en Socket.IO`);
    });

    // Mensaje enviado desde el cliente
    socket.on("enviar_mensaje", (data) => {
      const { conversacionId, emisorId, receptorId, contenido } = data;
      console.log("Mensaje recibido:", data);

      // Enviar al receptor específico si está conectado
      const receptorSocket = usuariosConectados.get(receptorId?.toString());
      if (receptorSocket) {
        io.to(receptorSocket).emit("mensaje_recibido", data);
      }

      // Enviar también a todos los administradores conectados
      io.to("admins").emit("mensaje_recibido", data);

      // Si es conversación nueva, notificar a los admins
      if (!conversacionId) {
        io.to("admins").emit("nueva_conversacion", {
          conversacion_id: conversacionId,
          paciente_id: emisorId,
          ultimo_mensaje: contenido,
        });
      }
    });

    // Desconexión
    socket.on("disconnect", () => {
      for (const [id, sockId] of usuariosConectados.entries()) {
        if (sockId === socket.id) usuariosConectados.delete(id);
      }
      console.log("Cliente desconectado:", socket.id);
    });
  });

  console.log("Socket.IO inicializado correctamente");
  return io;
}

module.exports = { inicializarSockets, io };
