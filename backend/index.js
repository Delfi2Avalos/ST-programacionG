require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const { verifyJWT } = require("./middleware/jwtMiddleware");
const { admin, rtdb } = require("./middleware/firebase");
const app = express();
const server = http.createServer(app);

//cors
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json());

// Configurar Socket.IO
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST", "PUT", "DELETE"] },
});

const JWT_SECRET = process.env.JWT_SECRET || "mi_clave_secreta";

//Autenticación de Sockets con JWT
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;

  if (!token) {
    console.warn("Conexión rechazada: sin token recibido en handshake.");
    return next(new Error("Token requerido"));
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    //Verificamos que el tipo de usuario sea permitido
    if (!["paciente", "admin", "superadmin", "medico"].includes(decoded.tipo)) {
      console.warn(`Tipo de usuario no autorizado: ${decoded.tipo}`);
      return next(new Error("Token no autorizado"));
    }

    socket.user = decoded;

    // Log de diagnóstico
    console.log(" DEBUG TOKEN DECODIFICADO:", decoded);
    console.log(` Socket autenticado: ${decoded.email} (${decoded.tipo})`);

    // Registrar conexión en Firebase RTDB
    if (rtdb) {
      const ref = rtdb.ref(`usuarios/${decoded.id}`);
      ref
        .set({
          id: decoded.id,
          email: decoded.email,
          tipo: decoded.tipo,
          conectado: true,
          socket_id: socket.id,
          ultimaConexion: Date.now(),
        })
        .then(() =>
          console.log(`RTDB: Usuario ${decoded.email} marcado como conectado`)
        )
        .catch((err) =>
          console.warn("Error al registrar conexión en RTDB:", err.message)
        );
    }

    next();
  } catch (err) {
    console.warn("Token inválido en socket:", err.message);
    next(new Error("Token inválido"));
  }
});

//Manejo de conexiones Socket.IO
io.on("connection", (socket) => {
  const { user } = socket;
  if (!user) {
    console.warn("Usuario no autenticado al conectar socket.");
    return;
  }

  console.log(`Usuario conectado: ${user.email} (${user.tipo})`);

  // Unir a su sala personal
  socket.join(`user_${user.id}`);
  console.log(`${user.tipo} ${user.id} unido a sala user_${user.id}`);

  // Unir a sala global de administradores
  if (user.tipo === "admin" || user.tipo === "superadmin") {
    socket.join("admins");
    console.log(`👑 ${user.tipo} ${user.id} unido a sala global "admins"`);
  }

// EVENTOS DE CHAT
   socket.on("enviar_mensaje", (data) => {
    const { conversacionId, emisorId, receptorId, contenido } = data;
    console.log("Mensaje recibido desde cliente:", data);

    // Enviar al receptor directo (si existe)
    if (receptorId) io.to(`user_${receptorId}`).emit("mensaje_recibido", data);

    // Notificar a todos los administradores conectados
    io.to("admins").emit("mensaje_recibido", data);

    // Si es una nueva conversación
    if (!conversacionId) {
      io.to("admins").emit("nueva_conversacion", {
        conversacion_id: conversacionId,
        paciente_id: emisorId,
        ultimo_mensaje: contenido,
      });
    }
  });

  //DESCONEXIÓN
   socket.on("disconnect", () => {
    console.log(`Usuario desconectado: ${user.email}`);

    if (rtdb) {
      rtdb
        .ref(`usuarios/${user.id}`)
        .update({
          conectado: false,
          ultimaConexion: Date.now(),
        })
        .catch(() => {});
    }
  });
});

// Middleware de autenticación de rutas HTTP
app.use((req, res, next) => {
  const rutasPublicas = ["/", "/prueba"];
  if (req.path.startsWith("/api/auth") || rutasPublicas.includes(req.path)) {
    return next();
  }
  verifyJWT(req, res, next);
});

// Rutas API
const chatRoutesFactory = require("./routes/chatRoutes");
app.use("/api/chat", chatRoutesFactory(io));
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/pacientes", require("./routes/pacienteRoutes"));
app.use("/api/medicos", require("./routes/medicoRoutes"));
app.use("/api/turno", require("./routes/turnosRoutes"));
app.use("/api/admin", require("./routes/adminRoutes"));
app.use("/api/superadmin", require("./routes/superadminRoutes"));

// Estado del servidor en Firebase RTDB
process.on("SIGINT", async () => {
  if (rtdb) {
    await rtdb.ref("servidor/estado").set({
      online: false,
      hora: new Date().toISOString(),
    });
    console.log("Servidor marcado como OFFLINE en Firebase");
  }
  process.exit(0);
});

// Iniciar el servidor
const PORT = process.env.PORT || 3001;
server.listen(PORT, "0.0.0.0", () =>
  console.log(`Backend corriendo en http://192.168.1.9:${PORT}`)
);

module.exports = { io };
